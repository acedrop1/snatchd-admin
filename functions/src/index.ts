import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import axios from 'axios';
import Stripe from 'stripe';
import {
    fetchSkimsProduct, fetchSkimsCollectionHandles, fetchSkimsStores,
    sleep, SizeState, SkimsProduct,
} from './skims';

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
// Product docs carry three availability fields. `availability` is per size and
// is NEVER collapsed to a boolean by a failure: a fetch error writes `unknown`,
// not `out_of_stock`. `inStock` (legacy bool the app reads) only changes when
// we actually have data.
//
//   availability:          { S: 'in_stock', M: 'out_of_stock', L: 'unknown' }
//   availabilitySource:    'skims_online' | 'courier' | 'none'
//   availabilityCheckedAt: Timestamp
//
// Brands without a live source get `none` and the app tells the customer a
// Snatcher confirms in store before capture.

type Source = 'skims_online' | 'courier' | 'none';
const FRESH_MS = 10 * 60 * 1000;
const BATCH = 400; // Firestore hard limit is 500 writes per batch

function skimsPatch(p: SkimsProduct) {
    const inStock = Object.values(p.availability).some(s => s === 'in_stock');
    return {
        title: p.title, handle: p.handle, externalId: p.externalId, productUrl: p.productUrl,
        price: p.price, compareAtPrice: p.compareAtPrice,
        description: p.description, images: p.images, sizes: p.sizes, styles: p.styles,
        category: p.category, gender: p.gender, productType: p.productType, tags: p.tags,
        variants: p.variants,
        availability: p.availability, availabilitySource: 'skims_online' as Source,
        availabilityCheckedAt: now(), inStock,
        updatedAt: now(),
    };
}

