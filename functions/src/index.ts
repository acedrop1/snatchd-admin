import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import axios from 'axios';
import Stripe from 'stripe';
import { fetchSkimsProduct, fetchSkimsCollectionHandles, fetchSkimsStores } from './skims';
import { fetchShopifyCatalog, fetchShopifyProduct } from './shopify';
import { SourceProduct, StoreSource, SizeState, SourceKind, sleep } from './types';

admin.initializeApp();
const db = admin.firestore();
const now = () => admin.firestore.FieldValue.serverTimestamp();

// ── Stripe Payment Intent (unchanged) ──────────────────────────────────────
const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY || '';
    if (!key) console.warn('⚠️ STRIPE_SECRET_KEY is not set — payments will fail');
    return new Stripe(key, { apiVersion: '2024-12-18.acacia' as any });
};

export const createPaymentIntent = onRequest({
    cors: true, secrets: ['STRIPE_SECRET_KEY'], invoker: 'public', timeoutSeconds: 30,
}, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    try {
        const { amount, orderId, currency = 'usd' } = req.body as { amount: number; orderId: string; currency?: string };
        if (!amount || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }
        const paymentIntent = await getStripe().paymentIntents.create({
            amount: Math.round(amount * 100), currency,
            automatic_payment_methods: { enabled: true },
            metadata: { orderId: orderId || 'unknown' },
        });
        res.status(200).json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (error: any) {
        console.error('❌ Stripe error:', error.message);
        res.status(500).json({ error: error.message });
    }
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
    };
}

async function liveStores(): Promise<StoreSource[]> {
    const snap = await db.collection('stores').where('inventorySource', 'in', ['shopify', 'skims']).get(); // bergdorf refreshes itself via the runner
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

function patchFor(p: SourceProduct, source: SourceKind) {
    const availability = source === 'bergdorf' && p.storeAvailability ? p.storeAvailability : p.availability;
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
        availabilityCheckedAt: now(), inStock,
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
    if (!(await requireAdmin(req, res))) return;
    try {
        const { storeId, limit = 250, replaceLegacy = true } = req.body || {};
        if (!storeId) { res.status(400).json({ error: 'Missing storeId' }); return; }
        const store = await loadStore(storeId);
        const { products, failed } = await fetchCatalog(store, Math.min(Number(limit), 1000));
        const source = store.inventorySource;

        const existing = await db.collection('products').where('storeId', '==', storeId).get();
        const existingIds = new Set(existing.docs.map(d => d.id));
        const writes: Parameters<typeof commitChunked>[0] = products.map(p => {
            const id = `${source}_${p.externalId}_${storeId}`;
            const data: any = { ...patchFor(p, source), brand: store.brand, storeId, deliveryTime: '45 Mins', isActive: true };
            if (!existingIds.has(id)) data.createdAt = now();
            return { ref: db.doc(`products/${id}`), data, merge: true };
        });
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
        await setSourceHealth(storeId, failed.length < Math.max(1, products.length) / 2, `synced ${products.length}`);
        res.json({ storeId, source, synced: products.length, failed, removed });
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
async function refreshAllStock(): Promise<Record<string, { updated: number; unknown: number; tripped: boolean }>> {
    const report: Record<string, { updated: number; unknown: number; tripped: boolean }> = {};
    for (const store of await liveStores()) {
        const snap = await db.collection('products').where('storeId', '==', store.id).get();
        const writes: Parameters<typeof commitChunked>[0] = [];
        let updated = 0, unknown = 0, tripped = false;

        if (store.inventorySource === 'shopify') {
            try {
                const byHandle = new Map((await fetchShopifyCatalog(store.sourceDomain!, store.brand, 1000)).map(p => [p.handle, p]));
                for (const doc of snap.docs) {
                    const p = byHandle.get(doc.get('handle'));
                    if (p) { writes.push({ ref: doc.ref, data: patchFor(p, 'shopify'), merge: true }); updated++; }
                    else { writes.push({ ref: doc.ref, data: unknownPatch(doc.get('sizes') || []), merge: true }); unknown++; }
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
    if (!(await requireAdmin(req, res))) return;
    try { res.json({ success: true, stores: await refreshAllStock() }); }
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
    // all=1 → every product shown in the app for this store (the scheduled refresh), no waiting
    if (req.query.all) {
        const shown = await db.collection('products').where('storeId', '==', storeId).where('isActive', '==', true).get();
        res.json({ requests: shown.docs.map(d => ({ productId: d.id, externalId: d.get('externalId'), handle: d.get('handle'), productUrl: d.get('productUrl'), sizes: d.get('sizes') || [], variants: d.get('variants') || [] })) });
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
