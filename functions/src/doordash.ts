// What a physical store actually carries, read from its DoorDash listing via
// the Apify actor yugenox/doordash-retail-catalog-scraper ($1.50 / 1,000 rows).
// Verified on SKIMS 647 5th Ave (DoorDash store 49810289): every row carries
// Skims' own variant SKU (e.g. AP-PNT-1371-ONX-S), which matches the SKUs in
// our Shopify-sourced catalogue exactly. DoorDash lists each product+colour once
// (one size's SKU), so this gives the store's ASSORTMENT and an item-level stock
// badge, not per-size counts.
import axios from 'axios';

export type StoreStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export interface AssortmentRow { sku: string; status: StoreStatus; name: string; category: string; price: number | null; image: string | null }
export interface Assortment { rows: AssortmentRow[]; listed: number | null }

const ACTOR = 'yugenox~doordash-retail-catalog-scraper';

export async function fetchDoorDashAssortment(doordashStoreId: string): Promise<Assortment> {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error('APIFY_TOKEN is not set (functions/.env)');
    const res = await axios.post(
        `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`,
        { storeUrls: [doordashStoreId], includeStoreSummary: true, includeDescription: false },
        { params: { token, timeout: 480 }, timeout: 500000, validateStatus: () => true },
    );
    if (res.status !== 200 && res.status !== 201) throw new Error(`apify HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
    const data: any[] = Array.isArray(res.data) ? res.data : [];
    const store = data.find(r => r.dataType === 'store');
    const rows: AssortmentRow[] = data.filter(r => r.dataType !== 'store' && r.merchantSku).map(r => ({
        sku: String(r.merchantSku).toUpperCase(),
        name: String(r.name || ''),
        category: String(r.category || ''),
        price: typeof r.price === 'number' ? r.price : (Number(r.price) || null),
        image: r.imageUrl || null,
        // No badge means DoorDash will sell it: available.
        status: r.stockStatus === 'OUT_OF_STOCK' ? 'out_of_stock' : r.stockStatus === 'LOW_STOCK' ? 'low_stock' : 'in_stock',
    }));
    return { rows, listed: store?.itemsListed ?? null };
}
