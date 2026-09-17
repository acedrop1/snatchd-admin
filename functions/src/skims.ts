import axios from 'axios';
import { SourceProduct, SourceVariant, SizeState, sleep } from './types';

// ── Skims inventory source ─────────────────────────────────────────────────
// skims.com is a Shopify Hydrogen (React Router) storefront on Oxygen. Its
// route loaders are publicly readable as newline-delimited "turbo-stream"
// JSON at `<path>.data` — a documented framework mechanism, no bot challenge,
// ~0.9s/product. Per-variant data includes sku, size and availableForSale.
//
// What this does NOT give us: per-store inventory. Skims exposes no Storefront
// token client-side, so `storeAvailability` is unreachable. `availableForSale`
// is ONLINE availability — a strong proxy, not in-store truth. In-store truth
// is the Snatcher's confirmation (see checkAvailability in index.ts).
//
// Physical stores come from Stockist (their store-locator vendor), public API.

const BASE = 'https://skims.com';
const UA = 'SnatchdInventory/1.0 (+https://snatchd.app)';
const STOCKIST_TAG = 'u22232'; // from data-stockist-widget-tag on skims.com/pages/store-locator

export type SkimsVariant = SourceVariant;
export type SkimsProduct = SourceProduct;

export interface SkimsStore {
    externalId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
    isOwnStore: boolean;     // true = SKIMS-operated, false = stockist (Bloomingdale's etc.)
}

// ── turbo-stream decoder ───────────────────────────────────────────────────
// Line 0 is a flat JSON array. Objects use "_<i>" keys whose name lives at
// arr[i]; values are indices. Negative ints are sentinels (undefined/null).
// 2-element arrays whose first element is a 1-char string are typed refs
// (["P", i] = Promise) — real arrays only ever contain indices.
const REF_TAGS = new Set('PEDSMZBURNK'.split(''));

export function decodeTurboStream(text: string): any {
    const line = text.split('\n').find(l => l.trim().length > 0);
    if (!line) throw new Error('empty turbo-stream payload');
    const arr: any[] = JSON.parse(line);
    const cache = new Map<number, any>();

    const resolve = (i: any): any => {
        if (typeof i !== 'number') return i;
        if (i < 0) return undefined;
        if (cache.has(i)) return cache.get(i);
        const v = arr[i];
        if (v === null || typeof v !== 'object') { cache.set(i, v); return v; }
        if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && v[0].length === 1 && REF_TAGS.has(v[0])) {
            cache.set(i, undefined); // a wrapper can point back at itself; a cycle resolves to undefined
            const r = resolve(v[1]); cache.set(i, r); return r;
        }
        const out: any = Array.isArray(v) ? [] : {};
        cache.set(i, out); // registered before filling so cycles terminate
        if (Array.isArray(v)) {
            for (const x of v) out.push(resolve(x));
        } else {
            for (const [k, val] of Object.entries(v)) {
                const key = /^_-?\d+$/.test(k) ? arr[Number(k.slice(1))] : k;
                out[key] = resolve(val);
            }
        }
        return out;
    };
    return resolve(0);
}

// Depth-first search for the first object carrying `key`.
function findKey(o: any, key: string, seen = new Set<any>()): any {
    if (!o || typeof o !== 'object' || seen.has(o)) return undefined;
    seen.add(o);
    if (!Array.isArray(o) && key in o) return o[key];
    for (const v of Array.isArray(o) ? o : Object.values(o)) {
        const r = findKey(v, key, seen);
        if (r !== undefined) return r;
    }
    return undefined;
}

