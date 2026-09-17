import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import axios from 'axios';
import Stripe from 'stripe';
import { fetchSkimsProduct, fetchSkimsCollectionHandles, fetchSkimsStores } from './skims';
import { fetchShopifyCatalog, fetchShopifyProduct } from './shopify';
import { fetchZaraCatalog, fetchZaraProduct } from './zara';
import { SourceProduct, StoreSource, SizeState, SourceKind, sleep } from './types';

admin.initializeApp();
const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

// ── Stripe Payment Intent (unchanged) ──────────────────────────────────────
const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY secret is not set');
    return new Stripe(key, { apiVersion: '2024-12-18.acacia' as any });
};

// ── Orders & payment ───────────────────────────────────────────────────────
// The trust boundary. The app never names a price: it sends product ids,
// sizes and quantities, and the server prices the order from Firestore,
// creates the order document, and opens a Stripe PaymentIntent for that
// amount with capture_method 'manual'. The card is only AUTHORISED at
// checkout. It is CAPTURED when the Snatcher has the item in hand (portal →
// Capture) or RELEASED if the rack was empty (portal → Release), so a
// customer is never charged for something no one has confirmed exists.
//
//   status:        placed → confirmed → in_transit → delivered | cancelled
//   paymentStatus: pending → authorized → paid | released | refunded | failed | abandoned

type Fees = { standardFee: number; priorityFee: number; platformFeePercent: number; taxRate: number };
const round2 = (n: number) => Math.round(n * 100) / 100;

// Same defaults the app falls back to when config/fees is empty.
async function loadFees(): Promise<Fees> {
    const d = (await db.doc('config/fees').get()).data() || {};
    const num = (k: string, dflt: number) => (typeof d[k] === 'number' ? d[k] : dflt);
    return { standardFee: num('standardFee', 6.0), priorityFee: num('priorityFee', 6.99), platformFeePercent: num('platformFeePercent', 0), taxRate: num('taxRate', 0.08875) };
}

async function requireUser(req: any, res: any): Promise<string | null> {
    const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
    try { if (m) return (await admin.auth().verifyIdToken(m[1])).uid; } catch { /* fall through */ }
    res.status(401).json({ error: 'sign in required' });
    return null;
}

async function ownOrder(req: any, res: any, uid: string) {
    const orderId = String(req.body?.orderId || '');
    const snap = orderId ? await db.doc(`orders/${orderId}`).get() : null;
    if (!snap?.exists || snap.get('userId') !== uid) { res.status(404).json({ error: 'order not found' }); return null; }
    return snap;
}

/** Map a PaymentIntent status onto our paymentStatus. */
function paymentStatusFor(pi: Stripe.PaymentIntent): string | null {
    switch (pi.status) {
        case 'requires_capture': return 'authorized';
        case 'succeeded': return 'paid';
        case 'canceled': return 'released';
        default: return null; // requires_payment_method / processing: still pending
    }
}

