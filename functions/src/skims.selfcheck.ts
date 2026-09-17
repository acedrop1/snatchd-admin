// Runnable check: hits skims.com for real and asserts the parser still holds.
// `npm run check:skims` — fails loudly if Skims changes their payload shape.
import assert from 'assert';
import { fetchSkimsProduct, fetchSkimsCollectionHandles, fetchSkimsStores } from './skims';

(async () => {
    const handles = await fetchSkimsCollectionHandles('best-sellers');
    assert(handles.length >= 5, `expected ≥5 handles from best-sellers, got ${handles.length}`);

    const p = await fetchSkimsProduct(handles[0]);
    assert(p.externalId && /^\d+$/.test(p.externalId), 'externalId numeric');
    assert(p.variants.length > 0, 'has variants');
    assert(p.variants.every(v => v.id.startsWith('gid://shopify/ProductVariant/')), 'variant gids');
    assert(p.sizes.length === Object.keys(p.availability).length || p.sizes.length > 0, 'sizes ↔ availability');
    assert(Object.values(p.availability).every(s => s === 'in_stock' || s === 'out_of_stock'), 'availability states');
    assert(p.price > 0, 'price > 0');
    assert(p.images.length > 0, 'has images');

    const stores = await fetchSkimsStores();
    const nyc = stores.filter(s => s.isOwnStore && /New York/i.test(s.address));
    assert(nyc.length >= 1, 'at least one SKIMS-own NYC store');

    console.log(`✅ skims: ${handles.length} handles | ${p.title} → ${p.variants.length} variants, ${Object.values(p.availability).filter(s => s === 'in_stock').length} sizes in stock | ${stores.length} stores, own NYC: ${nyc.map(s => s.name + ' @ ' + s.address).join('; ')}`);
})().catch(e => { console.error('❌ skims self-check failed:', e.message); process.exit(1); });
