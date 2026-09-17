// Zara via parse.bot — a managed wrapper that absorbs Akamai for us.
// Verified 2026-09-17: check_store_availability returns per-store, per-size
// COUNTS (SALES_AREA vs INTERNAL_WAREHOUSE), not booleans. SoHo = 3862,
// Fifth Ave = 3818. Akamai still wins sometimes: the API answers 503 with
// retry_after, so every call retries and a persistent failure becomes
// `unknown`, never `out_of_stock`.
import axios from 'axios';
import { SourceProduct, SizeState, sleep } from './types';

const BASE = 'https://api.parse.bot/scraper/7b6ae3c4-c891-4e4b-84e6-b2f8a6a86c7f';

async function zaraGet(endpoint: string, params: Record<string, string>): Promise<any> {
    const key = process.env.PARSE_API_KEY;
    if (!key) throw new Error('PARSE_API_KEY is not set (functions/.env)');
    for (let attempt = 0; attempt < 3; attempt++) {
        const res = await axios.get(`${BASE}/${endpoint}`, { params, headers: { 'X-API-Key': key }, timeout: 180000, validateStatus: () => true });
        if (res.status === 200 && res.data?.status === 'success') return res.data.data;
        const err = res.data?.error || {};
        if (res.status === 503 && err.status === 'blocked') {
            const wait = Math.min(Number(err.retry_after) || 60, 90) * 1000;
            console.log(`  zara ${endpoint}: akamai blocking, retry in ${wait / 1000}s`);
            await sleep(wait);
            continue;
        }
        throw new Error(`zara ${endpoint}: HTTP ${res.status} ${err.message || ''}`.trim());
    }
    throw new Error(`zara ${endpoint}: still blocked after 3 attempts`);
}

// A Zara "product" has colours, each with its own productId, sizes and stock.
// A customer orders a colour in a size, so each colour is a product to us:
//   externalId = colour productId, handle = `${seoProductId}:${colorId}`
const handleOf = (seoId: string, colorId: string) => `${seoId}:${colorId}`;
const splitHandle = (h: string) => { const [seoId, colorId] = h.split(':'); return { seoId, colorId }; };
const money = (cents: any) => Math.round(Number(cents) || 0) / 100;
const img = (x: any) => x?.path && x?.name ? `https://static.zara.net${x.path}/w/750/${x.name}.jpg` : null;
const productUrl = (keyword: string, seoId: string, colorProductId: string) => `https://www.zara.com/us/en/${keyword || 'p'}-p${seoId}.html?v1=${colorProductId}`;

function baseProduct(p: any, c: any, brand: string): SourceProduct {
    const seoId = String(p.seo?.seoProductId || String(p.detail?.reference || '').split('-')[0]);
    return {
        externalId: String(c.productId), handle: handleOf(seoId, String(c.id)),
        title: c.name ? `${p.name} — ${titleCase(c.name)}` : p.name, brand,
        price: money(c.price ?? p.price), compareAtPrice: null,
        description: '', productType: p.familyName || '', tags: [], category: p.familyName || 'Clothing',
        gender: /man$/i.test(p.sectionName || '') && !/woman/i.test(p.sectionName || '') ? 'Men' : 'Women',
        images: (c.xmedia || []).map(img).filter(Boolean) as string[],
        sizes: [], styles: [titleCase(c.name || '')].filter(Boolean),
        variants: [], availability: {},
        productUrl: productUrl(p.seo?.keyword, seoId, String(c.productId)),
    };
}
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, m => m.toUpperCase());

/** Catalog seed: one listing row per colour, from a few search queries. Sizes
 *  and stock arrive when the product is shown (same two-phase model as Bergdorf). */
export async function fetchZaraCatalog(queries: string[], brand: string, limit = Infinity): Promise<SourceProduct[]> {
    const byId = new Map<string, SourceProduct>();
    for (const q of queries) {
        const data = await zaraGet('search_products', { query: q });
        for (const p of data?.products || []) {
            for (const c of p.detail?.colors || []) {
                const sp = baseProduct(p, c, brand);
                if (sp.price > 0) byId.set(sp.externalId, sp);
                if (byId.size >= limit) return [...byId.values()];
            }
        }
        await sleep(500);
    }
    return [...byId.values()];
}

/** One colour, fully resolved: online availability per size (details) and the
 *  retailer's own count at OUR store (check_store_availability). */
export async function fetchZaraProduct(handle: string, brand: string, storeId: string): Promise<SourceProduct> {
    const { seoId, colorId } = splitHandle(handle);
    const d = await zaraGet('get_product_details', { product_id: seoId });
    const color = (d.detail?.colors || []).find((c: any) => String(c.id) === colorId);
    if (!color) throw new Error(`zara ${handle}: colour ${colorId} not on product`);
    const sp = baseProduct(d, color, brand);

    const online: Record<string, SizeState> = {};
    for (const s of color.sizes || []) {
        const st: SizeState = s.availability === 'in_stock' || s.availability === 'low' ? 'in_stock'
            : s.availability === 'out_of_stock' ? 'out_of_stock' : 'unknown';
        online[s.name] = st;
        sp.variants.push({ id: String(s.sku || `${sp.externalId}-${s.name}`), sku: String(s.sku || ''), size: s.name, availableForSale: st === 'in_stock', price: sp.price, compareAtPrice: null });
    }
    sp.sizes = [...new Set<string>((color.sizes || []).map((s: any) => String(s.name)))];
    sp.availability = online;

    // The store's own count for this colour. Any unit at the store (floor or
    // stockroom) counts: the Snatcher can ask for it.
    const st = await zaraGet('check_store_availability', { product_id: seoId, store_ids: storeId });
    const store = (st.stores || []).find((s: any) => String(s.store_id) === String(storeId));
    if (store) {
        const at: Record<string, SizeState> = {};
        for (const s of store.sizes || []) {
            if (String(s.color_id) !== colorId) continue;
            at[s.name] = Number(s.stock) > 0 ? 'in_stock' : 'out_of_stock';
        }
        sp.storeAvailability = at;
        if (!sp.sizes.length) sp.sizes = Object.keys(at);
    }
    return sp;
}