export const createOrder = onRequest({ cors: true, secrets: ['STRIPE_SECRET_KEY'], timeoutSeconds: 30 }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
    const uid = await requireUser(req, res); if (!uid) return;
    try {
        const { items, deliveryAddress, deliveryOption } = req.body as {
            items: { productId: string; size: string; quantity: number }[]; deliveryAddress: string; deliveryOption: string;
        };
        if (!Array.isArray(items) || !items.length || items.length > 20) { res.status(400).json({ error: 'items required' }); return; }
        if (!deliveryAddress || deliveryAddress.length < 8) { res.status(400).json({ error: 'delivery address required' }); return; }
        const option = deliveryOption === 'Priority' ? 'Priority' : 'Standard';

        // Price every line from OUR product record, never from the request.
        const lines: any[] = [];
        for (const it of items) {
            const qty = Number.isInteger(it.quantity) && it.quantity > 0 && it.quantity <= 10 ? it.quantity : 0;
            const p = qty ? (await db.doc(`products/${String(it.productId)}`).get()) : null;
            if (!p?.exists || p.get('isActive') === false) { res.status(400).json({ error: `${it.productId}: not available` }); return; }
            const size = String(it.size || '');
            const sizes: string[] = p.get('sizes') || [];
            if (sizes.length && !sizes.includes(size)) { res.status(400).json({ error: `${p.get('title')}: size ${size} not offered` }); return; }
            if ((p.get('availability') || {})[size] === 'out_of_stock') { res.status(409).json({ error: `${p.get('title')} in ${size} is sold out` }); return; }
            const store = await db.doc(`stores/${p.get('storeId')}`).get();
            lines.push({
                id: `${p.id}:${size}`, productId: p.id, productTitle: p.get('title'), productBrand: p.get('brand') || '',
                productPrice: Number(p.get('price')) || 0, productImageURL: (p.get('images') || [])[0] || p.get('imageURL') || '',
                storeId: p.get('storeId'), storeName: store.get('name') || 'Snatchd', quantity: qty, selectedSize: size,
            });
        }

        const fees = await loadFees();
        const subtotal = round2(lines.reduce((s, l) => s + l.productPrice * l.quantity, 0));
        const deliveryFee = option === 'Priority' ? fees.priorityFee : fees.standardFee;
        const platformFee = round2(subtotal * fees.platformFeePercent / 100);
        const tax = round2(subtotal * fees.taxRate);
        const total = round2(subtotal + deliveryFee + platformFee + tax);
        if (total < 0.5) { res.status(400).json({ error: 'order total too small' }); return; }

        const ref = db.collection('orders').doc();
        const orderNumber = `SNT-${String(Date.now()).slice(-6)}`;
        await ref.set({
            userId: uid, items: lines, subtotal, deliveryFee, platformFee, tax, total,
            deliveryAddress, deliveryOption: option, orderNumber,
            status: 'placed', paymentStatus: 'pending', trackingStatus: '', driverName: '', driverPhone: '',
            createdAt: now(),
        });

        const pi = await getStripe().paymentIntents.create({
            amount: Math.round(total * 100), currency: 'usd',
            capture_method: 'manual',
            // No redirect methods (Klarna, Affirm, Cash App): they can't hold an
            // authorisation, and a hold is the whole point. Cards, Apple Pay, Link stay.
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            metadata: { orderId: ref.id, orderNumber, userId: uid },
            description: `Snatchd ${orderNumber}`,
        }, { idempotencyKey: `order-${ref.id}` });
        await ref.update({ paymentIntentId: pi.id });

        res.json({ orderId: ref.id, orderNumber, clientSecret: pi.client_secret, subtotal, deliveryFee, platformFee, tax, total });
    } catch (error: any) {
        console.error('❌ createOrder:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/** App calls this after PaymentSheet completes; we ask Stripe, not the app. */
export const paymentAuthorized = onRequest({ cors: true, secrets: ['STRIPE_SECRET_KEY'], timeoutSeconds: 30 }, async (req, res) => {
    const uid = await requireUser(req, res); if (!uid) return;
    const order = await ownOrder(req, res, uid); if (!order) return;
    try {
        const pi = await getStripe().paymentIntents.retrieve(order.get('paymentIntentId'));
        const ps = paymentStatusFor(pi);
        if (ps && order.get('paymentStatus') === 'pending') await order.ref.update({ paymentStatus: ps, authorizedAt: now() });
        res.json({ paymentStatus: ps || order.get('paymentStatus') });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

/** Customer backed out of the payment sheet: drop the pending order. */
export const abandonOrder = onRequest({ cors: true, secrets: ['STRIPE_SECRET_KEY'], timeoutSeconds: 30 }, async (req, res) => {
    const uid = await requireUser(req, res); if (!uid) return;
    const order = await ownOrder(req, res, uid); if (!order) return;
    try {
        if (order.get('paymentStatus') !== 'pending') { res.status(409).json({ error: 'order already in progress' }); return; }
        try { await getStripe().paymentIntents.cancel(order.get('paymentIntentId')); } catch { /* may already be canceled */ }
        await order.ref.update({ paymentStatus: 'abandoned', status: 'cancelled', cancelledAt: now() });
        res.json({ ok: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

/** Snatcher has the item in hand → charge the card. Portal only. */
export const captureOrder = onRequest({ cors: true, secrets: ['STRIPE_SECRET_KEY'], timeoutSeconds: 30 }, async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
        const ref = db.doc(`orders/${String(req.body?.orderId || '')}`);
        const order = await ref.get();
        if (!order.exists) { res.status(404).json({ error: 'order not found' }); return; }
        if (order.get('paymentStatus') !== 'authorized') { res.status(409).json({ error: `cannot capture: payment is ${order.get('paymentStatus')}` }); return; }
        const pi = await getStripe().paymentIntents.capture(order.get('paymentIntentId'));
        await ref.update({ paymentStatus: paymentStatusFor(pi) || 'paid', status: 'confirmed', confirmedAt: now(), trackingStatus: order.get('trackingStatus') || 'shopping' });
        res.json({ ok: true, paymentStatus: pi.status });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

/** Rack was empty, or the order can't be fulfilled → release the hold, or refund if already charged. Portal only. */
export const cancelOrder = onRequest({ cors: true, secrets: ['STRIPE_SECRET_KEY'], timeoutSeconds: 30 }, async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
        const ref = db.doc(`orders/${String(req.body?.orderId || '')}`);
        const order = await ref.get();
        if (!order.exists) { res.status(404).json({ error: 'order not found' }); return; }
        const reason = String(req.body?.reason || '').slice(0, 200);
        const ps = order.get('paymentStatus');
        const stripe = getStripe();
        let next: string;
        if (ps === 'paid') { await stripe.refunds.create({ payment_intent: order.get('paymentIntentId') }); next = 'refunded'; }
        else if (ps === 'authorized' || ps === 'pending') { try { await stripe.paymentIntents.cancel(order.get('paymentIntentId')); } catch { /* already canceled */ } next = 'released'; }
        else { res.status(409).json({ error: `nothing to release: payment is ${ps}` }); return; }
        await ref.update({ paymentStatus: next, status: 'cancelled', cancelReason: reason, cancelledAt: now() });
        res.json({ ok: true, paymentStatus: next });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

/** Stripe → us. Set STRIPE_WEBHOOK_SECRET (firebase functions:secrets:set) after adding the
 *  endpoint in the Stripe dashboard. Until then the reconcile sweep below covers the same ground. */
export const stripeWebhook = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], timeoutSeconds: 30 }, async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || secret === 'unset') { res.status(503).send('STRIPE_WEBHOOK_SECRET not set'); return; }
    let event: Stripe.Event;
    try { event = getStripe().webhooks.constructEvent(req.rawBody, req.get('stripe-signature') || '', secret); }
    catch (e: any) { res.status(400).send(`bad signature: ${e.message}`); return; }
    const obj: any = event.data.object;
    const orderId = obj?.metadata?.orderId;
    if (orderId) {
        const patch: Record<string, any> = {};
        if (event.type === 'payment_intent.amount_capturable_updated') patch.paymentStatus = 'authorized';
        else if (event.type === 'payment_intent.succeeded') patch.paymentStatus = 'paid';
        else if (event.type === 'payment_intent.payment_failed') { patch.paymentStatus = 'failed'; patch.status = 'cancelled'; patch.cancelReason = obj?.last_payment_error?.message || 'payment failed'; }
        else if (event.type === 'payment_intent.canceled') { patch.paymentStatus = 'released'; patch.status = 'cancelled'; }
        if (Object.keys(patch).length) await db.doc(`orders/${orderId}`).set(patch, { merge: true });
    }
    res.json({ received: true });
});

/** Safety net: an app that died between PaymentSheet and paymentAuthorized, or a hold that never
 *  completed. Asks Stripe for the truth on anything still 'pending' or 'authorized'-but-stale. */
export const scheduledPaymentReconcile = onSchedule({ schedule: 'every 10 minutes', secrets: ['STRIPE_SECRET_KEY'], timeoutSeconds: 300 }, async () => {
    const stripe = getStripe();
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);
    const pending = await db.collection('orders').where('paymentStatus', '==', 'pending').where('createdAt', '<', cutoff).get();
    for (const d of pending.docs) {
        try {
            const pi = await stripe.paymentIntents.retrieve(d.get('paymentIntentId'));
            const ps = paymentStatusFor(pi);
            if (ps) await d.ref.update({ paymentStatus: ps, authorizedAt: now() });
            else if (Date.now() - d.get('createdAt').toMillis() > 60 * 60 * 1000) {
                // An hour with no card: the customer walked away.
                try { await stripe.paymentIntents.cancel(pi.id); } catch { /* fine */ }
                await d.ref.update({ paymentStatus: 'abandoned', status: 'cancelled', cancelledAt: now() });
            }
        } catch (e: any) { console.error(`reconcile ${d.id}: ${e.message}`); }
    }
    // Card holds expire after 7 days. Warn well before that on anything still uncaptured.
    const stale = admin.firestore.Timestamp.fromMillis(Date.now() - 48 * 60 * 60 * 1000);
    const held = await db.collection('orders').where('paymentStatus', '==', 'authorized').where('createdAt', '<', stale).get();
    if (held.size) await alert(`${held.size} order(s) have had a card hold for >48h without capture or release: ${held.docs.map(d => d.get('orderNumber')).join(', ')}`);
});

// ── Inventory ──────────────────────────────────────────────────────────────
// A store says where its inventory comes from:
//
//   inventorySource: 'shopify' | 'skims' | 'bergdorf' | 'manual'   (store doc)
//   sourceDomain:     'kith.com'                       (shopify)
//   sourceCollection: 'best-sellers'                   (skims, optional)
//
// Products carry per-size availability that is NEVER collapsed to a boolean
// by a failure: a fetch error writes `unknown`, not `out_of_stock`.
//
//   availability:          { S: 'in_stock', M: 'out_of_stock', L: 'unknown' }
//   availabilitySource:    'shopify' | 'skims' | 'courier' | 'none'
//   availabilityCheckedAt: Timestamp
//
// shopify/skims are ONLINE availability. bergdorf is the retailer's own
// per-store count, delivered by a runner on a Mac (tools/bergdorf-runner) —
// Cloud Functions can't reach bergdorfgoodman.com (DataDome), a real Chrome can.

// Portal-only endpoints: the caller must present a Firebase ID token carrying
// the admin claim (Authorization: Bearer <idToken>). checkAvailability stays public.
async function requireAdmin(req: any, res: any): Promise<boolean> {
    const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
    try {
        const token = m ? await admin.auth().verifyIdToken(m[1]) : null;
        if (token?.admin === true) return true;
    } catch { /* fall through */ }
    res.status(403).json({ error: 'admin only' });
    return false;
}

// The Bergdorf runner authenticates with a shared token from functions/.env.
function requireRunner(req: any, res: any): boolean {
    const expected = process.env.RUNNER_TOKEN;
    if (expected && req.get('x-runner-token') === expected) return true;
    res.status(403).json({ error: 'runner only' });
    return false;
}

const FRESH_MS = 10 * 60 * 1000;
const BATCH = 400; // Firestore hard limit is 500 writes per batch

async function loadStore(storeId: string): Promise<StoreSource> {
    const snap = await db.doc(`stores/${storeId}`).get();
    if (!snap.exists) throw new Error(`store ${storeId} not found`);
    const d = snap.data()!;
    return {
        id: snap.id, name: d.name || '', brand: d.brand || d.name || '',
        inventorySource: (d.inventorySource || 'manual') as SourceKind,
        sourceDomain: d.sourceDomain, sourceCollection: d.sourceCollection,
        sourceStoreId: d.sourceStoreId ? String(d.sourceStoreId) : undefined, sourceQuery: d.sourceQuery,
    };
}

// bergdorf refreshes itself via the Mac runner. zara is metered (parse.bot
// credits, 100 calls/day on the free tier) so it runs on its own cadence.
async function liveStores(kinds: SourceKind[] = ['shopify', 'skims']): Promise<StoreSource[]> {
    const snap = await db.collection('stores').where('inventorySource', 'in', kinds).get();
    return Promise.all(snap.docs.map(d => loadStore(d.id)));
}

// One product from its source — used by checkAvailability and the Skims sweep.
async function fetchOne(store: StoreSource, handle: string): Promise<SourceProduct> {
    switch (store.inventorySource) {
        case 'shopify':
            if (!store.sourceDomain) throw new Error(`${store.name}: sourceDomain missing`);
            return fetchShopifyProduct(store.sourceDomain, store.brand, handle);
        case 'skims':
            return fetchSkimsProduct(handle);
        case 'zara':
            if (!store.sourceStoreId) throw new Error(`${store.name}: sourceStoreId missing (SoHo is 3862)`);
            return fetchZaraProduct(handle, store.brand, store.sourceStoreId);
        default:
            throw new Error(`${store.name} has no live source`);
    }
}

// The whole catalog — Shopify gives it in bulk; Skims needs a handle list then one call each.
async function fetchCatalog(store: StoreSource, limit: number): Promise<{ products: SourceProduct[]; failed: string[] }> {
    if (store.inventorySource === 'shopify') {
        if (!store.sourceDomain) throw new Error(`${store.name}: sourceDomain missing`);
        return { products: await fetchShopifyCatalog(store.sourceDomain, store.brand, limit), failed: [] };
    }
    if (store.inventorySource === 'zara') {
        const queries = (store.sourceQuery || 'blazer, jeans, dress, coat, knit, shirt, trousers, skirt').split(',').map(q => q.trim()).filter(Boolean);
        return { products: await fetchZaraCatalog(queries, store.brand, limit), failed: [] };
    }
    if (store.inventorySource === 'skims') {
        const handles = (await fetchSkimsCollectionHandles(store.sourceCollection || 'best-sellers')).slice(0, limit);
        const products: SourceProduct[] = []; const failed: string[] = [];
        for (const h of handles) {
            try { products.push(await fetchSkimsProduct(h)); } catch { failed.push(h); }
            await sleep(150);
        }
        return { products, failed };
    }
    throw new Error(`${store.name} has no live source`);
}

/** What we compare to decide whether a write is needed at all. */
function fingerprint(p: SourceProduct, availability: Record<string, SizeState>) {
    return [p.title, p.price, p.images.length, p.sizes.join('|'),
        Object.entries(availability).sort().map(([k, v]) => `${k}:${v}`).join(',')].join('~');
}

function patchFor(p: SourceProduct, source: SourceKind) {
    const availability = (source === 'bergdorf' || source === 'zara') && p.storeAvailability ? p.storeAvailability : p.availability;
    const states = Object.values(availability);
    // No per-size data yet (a listing-only catalog row) is UNKNOWN, not sold out.
    // Claiming out-of-stock from an empty set is the one mistake this whole
    // model exists to prevent: it hides real products and reads as "sold out".
    const unchecked = states.length === 0;
    const inStock = unchecked ? true : states.some(s => s === 'in_stock');
    return {
        title: p.title, handle: p.handle, externalId: p.externalId, productUrl: p.productUrl,
        price: p.price, compareAtPrice: p.compareAtPrice,
        description: p.description, images: p.images, sizes: p.sizes, styles: p.styles,
        category: p.category, gender: p.gender, productType: p.productType, tags: p.tags,
        variants: p.variants,
        availability, availabilitySource: unchecked ? 'none' : source,
        availabilityCheckedAt: now(), inStock, fingerprint: fingerprint(p, availability),
        updatedAt: now(),
    };
}

const unknownPatch = (sizes: string[]) => ({
    availability: Object.fromEntries(sizes.map(s => [s, 'unknown' as SizeState])),
    availabilitySource: 'none',
    availabilityCheckedAt: now(),
});

async function commitChunked(writes: Array<{ ref: FirebaseFirestore.DocumentReference; data: any; merge: boolean }>) {
    for (let i = 0; i < writes.length; i += BATCH) {
        const batch = db.batch();
        for (const w of writes.slice(i, i + BATCH)) batch.set(w.ref, w.data, { merge: w.merge });
        await batch.commit();
    }
}

// Slack/Discord webhook from functions/.env → ALERT_WEBHOOK_URL. Kept out of
// Firestore on purpose: config/* is publicly readable by rule.
async function alert(message: string) {
    console.error('🚨', message);
    const url = process.env.ALERT_WEBHOOK_URL;
    if (!url) return;
    try { await axios.post(url, { text: message, content: message }, { timeout: 5000 }); }
    catch (e: any) { console.error('alert webhook failed:', e.message); }
}

async function setSourceHealth(storeId: string, healthy: boolean, detail: string) {
    await db.doc('config/inventory').set({ [storeId]: { healthy, detail, at: now() } }, { merge: true });
}

/**
 * POST /syncStoreCatalog  { storeId, limit?, replaceLegacy? }
 * Pull the store's catalog from its source and upsert products/{source}_{externalId}_{storeId}.
 * With replaceLegacy, older docs for a product just synced (CSV/seed ids) are removed.
 */
export const syncStoreCatalog = onRequest({ cors: true, timeoutSeconds: 540, memory: '512MiB' }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    // Admin (portal) or the runner may trigger a sync — both are trusted to
    // read a brand's public catalog and write it to our own store.
    const expected = process.env.RUNNER_TOKEN;
    const viaRunner = !!expected && req.get('x-runner-token') === expected;
    if (!viaRunner && !(await requireAdmin(req, res))) return;
    try {
        const { storeId, limit, replaceLegacy = false } = req.body || {};
        if (!storeId) { res.status(400).json({ error: 'Missing storeId' }); return; }
        const store = await loadStore(storeId);
        const { products, failed } = await fetchCatalog(store, limit ? Number(limit) : Infinity);
        const source = store.inventorySource;

        const existing = await db.collection('products').where('storeId', '==', storeId).get();
        const prints = new Map(existing.docs.map(d => [d.id, d.get('fingerprint')]));
        const writes: Parameters<typeof commitChunked>[0] = [];
        let added = 0, unchanged = 0;
        for (const p of products) {
            const id = `${source}_${p.externalId}_${storeId}`;
            const data: any = { ...patchFor(p, source), brand: p.brand || store.brand, storeId, deliveryTime: '45 Mins' };
            const known = prints.has(id);
            if (known && prints.get(id) === data.fingerprint) { unchanged++; continue; }
            if (!known) {
                // New arrivals stay hidden until the operator carries them
                data.createdAt = now();
                data.isActive = false;
                added++;
            }
            writes.push({ ref: db.doc(`products/${id}`), data, merge: true });
        }
        await commitChunked(writes);

        let removed = 0;
        if (replaceLegacy) {
            const synced = new Set(products.map(p => p.handle));
            const handleOf = (d: FirebaseFirestore.QueryDocumentSnapshot) =>
                d.get('handle') || (d.get('productUrl') || '').split('/products/')[1] || '';
            const legacy = existing.docs.filter(d => !d.id.startsWith(`${source}_`) && synced.has(handleOf(d)));
            for (let i = 0; i < legacy.length; i += BATCH) {
                const batch = db.batch();
                for (const d of legacy.slice(i, i + BATCH)) batch.delete(d.ref);
                await batch.commit();
            }
            removed = legacy.length;
        }
        await setSourceHealth(storeId, failed.length < Math.max(1, products.length) / 2, `catalog ${products.length}, ${added} new`);
        res.json({ storeId, source, catalog: products.length, written: writes.length, added, unchanged, failed, removed });
    } catch (error: any) {
        await alert(`syncStoreCatalog failed: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Refresh availability for every product of every store with a live source.
// Shopify: one bulk catalog read per store. Skims: one call per product.
// Five consecutive failures on a store trips its breaker: the rest of that
// store is marked `unknown`, an alert fires, and config/inventory flags it.
// ponytail: stores run one after another, ~1s/product for Skims → keep total
// under ~450 Skims products or run stores in parallel.
async function refreshAllStock(kinds?: SourceKind[]): Promise<Record<string, { updated: number; unknown: number; tripped: boolean }>> {
    const report: Record<string, { updated: number; unknown: number; tripped: boolean }> = {};
    for (const store of await liveStores(kinds)) {
        // Metered sources only refresh what customers can actually see
        const base = db.collection('products').where('storeId', '==', store.id);
        const snap = store.inventorySource === 'zara' ? await base.where('isActive', '==', true).get() : await base.get();
        const writes: Parameters<typeof commitChunked>[0] = [];
        let updated = 0, unknown = 0, tripped = false;

        if (store.inventorySource === 'shopify') {
            try {
                const byHandle = new Map((await fetchShopifyCatalog(store.sourceDomain!, store.brand)).map(p => [p.handle, p]));
                for (const doc of snap.docs) {
                    const p = byHandle.get(doc.get('handle'));
                    if (p) {
                        const data = patchFor(p, 'shopify');
                        if (doc.get('fingerprint') === data.fingerprint) continue; // nothing changed
                        writes.push({ ref: doc.ref, data, merge: true }); updated++;
                    } else {
                        // Gone from the brand's catalogue — unknown, never "sold out"
                        writes.push({ ref: doc.ref, data: unknownPatch(doc.get('sizes') || []), merge: true }); unknown++;
                    }
                }
            } catch (e: any) {
                tripped = true; unknown = snap.size;
                for (const doc of snap.docs) writes.push({ ref: doc.ref, data: unknownPatch(doc.get('sizes') || []), merge: true });
                await alert(`${store.name} (${store.sourceDomain}) catalog unreachable: ${e.message}. Products marked unknown.`);
            }
        } else {
            let failures = 0;
            for (const doc of snap.docs) {
                const handle: string | undefined = doc.get('handle') || (doc.get('productUrl') || '').split('/products/')[1];
                const sizes: string[] = doc.get('sizes') || [];
                if (tripped || !handle) { writes.push({ ref: doc.ref, data: unknownPatch(sizes), merge: true }); unknown++; continue; }
                try {
                    writes.push({ ref: doc.ref, data: patchFor(await fetchOne(store, handle), store.inventorySource), merge: true });
                    updated++; failures = 0;
                } catch (e: any) {
                    failures++; unknown++;
                    writes.push({ ref: doc.ref, data: unknownPatch(sizes), merge: true });
                    if (failures >= 5) { tripped = true; await alert(`${store.name} breaker tripped after 5 consecutive failures (last: ${e.message}).`); }
                }
                await sleep(150);
            }
        }
        await commitChunked(writes);
        await setSourceHealth(store.id, !tripped, `refreshed ${updated}, unknown ${unknown}`);
        report[store.id] = { updated, unknown, tripped };
        console.log(`✅ ${store.name}: updated ${updated}, unknown ${unknown}, tripped ${tripped}`);
    }
    return report;
}

export const refreshStock = onRequest({ cors: true, timeoutSeconds: 540, memory: '512MiB' }, async (req, res) => {
    // Admin (portal) or the runner — same trust as syncStoreCatalog.
    const viaRunner = !!process.env.RUNNER_TOKEN && req.get('x-runner-token') === process.env.RUNNER_TOKEN;
    if (!viaRunner && !(await requireAdmin(req, res))) return;
    try { res.json({ success: true, stores: await refreshAllStock(['shopify', 'skims', 'zara']) }); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

export const scheduledStock = onSchedule({ schedule: 'every 30 minutes', timeoutSeconds: 540, memory: '512MiB' }, async () => {
    try { await refreshAllStock(); }
    catch (error: any) { await alert(`scheduledStock crashed: ${error.message}`); }
});

/**
 * POST /checkAvailability { productId }
 * What the app calls on the product page. Per-size state plus the store the
 * Snatcher walks into. Refreshes live from the store's source if stale.
 */
export const checkAvailability = onRequest({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    try {
        const { productId } = req.body || {};
        if (!productId) { res.status(400).json({ error: 'Missing productId' }); return; }
        const ref = db.doc(`products/${productId}`);
        const snap = await ref.get();
        if (!snap.exists) { res.status(404).json({ error: 'Product not found' }); return; }
        let d = snap.data()!;
        const storeSnap = d.storeId ? await db.doc(`stores/${d.storeId}`).get() : null;
        const storeData = storeSnap?.data();
        const source = (storeData?.inventorySource || 'manual') as SourceKind;

        const checkedAt: FirebaseFirestore.Timestamp | undefined = d.availabilityCheckedAt;
        const stale = !checkedAt || Date.now() - checkedAt.toMillis() > FRESH_MS;
        const handle = d.handle || (d.productUrl || '').split('/products/')[1];
        if (source === 'bergdorf' && stale) {
            // Ask the Mac runner for a live Find-In-Store answer; wait up to 6s for it.
            const before = checkedAt?.toMillis() ?? 0;
            await db.doc(`availabilityRequests/${productId}`).set({ productId, storeId: d.storeId, requestedAt: now() }, { merge: true });
            for (let i = 0; i < 12; i++) {
                await sleep(500);
                const fresh = (await ref.get()).data()!;
                const at: FirebaseFirestore.Timestamp | undefined = fresh.availabilityCheckedAt;
                if (at && at.toMillis() > before) { d = fresh; break; }
            }
        } else if (source !== 'manual' && handle && stale && storeSnap) {
            try {
                const store = await loadStore(storeSnap.id);
                const patch = patchFor(await fetchOne(store, handle), source);
                await ref.set(patch, { merge: true });
                d = { ...d, ...patch, availabilityCheckedAt: admin.firestore.Timestamp.now() };
            } catch (e: any) { console.warn(`live refresh failed for ${productId}: ${e.message}`); }
        }

        const sizes: string[] = d.sizes || [];
        const availability: Record<string, SizeState> = Object.fromEntries(sizes.map(s => [s, 'unknown' as SizeState]));
        for (const [k, v] of Object.entries(d.availability || {})) availability[k] = v as SizeState;
        const states = Object.values(availability);
        const state: SizeState = states.some(s => s === 'in_stock') ? 'in_stock'
            : states.length && states.every(s => s === 'out_of_stock') ? 'out_of_stock' : 'unknown';

        res.json({
            productId, state, sizes: availability,
            source: d.availabilitySource || 'none',
            checkedAt: d.availabilityCheckedAt?.toDate?.().toISOString() ?? null,
            store: storeData ? { id: d.storeId, name: storeData.name, address: storeData.address ?? null } : null,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/** POST /syncStoreLocations — refresh the Skims store's address/phone from their locator. */
export const syncSkimsStoreLocation = onRequest({ cors: true, timeoutSeconds: 60 }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    if (!(await requireAdmin(req, res))) return;
    try {
        const { storeId } = req.body || {};
        if (!storeId) { res.status(400).json({ error: 'Missing storeId' }); return; }
        const flagship = (await fetchSkimsStores()).find(s => s.isOwnStore && /New York, NY/i.test(s.address));
        if (!flagship) { res.status(404).json({ error: 'no SKIMS-own NYC store on Stockist' }); return; }
        await db.doc(`stores/${storeId}`).set({ address: flagship.address, latitude: flagship.latitude, longitude: flagship.longitude, phone: flagship.phone, externalId: flagship.externalId }, { merge: true });
        res.json({ ok: true, ...flagship });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ── Bergdorf runner endpoints ──────────────────────────────────────────────

/**
 * POST /ingestInventory  { storeId, source: 'bergdorf', products: SourceProduct[], mode: 'catalog' | 'refresh' }
 * catalog: upsert everything (new products hidden until the operator shows them).
 * refresh: update availability/prices for products already present; clears any live-check requests answered.
 */
export const ingestInventory = onRequest({ cors: false, timeoutSeconds: 300, memory: '512MiB' }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    if (!requireRunner(req, res)) return;
    try {
        const { storeId, source = 'bergdorf', products = [], mode = 'refresh' } = req.body || {};
        if (!storeId || !Array.isArray(products)) { res.status(400).json({ error: 'storeId and products[] required' }); return; }
        const store = await loadStore(storeId);
        const existing = await db.collection('products').where('storeId', '==', storeId).get();
        const existingIds = new Set(existing.docs.map(d => d.id));
        const writes: Parameters<typeof commitChunked>[0] = [];
        const answered: string[] = [];
        for (const p of products as SourceProduct[]) {
            const id = `${source}_${p.externalId}_${storeId}`;
            const data: any = { ...patchFor(p, source as SourceKind), brand: p.brand || store.brand, storeId, deliveryTime: '45 Mins' };
            if (!existingIds.has(id)) { data.createdAt = now(); data.isActive = mode === 'catalog' ? false : true; }
            writes.push({ ref: db.doc(`products/${id}`), data, merge: true });
            answered.push(id);
        }
        await commitChunked(writes);
        // Live-check requests for these products are now satisfied.
        const reqs = await db.collection('availabilityRequests').where('storeId', '==', storeId).get();
        const batch = db.batch(); let cleared = 0;
        for (const r of reqs.docs) if (answered.includes(r.id)) { batch.delete(r.ref); cleared++; }
        if (cleared) await batch.commit();
        await setSourceHealth(storeId, true, `${mode}: ${products.length} products`);
        res.json({ ok: true, written: writes.length, cleared });
    } catch (error: any) {
        await alert(`ingestInventory failed: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /pendingChecks?storeId=…&wait=25
 * Long-poll: returns queued live-check requests for the runner as soon as any exist.
 */
export const pendingChecks = onRequest({ cors: false, timeoutSeconds: 60 }, async (req, res) => {
    if (!requireRunner(req, res)) return;
    const storeId = String(req.query.storeId || '');
    const wait = Math.min(Number(req.query.wait) || 25, 50) * 1000;
    if (!storeId) { res.status(400).json({ error: 'storeId required' }); return; }
    // all=1 → every product shown in the app for this store (the scheduled refresh), no waiting.
    // unsized=1 → only those with no sizes yet: a listing row that still needs its product page read.
    if (req.query.all) {
        // hidden=1 → include products not yet shown in the app, for operator-driven
        // catalog enrichment (so sizes are visible while curating).
        const base = db.collection('products').where('storeId', '==', storeId);
        const snap = req.query.hidden ? await base.get() : await base.where('isActive', '==', true).get();
        let docs = snap.docs;
        if (req.query.unsized) docs = docs.filter(d => !(d.get('sizes') || []).length);
        res.json({ requests: docs.map(d => ({ productId: d.id, externalId: d.get('externalId'), handle: d.get('handle'), productUrl: d.get('productUrl'), sizes: d.get('sizes') || [], variants: d.get('variants') || [] })) });
        return;
    }
    const q = db.collection('availabilityRequests').where('storeId', '==', storeId);
    const items = await new Promise<any[]>(resolve => {
        let done = false;
        const finish = (docs: any[]) => { if (!done) { done = true; unsub(); clearTimeout(t); resolve(docs); } };
        const unsub = q.onSnapshot(snap => { if (!snap.empty) finish(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }, () => finish([]));
        const t = setTimeout(() => finish([]), wait);
    });
    // Runner needs the product handles to open the right pages
    const out = await Promise.all(items.map(async r => {
        const p = (await db.doc(`products/${r.productId}`).get()).data() || {};
        return { productId: r.productId, externalId: p.externalId, handle: p.handle, productUrl: p.productUrl, sizes: p.sizes || [], variants: p.variants || [] };
    }));
    res.json({ requests: out });
});

/**
 * Daily: pull each live store's full catalogue so new arrivals appear.
 * New products land hidden; availability for what we carry is refreshed
 * separately every 30 minutes by scheduledStock.
 */
async function syncAllCatalogs(): Promise<Record<string, any>> {
    const report: Record<string, any> = {};
    for (const store of await liveStores(['shopify', 'skims', 'zara'])) {
        try {
            const { products } = await fetchCatalog(store, Infinity);
            const existing = await db.collection('products').where('storeId', '==', store.id).get();
            const prints = new Map(existing.docs.map(d => [d.id, d.get('fingerprint')]));
            const writes: Parameters<typeof commitChunked>[0] = [];
            let added = 0;
            for (const p of products) {
                const id = `${store.inventorySource}_${p.externalId}_${store.id}`;
                const data: any = { ...patchFor(p, store.inventorySource), brand: p.brand || store.brand, storeId: store.id, deliveryTime: '45 Mins' };
                if (prints.has(id)) { if (prints.get(id) === data.fingerprint) continue; }
                else { data.createdAt = now(); data.isActive = false; added++; }
                writes.push({ ref: db.doc(`products/${id}`), data, merge: true });
            }
            await commitChunked(writes);
            report[store.id] = { catalog: products.length, written: writes.length, added };
            console.log(`✅ ${store.name}: catalogue ${products.length}, ${added} new`);
        } catch (e: any) {
            report[store.id] = { error: e.message };
            await alert(`daily catalogue sync failed for ${store.name}: ${e.message}`);
        }
    }
    return report;
}

export const syncCatalogs = onRequest({ cors: true, timeoutSeconds: 540, memory: '1GiB' }, async (req, res) => {
    const expected = process.env.RUNNER_TOKEN;
    if (!(expected && req.get('x-runner-token') === expected) && !(await requireAdmin(req, res))) return;
    try { res.json({ ok: true, stores: await syncAllCatalogs() }); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

export const scheduledCatalogSync = onSchedule({ schedule: 'every day 04:00', timeZone: 'America/New_York', timeoutSeconds: 540, memory: '1GiB' }, async () => {
    try { await syncAllCatalogs(); }
    catch (error: any) { await alert(`scheduledCatalogSync crashed: ${error.message}`); }
});

/** Zara: twice a day, shown products only — two parse.bot calls per product. */
export const scheduledZaraStock = onSchedule({ schedule: '30 10,15 * * *', timeZone: 'America/New_York', timeoutSeconds: 540, memory: '512MiB' }, async () => {
    try { await refreshAllStock(['zara']); }
    catch (error: any) { await alert(`scheduledZaraStock crashed: ${error.message}`); }
});
