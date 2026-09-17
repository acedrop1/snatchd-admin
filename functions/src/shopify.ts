import axios from 'axios';
import { SourceProduct, SourceVariant, SizeState } from './types';

// Plain Shopify storefronts publish their catalog at /products.json and each
// product at /products/<handle>.json — documented, public, no auth. Verified
// on kith.com, aloyoga.com, aimeleondore.com. `available` is ONLINE stock;
// per-store pickup availability is not exposed publicly.
const UA = 'SnatchdInventory/1.0 (+https://snatchd.app)';
const PAGE = 250; // Shopify's max per page

function normalise(domain: string, brand: string, p: any): SourceProduct {
    const sizeOpt = (p.options || []).find((o: any) => /size/i.test(o?.name));
    const sizeIdx = sizeOpt ? (p.options || []).indexOf(sizeOpt) + 1 : 0; // option1/option2/option3
    const colorOpt = (p.options || []).find((o: any) => /colou?r/i.test(o?.name));

    const variants: SourceVariant[] = (p.variants || []).map((v: any) => ({
        id: String(v.id),
        sku: v.sku || '',
        size: sizeIdx ? String(v[`option${sizeIdx}`] ?? 'OS') : 'OS',
        availableForSale: !!v.available,
        price: parseFloat(v.price) || 0,
        compareAtPrice: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
    }));

    // A size is in stock if any colour of it is
    const availability: Record<string, SizeState> = {};
    for (const v of variants) {
        if (availability[v.size] !== 'in_stock') availability[v.size] = v.availableForSale ? 'in_stock' : 'out_of_stock';
    }

    const tags: string[] = Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    const isMens = /\b(men|mens|men's)\b/i.test(`${p.product_type} ${tags.join(' ')} ${p.title}`) && !/women/i.test(`${p.product_type} ${p.title}`);

    return {
        externalId: String(p.id),
        handle: p.handle,
        title: p.title,
        brand,
        price: Math.min(...variants.map(v => v.price).filter(n => n > 0), Infinity) === Infinity ? 0 : Math.min(...variants.map(v => v.price).filter(n => n > 0)),
        compareAtPrice: variants.find(v => v.compareAtPrice)?.compareAtPrice ?? null,
        description: String(p.body_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        productType: p.product_type || '',
        tags,
        category: p.product_type || 'Clothing',
        gender: isMens ? 'Men' : 'Women',
        images: (p.images || []).map((i: any) => i.src).filter(Boolean),
        sizes: sizeOpt ? sizeOpt.values : ['OS'],
        styles: colorOpt ? colorOpt.values : [],
        variants,
        availability,
        productUrl: `https://${domain}/products/${p.handle}`,
    };
}

/**
 * The whole catalog. /products.json returns 250 products per page WITH their
 * variants, sizes, prices and availability, so a full store is a few dozen
 * requests — no per-product page visits. Verified sizes: Skims ~3.7k,
 * Kith ~5k, Alo ~4k.
 */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Shopify rate-limits /products.json per IP and answers 429. Back off and retry
 *  rather than abandoning the catalogue — a daily sweep must survive this. */
/** One page of products, keyed by a cursor. Shopify rate-limits per IP (429);
 *  back off and retry rather than abandoning the catalogue. */
/** One page. Returns null when the store says we've run past the end.
 *  429 is rate limiting — back off and retry rather than lose the catalogue. */
async function getPage(domain: string, page: number): Promise<any[] | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const res = await axios.get(`https://${domain}/products.json`, {
            params: { limit: PAGE, page }, headers: { 'User-Agent': UA, Accept: 'application/json' },
            timeout: 30000, validateStatus: () => true,
        });
        if (res.status === 200) return res.data?.products || [];
        // Shopify caps page-based paging at 10,000 items and answers 400 past
        // it (Kith's catalogue is larger). That's the end, not a failure.
        if (res.status === 400 || res.status === 404) return null;
        if (res.status === 429) {
            const wait = Number(res.headers['retry-after']) * 1000 || 2000 * 2 ** attempt;
            console.log(`  ${domain}: 429, waiting ${Math.round(wait / 1000)}s`);
            await sleep(wait);
            continue;
        }
        throw new Error(`${domain}: HTTP ${res.status} on page ${page}`);
    }
    throw new Error(`${domain}: still rate limited after 5 attempts`);
}

export async function fetchShopifyCatalog(domain: string, brand: string, limit = Infinity): Promise<SourceProduct[]> {
    const byId = new Map<string, SourceProduct>();
    // ?page= paging. Not since_id: /products.json isn't ordered by id, so a
    // cursor doesn't advance. Shopify stops at 10,000 items, which is the
    // ceiling for the largest store we carry.
    for (let page = 1; page <= 40; page++) {
        const products = await getPage(domain, page);
        if (products === null || !products.length) break;
        const before = byId.size;
        for (const p of products) {
            const n = normalise(domain, brand, p);
            if (n.variants.length) byId.set(n.externalId, n);
        }
        if (byId.size === before) break;            // page repeated: done
        if (byId.size >= limit || products.length < PAGE) break;
        await sleep(300);                            // be a polite guest
    }
    const all = [...byId.values()];
    return Number.isFinite(limit) ? all.slice(0, limit) : all;
}

export async function fetchShopifyProduct(domain: string, brand: string, handle: string): Promise<SourceProduct> {
    const res = await axios.get(`https://${domain}/products/${handle}.json`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' }, timeout: 15000,
    });
    if (!res.data?.product) throw new Error(`no product for ${handle} on ${domain}`);
    return normalise(domain, brand, res.data.product);
}