const unknownPatch = (sizes: string[]) => ({
    availability: Object.fromEntries(sizes.map(s => [s, 'unknown' as SizeState])),
    availabilitySource: 'none' as Source,
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

async function setSourceHealth(source: string, healthy: boolean, detail: string) {
    await db.doc('config/inventory').set({ [source]: { healthy, detail, at: now() } }, { merge: true });
}

// The Skims store doc. Real location from Stockist; matched to an existing
// store named "Skims" so the portal's manually-created doc keeps its ID.
async function ensureSkimsStore(preferredStoreId?: string): Promise<string> {
    if (preferredStoreId) return preferredStoreId;
    const existing = await db.collection('stores').get();
    const match = existing.docs.find(d => /skims/i.test(d.get('name') || ''));
    if (match) return match.id;
    const flagship = (await fetchSkimsStores()).find(s => s.isOwnStore && /New York, NY/i.test(s.address));
    if (!flagship) throw new Error('no SKIMS-own NYC store found on Stockist');
    const ref = await db.collection('stores').add({
        name: 'Skims', brand: 'Skims', category: 'Modern Basics', categories: ['Clothing', 'Accessories'],
        address: flagship.address, latitude: flagship.latitude, longitude: flagship.longitude,
        phone: flagship.phone, externalId: flagship.externalId,
        deliveryTime: '45 Mins', deliveryRadius: 3, isActive: true, tags: [], logo: '', image: '',
        createdAt: now(),
    });
    return ref.id;
}

/**
 * GET /skimsCatalog?collection=best-sellers&limit=40
 * Normalised products for the portal's preview → save flow. Read-only proxy of
 * public Skims data; capped so it can't be used to hammer them.
 */
export const skimsCatalog = onRequest({ cors: true, timeoutSeconds: 300, memory: '512MiB' }, async (req, res) => {
    try {
        const collection = String(req.query.collection || 'best-sellers').replace(/[^a-z0-9-]/gi, '');
        const limit = Math.min(Number(req.query.limit) || 40, 60);
        const handles = (await fetchSkimsCollectionHandles(collection)).slice(0, limit);
        const products: SkimsProduct[] = [];
        const failed: string[] = [];
        for (const h of handles) {
            try { products.push(await fetchSkimsProduct(h)); }
            catch (e: any) { failed.push(h); console.warn(`skims ${h}: ${e.message}`); }
            await sleep(150);
        }
        res.json({ collection, count: products.length, failed, products });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /syncSkimsCatalog  { storeId?, collection?, limit? }
 * Upserts products/skims_<externalId>_<storeId> and the Skims store doc.
 */
export const syncSkimsCatalog = onRequest({ cors: true, timeoutSeconds: 540, memory: '512MiB' }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    try {
        const { storeId: wanted, collection = 'best-sellers', limit = 40, replaceLegacy = false } = req.body || {};
        const storeId = await ensureSkimsStore(wanted);
        const handles = (await fetchSkimsCollectionHandles(String(collection))).slice(0, Math.min(Number(limit), 200));
        const writes: Parameters<typeof commitChunked>[0] = [];
        const failed: string[] = [];
        for (const h of handles) {
            try {
                const p = await fetchSkimsProduct(h);
                writes.push({
                    ref: db.doc(`products/skims_${p.externalId}_${storeId}`),
                    data: { ...skimsPatch(p), brand: 'Skims', storeId, deliveryTime: '45 Mins', isActive: true, createdAt: now() },
                    merge: true,
                });
            } catch (e: any) { failed.push(h); }
            await sleep(150);
        }
        // Don't clobber createdAt on existing docs.
        const existing = new Set((await db.collection('products').where('storeId', '==', storeId).get()).docs.map(d => d.id));
        for (const w of writes) if (existing.has(w.ref.id)) delete w.data.createdAt;
        await commitChunked(writes);
        // Older Skims docs (CSV/static seeds) are keyed by handle or row; live docs by
        // numeric id. With replaceLegacy, an older doc for a product that was just synced
        // is removed so the app never shows the same product twice. Older docs for
        // products NOT in this sync are left alone — they're the operator's curation.
        let removed = 0;
        if (replaceLegacy) {
            const synced = new Set(writes.map(w => w.data.handle as string));
            const handleOf = (d: FirebaseFirestore.QueryDocumentSnapshot) =>
                d.get('handle') || (d.get('productUrl') || '').split('/products/')[1] || '';
            const legacy = (await db.collection('products').where('storeId', '==', storeId).where('brand', '==', 'Skims').get())
                .docs.filter(d => !/^skims_\d+_/.test(d.id) && synced.has(handleOf(d)));
            for (let i = 0; i < legacy.length; i += BATCH) {
                const batch = db.batch();
                for (const d of legacy.slice(i, i + BATCH)) batch.delete(d.ref);
                await batch.commit();
            }
            removed = legacy.length;
        }
        await setSourceHealth('skims', failed.length < handles.length / 2, `synced ${writes.length}/${handles.length}`);
        res.json({ storeId, synced: writes.length, failed, removed });
    } catch (error: any) {
        await alert(`syncSkimsCatalog failed: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Refresh availability on every Skims product. Five consecutive failures trips
// the breaker: remaining products are marked `unknown`, an alert fires, and the
// source is flagged unhealthy in config/inventory. Nothing is ever marked out
// of stock because a request failed.
// ponytail: sequential, ~1.1s/product → ~450 products fit the 540s timeout; run 4-wide if the catalog grows past that.
async function refreshSkimsAvailability(): Promise<{ updated: number; unknown: number; tripped: boolean }> {
    const snap = await db.collection('products').where('brand', '==', 'Skims').get();
    const writes: Parameters<typeof commitChunked>[0] = [];
    let failures = 0, updated = 0, unknown = 0, tripped = false;

    for (const doc of snap.docs) {
        const handle: string | undefined = doc.get('handle') || (doc.get('productUrl') || '').split('/products/')[1];
        const sizes: string[] = doc.get('sizes') || [];
        if (tripped || !handle) {
            writes.push({ ref: doc.ref, data: unknownPatch(sizes), merge: true }); unknown++;
            continue;
        }
        try {
            const p = await fetchSkimsProduct(handle);
            writes.push({ ref: doc.ref, data: skimsPatch(p), merge: true });
            updated++; failures = 0;
        } catch (e: any) {
            failures++; unknown++;
            writes.push({ ref: doc.ref, data: unknownPatch(sizes), merge: true });
            if (failures >= 5) {
                tripped = true;
                await alert(`Skims availability breaker tripped after 5 consecutive failures (last: ${e.message}). Remaining products marked unknown.`);
            }
        }
        await sleep(150);
    }
    await commitChunked(writes);
    await setSourceHealth('skims', !tripped, `refreshed ${updated}, unknown ${unknown}`);
    console.log(`✅ skims refresh — updated ${updated}, unknown ${unknown}, tripped ${tripped}`);
    return { updated, unknown, tripped };
}

export const refreshSkimsStock = onRequest({ cors: true, timeoutSeconds: 540, memory: '512MiB' }, async (_req, res) => {
    try { res.json({ success: true, ...(await refreshSkimsAvailability()) }); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

export const scheduledSkimsStock = onSchedule({ schedule: 'every 30 minutes', timeoutSeconds: 540, memory: '512MiB' }, async () => {
    try { await refreshSkimsAvailability(); }
    catch (error: any) { await alert(`scheduledSkimsStock crashed: ${error.message}`); }
});

/**
 * POST /checkAvailability { productId }
 * What the app calls on the product page. Returns per-size state plus the
 * store the Snatcher will walk into. Refreshes live if the record is stale.
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

        const checkedAt: FirebaseFirestore.Timestamp | undefined = d.availabilityCheckedAt;
        const stale = !checkedAt || Date.now() - checkedAt.toMillis() > FRESH_MS;
        const handle = d.handle || (d.productUrl || '').split('/products/')[1];
        if (d.brand === 'Skims' && handle && stale) {
            try {
                const patch = skimsPatch(await fetchSkimsProduct(handle));
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

        const store = d.storeId ? (await db.doc(`stores/${d.storeId}`).get()).data() : undefined;
        res.json({
            productId, state, sizes: availability,
            source: (d.availabilitySource || 'none') as Source,
            checkedAt: d.availabilityCheckedAt?.toDate?.().toISOString() ?? null,
            store: store ? { id: d.storeId, name: store.name, address: store.address ?? null } : null,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
