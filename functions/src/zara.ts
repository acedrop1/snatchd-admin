// Zara via parse.bot — a managed wrapper that absorbs Akamai for us.
// Verified 2026-09-17: check_store_availability returns per-store, per-size
// COUNTS (SALES_AREA vs INTERNAL_WAREHOUSE), not booleans. SoHo = 3862,
// Fifth Ave = 3818. Akamai still wins sometimes: the API answers 503 with
// retry_after, so every call retries and a persistent failure becomes
// `unknown`, never `out_of_stock`.
import axios from 'axios';
import { SourceProduct, SizeState, sleep } from './types';

// Each parse.bot account has its own copy of the scraper; set PARSE_SCRAPER_ID per account.
const BASE = `https://api.parse.bot/scraper/${process.env.PARSE_SCRAPER_ID || 'b9d60cde-b8ae-4802-a1d2-c6a96aaaa36e'}`;

// parse.bot allows a burst of 30 calls, then refills at 5 a minute. Pace
// ourselves so we never trip it — a 429 still counts against the daily cap.
const recent: number[] = [];
async function pace() {
    const now = Date.now();
    while (recent.length && now - recent[0] > 60000) recent.shift();
    if (recent.length >= 25) {
        const wait = 60000 - (now - recent[0]) + 250;
        await sleep(wait);
        return pace();
    }
    recent.push(Date.now());
}

async function zaraGet(endpoint: string, params: Record<string, string>): Promise<any> {
    const key = process.env.PARSE_API_KEY;
    if (!key) throw new Error('PARSE_API_KEY is not set (functions/.env)');
    for (let attempt = 0; attempt < 6; attempt++) {
        await pace();
        // POST with a JSON body: GET on this API stalled 2 min then answered a false 401 (2026-10-13)
        const res = await axios.post(`${BASE}/${endpoint}`, params, { headers: { 'X-API-Key': key, 'Content-Type': 'application/json' }, timeout: 180000, validateStatus: () => true });
        if (res.status === 200 && res.data?.status === 'success') return res.data.data;
        // parse.bot answers a false 401 now and then after a 2-min stall (2 of 4 calls on 2026-10-13); retry before believing it
        if (res.status === 401) { if (attempt < 2) continue; throw new Error('parse.bot: bad API key (401)'); }
        if (res.status === 402) throw new Error('parse.bot: out of credits (402)');
        const err = res.data?.error || {};
        const msg = String(err.message || err.error || '');
        if (res.status === 429) {
            const m = /retry in (\d+)s/i.exec(msg);
            const wait = (m ? Number(m[1]) : Number(res.headers['retry-after']) || 15) * 1000 + 500;
            console.log(`  zara ${endpoint}: rate limited, waiting ${Math.round(wait / 1000)}s`);
            await sleep(wait);
            continue;
        }
        if (res.status === 503 && err.status === 'blocked') {
            const wait = Math.min(Number(err.retry_after) || 60, 90) * 1000;
            console.log(`  zara ${endpoint}: akamai blocking, retry in ${wait / 1000}s`);
            await sleep(wait);
            continue;
        }
        throw new Error(`zara ${endpoint}: HTTP ${res.status} ${msg}`.trim());
    }
    throw new Error(`zara ${endpoint}: gave up after 6 attempts`);
}

// A Zara "product" has colours, each with its own productId, sizes and stock.
// A customer orders a colour in a size, so each colour is a product to us:
//   externalId = colour productId, handle = `${seoProductId}:${colorId}`
const handleOf = (seoId: string, colorId: string) => `${seoId}:${colorId}`;
const splitHandle = (h: string) => { const [seoId, colorId] = h.split(':'); return { seoId, colorId }; };
const money = (cents: any) => Math.round(Number(cents) || 0) / 100;
// xmedia carries a canonical url with a {width} placeholder; the CDN serves it
// to real browsers (it 403s curl's default UA, which is fine for the app).
const img = (x: any) => x?.url ? String(x.url).replace('{width}', '750')
    : x?.path && x?.name ? `https://static.zara.net${x.path}/w/750/${x.name}.jpg` : null;
