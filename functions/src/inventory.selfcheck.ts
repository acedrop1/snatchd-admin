// Runnable check: hits the real sources. `npm run check:inventory`
import assert from 'assert';
import { fetchSkimsProduct, fetchSkimsCollectionHandles, fetchSkimsStores } from './skims';
import { fetchShopifyCatalog, fetchShopifyProduct } from './shopify';

(async () => {
    const kith = await fetchShopifyCatalog('kith.com', 'Kith', 30);
    assert(kith.length >= 10, `kith catalog: ${kith.length}`);
    const k = await fetchShopifyProduct('kith.com', 'Kith', kith[0].handle);
    assert(k.variants.length > 0 && k.sizes.length > 0 && k.images.length > 0, 'kith product shape');
    assert(Object.values(k.availability).every(s => s === 'in_stock' || s === 'out_of_stock'), 'kith availability');

    const handles = await fetchSkimsCollectionHandles('best-sellers');
    assert(handles.length >= 5, `skims handles: ${handles.length}`);
    const s = await fetchSkimsProduct(handles[0]);
    assert(s.variants.length > 0 && s.price > 0 && s.images.length > 0, 'skims product shape');
    const nyc = (await fetchSkimsStores()).filter(x => x.isOwnStore && /New York/i.test(x.address));
    assert(nyc.length >= 1, 'skims NYC store');

    console.log(`✅ shopify(kith): ${kith.length} products, ${k.title} → ${k.sizes.length} sizes | skims: ${handles.length} handles, ${s.title} → ${s.variants.length} variants | NYC: ${nyc[0].name}`);
})().catch(e => { console.error('❌ inventory self-check failed:', e.message); process.exit(1); });
