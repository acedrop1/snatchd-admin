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
export async function fetchShopifyCatalog(domain: string, brand: string, limit = Infinity): Promise<SourceProduct[]> {
    const byId = new Map<string, SourceProduct>();
    for (let page = 1; page <= 200; page++) {
        const res = await axios.get(`https://${domain}/products.json`, {
            params: { limit: PAGE, page }, headers: { 'User-Agent': UA, Accept: 'application/json' }, timeout: 30000,
        });
        const products: any[] = res.data?.products || [];
        if (!products.length) break;
        const before = byId.size;
        for (const p of products) {
            const n = normalise(domain, brand, p);
            if (n.variants.length) byId.set(n.externalId, n);
        }
        // A page that adds nothing means we've wrapped around
        if (byId.size === before) break;
        if (byId.size >= limit || products.length < PAGE) break;
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