const productUrl = (keyword: string, seoId: string, colorProductId: string) => `https://www.zara.com/us/en/${keyword || 'p'}-p${seoId}.html?v1=${colorProductId}`;

function baseProduct(p: any, c: any, brand: string): SourceProduct {
    const seoId = String(p.seo?.seoProductId || String(p.detail?.reference || '').split('-')[0]);
    return {
        externalId: String(c.productId), handle: handleOf(seoId, String(c.id)),
        title: titleCase(String(p.name || '')), brand,   // colour lives in `styles`, like Bergdorf
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

// Zara's own category feed is public and free; parse.bot (10 credits) is the fallback.
async function zaraCategory(id: string): Promise<any[]> {
    try {
        const r = await axios.get(`https://www.zara.com/us/en/category/${id}/products?ajax=true`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', Accept: 'application/json' }, timeout: 30000,
        });
        const rows = (r.data?.productGroups || []).flatMap((g: any) => (g.elements || []).flatMap((e: any) => e.commercialComponents || []));
        if (rows.length) return rows.filter((c: any) => c.type === 'Product');
    } catch (e: any) { console.log(`  zara category ${id}: zara.com ${e.response?.status || e.message}, using parse.bot`); }
    return (await zaraGet('get_category_products', { category_id: id }))?.products || [];
}

// Clothing, shoes and bags a Snatcher can pick up: no Zara Home, no perfume, nothing unreleased.
const sellable = (p: any) => p.brand?.brandGroupCode !== 'zarahome' && p.sectionName !== 'HOME'
    && p.kind !== 'Fragance' && p.availability !== 'coming_soon' && p.availability !== 'out_of_stock';

export const ZARA_MAX = 1000;

/**
 * Seed list from Zara categories, in Zara's own order. Groups are split by ';',
 * each "cap=cat[:cap],cat[:cap]" fills its cap from its categories in order:
 * "500=2420954,2546081;500=2544454,2431948:300" = Women: all best sellers, then
 * newest arrivals up to 500; Men: all new in, then up to 300 best sellers, to 500.
 * The unit is the listed colour (what Zara shows), so the app gets exactly these.
 */
export async function zaraCategoryHandles(spec: string): Promise<string[]> {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const group of spec.split(';').map(x => x.trim()).filter(Boolean)) {
        const [groupCap, cats] = group.includes('=') ? [Number(group.split('=')[0]), group.split('=')[1]] : [Infinity, group];
        let inGroup = 0;
        for (const part of cats.split(',').map(x => x.trim()).filter(Boolean)) {
            const [id, capStr] = part.split(':');
            const cap = Number(capStr) || Infinity;
            let taken = 0;
            for (const p of await zaraCategory(id)) {
                if (taken >= cap || inGroup >= groupCap || out.length >= ZARA_MAX) break;
                const seoId = p.seo?.seoProductId, colorId = p.detail?.colors?.[0]?.id;
                if (!seoId || !colorId || !sellable(p)) continue;
                const h = handleOf(String(seoId), String(colorId));
                if (seen.has(h)) continue;
                seen.add(h); out.push(h); taken++; inGroup++;
            }
            console.log(`  zara category ${id}: took ${taken}`);
        }
    }
    return out;
}