async function getData(path: string): Promise<any> {
    const res = await axios.get(`${BASE}${path}.data`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/x-script, */*' },
        timeout: 15000,
        responseType: 'text',
        transformResponse: r => r, // keep raw text; it is not plain JSON
    });
    return decodeTurboStream(res.data as string);
}

const num = (x: any): number => { const n = parseFloat(x?.amount ?? x); return Number.isFinite(n) ? n : 0; };
const gidNum = (gid: string) => (gid || '').split('/').pop() || '';

// ── Product ────────────────────────────────────────────────────────────────
export async function fetchSkimsProduct(handle: string): Promise<SkimsProduct> {
    const data = await getData(`/products/${handle}`);
    const mp = findKey(data, 'mappedProduct');
    if (!mp || !mp.product) throw new Error(`no mappedProduct for ${handle}`);
    const p = mp.product;

    const sizeOpt = (mp.options?.options || []).find((o: any) => /size/i.test(o?.name));
    const sizes: string[] = sizeOpt?.values || [];

    const variants: SkimsVariant[] = (mp.variants || []).map((v: any) => {
        const sizeSel = (v.selectedOptions || []).find((s: any) => /size/i.test(s?.name));
        const size = sizeSel?.value || (typeof v.title === 'string' ? v.title.split(' / ').pop() : '') || 'OS';
        return {
            id: v.id,
            sku: v.sku || '',
            size,
            availableForSale: !!v.availableForSale,
            price: num(v.price),
            compareAtPrice: v.compareAtPrice ? num(v.compareAtPrice) : null,
        };
    });

    const availability: Record<string, SizeState> = {};
    for (const v of variants) availability[v.size] = v.availableForSale ? 'in_stock' : 'out_of_stock';

    const images: string[] = [];
    const push = (u?: string) => { if (u && !images.includes(u)) images.push(u); };
    push(mp.featuredImage?.url);
    for (const m of mp.media?.media || []) push(m?.image?.url);

    const color = (mp.options?.swatchOptions || []).find((o: any) => /colou?r/i.test(o?.name))?.value;
    const tags: string[] = Array.isArray(p.tags) ? p.tags : [];
    const productType: string = p.productType || '';
    const isMens = /\bmen/i.test(handle) || tags.some(t => /^mens?$/i.test(t));

    return {
        externalId: gidNum(p.id),
        handle: p.handle || handle,
        title: mp.title?.full || mp.title?.display || p.title || handle,
        brand: 'Skims' as const,
        price: variants[0]?.price ?? num(mp.priceRange?.minVariantPrice),
        compareAtPrice: variants[0]?.compareAtPrice ?? null,
        description: p.description || '',
        productType,
        tags,
        category: 'Clothing',
        gender: isMens ? 'Men' : 'Women',
        images,
        sizes: sizes.length ? sizes : variants.map(v => v.size),
        styles: color ? [color] : [],
        variants,
        availability,
        productUrl: `${BASE}/products/${p.handle || handle}`,
    };
}

// ── Collection → handles ───────────────────────────────────────────────────
// Collection pages list products as URL strings (Algolia hits), and the grid
// streams in over several turbo-stream lines — so match links across the whole
// payload rather than decoding one line.
export async function fetchSkimsCollectionHandles(collection: string): Promise<string[]> {
    const res = await axios.get(`${BASE}/collections/${collection}.data`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/x-script, */*' }, timeout: 15000,
        responseType: 'text', transformResponse: r => r,
    });
    const handles = new Set<string>();
    for (const m of (res.data as string).matchAll(/\/products\/([a-z0-9][a-z0-9-]{2,})/g)) handles.add(m[1]);
    return [...handles];
}

// ── Stores (Stockist) ──────────────────────────────────────────────────────
export async function fetchSkimsStores(): Promise<SkimsStore[]> {
    const res = await axios.get(`https://stockist.co/api/v1/${STOCKIST_TAG}/locations/all`, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' }, timeout: 15000,
    });
    const rows: any[] = Array.isArray(res.data) ? res.data : res.data?.locations || [];
    return rows.map(l => ({
        externalId: String(l.id),
        name: l.name || '',
        address: [l.address_line_1, l.address_line_2, l.city, l.state, l.postal_code].filter(Boolean).join(', '),
        latitude: Number(l.latitude),
        longitude: Number(l.longitude),
        phone: l.phone || '',
        isOwnStore: (l.filters || []).some((f: any) => f?.name === 'Stores'),
    }));
}

export { sleep };