export async function fetchZaraCatalog(queries: string[], brand: string, limit = Infinity, categories?: string): Promise<SourceProduct[]> {
    // Search finds the products (1 credit a term) but carries one photo and no
    // sizes. Details has both, and one call covers every colour of a product,
    // so we take the seoIds from search and resolve each once (1 credit).
    // Category seeds name exact colours; search seeds take every colour of a style.
    const wanted = categories ? new Set(await zaraCategoryHandles(categories)) : null;
    const seoIds = new Set<string>([...(wanted || [])].map(h => splitHandle(h).seoId));
    for (const q of categories ? [] : queries) {
        const data = await zaraGet('search_products', { query: q });
        for (const p of data?.products || []) {
            const id = p.seo?.seoProductId || String(p.detail?.reference || '').split('-')[0];
            if (id && (p.detail?.colors || []).length) seoIds.add(String(id));
        }
        await sleep(300);
    }
    const byId = new Map<string, SourceProduct>();
    for (const seoId of seoIds) {
        if (byId.size >= limit) break;
        let d: any;
        try { d = await zaraGet('get_product_details', { product_id: seoId }); }
        catch (e: any) { console.log(`  zara ${seoId}: ${e.message}`); continue; }
        for (const c of d?.detail?.colors || []) {
            if (wanted && !wanted.has(handleOf(seoId, String(c.id)))) continue;
            const sp = baseProduct(d, c, brand);
            if (sp.price <= 0) continue;
            sp.sizes = [...new Set<string>((c.sizes || []).map((z: any) => String(z.name)))];
            for (const z of c.sizes || []) {
                const st: SizeState = z.availability === 'in_stock' || z.availability === 'low' || z.availability === 'low_on_stock' ? 'in_stock'
                    : z.availability === 'out_of_stock' ? 'out_of_stock' : 'unknown';
                sp.availability[z.name] = st;
                sp.variants.push({ id: String(z.sku || `${sp.externalId}-${z.name}`), sku: String(z.sku || ''), size: z.name, availableForSale: st === 'in_stock', price: sp.price, compareAtPrice: null });
            }
            byId.set(sp.externalId, sp);
        }
        await sleep(300);
    }
    return [...byId.values()];
}

const storeChecks = new Map<string, { at: number; res: Promise<any> }>();

/** One colour, fully resolved: online availability per size (details) and the
 *  retailer's own count at OUR store (check_store_availability). */
export async function fetchZaraProduct(handle: string, brand: string, storeId: string, existing?: any): Promise<SourceProduct> {
    const { seoId, colorId } = splitHandle(handle);
    let sp: SourceProduct;
    if (existing?.sizes?.length && existing?.title) {
        // Already catalogued: only the store count changes day to day, so skip
        // the details call — halves the cost of every count.
        sp = {
            externalId: String(existing.externalId || ''), handle, title: existing.title, brand,
            price: Number(existing.price) || 0, compareAtPrice: null, description: existing.description || '',
            productType: existing.productType || '', tags: [], category: existing.category || 'Clothing', gender: existing.gender || 'Women',
            images: existing.images || [], sizes: existing.sizes, styles: existing.styles || [],
            variants: existing.variants || [], availability: existing.availability || {}, productUrl: existing.productUrl || '',
        };
    } else {
        const d = await zaraGet('get_product_details', { product_id: seoId });
        const color = (d.detail?.colors || []).find((c: any) => String(c.id) === colorId);
        if (!color) throw new Error(`zara ${handle}: colour ${colorId} not on product`);
        sp = baseProduct(d, color, brand);
        const online: Record<string, SizeState> = {};
        for (const s of color.sizes || []) {
            const st: SizeState = s.availability === 'in_stock' || s.availability === 'low' || s.availability === 'low_on_stock' ? 'in_stock'
                : s.availability === 'out_of_stock' ? 'out_of_stock' : 'unknown';
            online[s.name] = st;
            sp.variants.push({ id: String(s.sku || `${sp.externalId}-${s.name}`), sku: String(s.sku || ''), size: s.name, availableForSale: st === 'in_stock', price: sp.price, compareAtPrice: null });
        }
        sp.sizes = [...new Set<string>((color.sizes || []).map((s: any) => String(s.name)))];
        sp.availability = online;
    }

    // The store's own count for this colour. Any unit at the store (floor or
    // stockroom) counts: the Snatcher can ask for it.
    // One call answers every colour of a style, so colours share it (5 credits a style, not a colour).
    // ponytail: in-memory per instance; a count runs in one instance, so that's enough.
    const key = `${seoId}|${storeId}`;
    const hit = storeChecks.get(key);
    if (!hit || Date.now() - hit.at > 15 * 60000) storeChecks.set(key, { at: Date.now(), res: zaraGet('check_store_availability', { product_id: seoId, store_ids: storeId }) });
    let st: any;
    try { st = await storeChecks.get(key)!.res; } catch (e) { storeChecks.delete(key); throw e; }
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
