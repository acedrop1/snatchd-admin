// Bergdorf Goodman runner — real Google Chrome on a Mac.
//
//   node runner.mjs catalog            walk every "Get It Fast" page → all products (hidden until shown in the portal)
//   node runner.mjs refresh [--limit N] [--handle H]  per-size + per-store stock for products shown in the app (or one handle)
//   node runner.mjs detail [--limit N] [--hidden]  fill sizes + per-store stock for products that have none yet
//                                                 (--hidden also enriches items not yet shown in the app)
//   node runner.mjs serve              stay up: answer live checks, refresh at 10:30 and 15:00, catalog at 03:00
//
// Why a Mac and a real browser: bergdorfgoodman.com sits behind DataDome, which
// blocks servers and automation fingerprints but passes a real Chrome profile.
// The profile lives in ./chrome-profile and must be kept.
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ── config ────────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { RUNNER_TOKEN, STORE_ID, BG_STORE_IDS = '63/NY,64/NY', FUNCTIONS_URL = 'https://us-central1-snatchd-app26.cloudfunctions.net' } = process.env;
// Both Fifth Ave buildings count: 63/NY Women's (754), 64/NY Goodman's Men's (745) — across the street from each other.
const BUILDINGS = BG_STORE_IDS.split(',').map(x => x.trim()).filter(Boolean);
if (!RUNNER_TOKEN || !STORE_ID) { console.error('RUNNER_TOKEN and STORE_ID are required (see .env.example)'); process.exit(1); }
const BASE = 'https://www.bergdorfgoodman.com';
const LISTING = `${BASE}/c/bg-curbside-pickup-cat628302`;
const PROFILE = resolve(process.cwd(), 'chrome-profile');
const mode = process.argv[2] || 'serve';
const argv = process.argv.slice(3);
const opt = name => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : (argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1]; };
const limit = Number(opt('limit')) || 0;
const onlyHandle = opt('handle') || '';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Snatchd backend ───────────────────────────────────────────────────────
async function post(fn, body) {
    const r = await fetch(`${FUNCTIONS_URL}/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-runner-token': RUNNER_TOKEN }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${fn}: ${j.error || r.status}`);
    return j;
}
async function get(fn, params) {
    const r = await fetch(`${FUNCTIONS_URL}/${fn}?${new URLSearchParams(params)}`, { headers: { 'x-runner-token': RUNNER_TOKEN } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${fn}: ${j.error || r.status}`);
    return j;
}

// ── browser ───────────────────────────────────────────────────────────────
let ctx;
async function browser() {
    if (ctx) return ctx;
    ctx = await chromium.launchPersistentContext(PROFILE, {
        channel: 'chrome', headless: false, viewport: { width: 1280, height: 900 },
        ignoreDefaultArgs: ['--enable-automation'], args: ['--disable-blink-features=AutomationControlled'],
    });
    return ctx;
}
async function open(url) {
    const page = await (await browser()).newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // DataDome shows a real Chrome a brief JS check, then lets it through: wait for the
    // page's data store rather than a fixed delay.
    for (let i = 0; i < 25; i++) {
        const ready = await page.evaluate(() => !!(window.store && window.store.getState)).catch(() => false);
        if (ready) { await page.waitForTimeout(800); return page; }
        await page.waitForTimeout(1000);
    }
    const html = await page.content();
    await page.close();
    throw new Error(/var dd=\{|disable any ad blocker/.test(html) ? `DataDome challenge at ${url}` : `page never loaded: ${url}`);
}
const state = page => page.evaluate(() => window.store?.getState?.() || null);

// ── mapping ───────────────────────────────────────────────────────────────
const money = s => parseFloat(String(s || '').replace(/[^0-9.]/g, '')) || 0;
const img = u => u ? (u.startsWith('//') ? 'https:' + u : u) : null;

function fromListing(p) {
    return {
        externalId: p.id, handle: p.canonical.replace(/^\/p\//, ''), title: p.name, brand: p.designer,
        price: money(p.rprc), compareAtPrice: null, description: '', productType: '', tags: [],
        category: 'Clothing', gender: /^men'?s\b/i.test(p.name) ? 'Men' : 'Women',
        images: [img(p.main), img(p.alt)].filter(Boolean), sizes: [], styles: p.clrName ? [p.clrName] : [],
        variants: [], availability: {}, productUrl: `${BASE}${p.canonical}`,
        unitsLeft: p.xleft ?? null,
    };
}

async function productDetail(handle) {
    const page = await open(`${BASE}/p/${handle}`);
    try {
        const st = await state(page);
        const pr = st?.productCatalog?.product; if (!pr) throw new Error(`no product state for ${handle}`);
        const skus = (pr.skus || []).filter(s => s.sellable !== false);
        const sizes = [...new Set(skus.map(s => s.size?.name || 'OS'))];
        const variants = skus.map(s => ({ id: s.id, sku: s.metadata?.cmosSkuId || '', size: s.size?.name || 'OS', availableForSale: !!s.inStock, price: money(pr.price?.retailPrice ?? pr.price?.promotionalPrice ?? pr.linkedData?.offers?.price), compareAtPrice: null, color: s.color?.name, stockLevel: s.stockLevel ?? null }));
        const availability = {};
        for (const v of variants) if (availability[v.size] !== 'in_stock') availability[v.size] = v.availableForSale ? 'in_stock' : 'out_of_stock';
        // The retailer's own per-store answer, one call per SKU
        // The Find-In-Store API needs the page's guest session established first.
        await page.evaluate(async () => { try { await fetch('/dt/api/guest', { credentials: 'include' }); } catch {} }).catch(() => {});
        await page.waitForTimeout(800);
        const storeAvailability = {};
        for (const s of skus) {
            const r = await page.evaluate(async (skuId) => {
                const res = await fetch(`/dt/api/stores?brandCode=bg&freeFormAddress=newYork&skuId=${skuId}&quantity=1`, { credentials: 'include' });
                let body = null; try { body = await res.json(); } catch {}
                // The API answers with a bare array; the site's Redux store is what wraps it in {data}.
                const data = Array.isArray(body) ? body : (body?.data || []);
                return { status: res.status, data, raw: body ? JSON.stringify(body).slice(0, 160) : null };
            }, s.id);
            const size = s.size?.name || 'OS';
            const ours = (r.data || []).filter(x => BUILDINGS.includes(x.storeId));
            const val = r.status !== 200 || !ours.length ? 'unknown'
                : ours.some(x => x.skuAvailability?.inventoryAvailable) ? 'in_stock' : 'out_of_stock';
            if (val === 'unknown') log(`    store-call ${s.id}: HTTP ${r.status}, buildings=${(r.data||[]).map(x=>x.storeId).join(',')||'none'} ${r.raw||''}`);
            if (storeAvailability[size] !== 'in_stock') storeAvailability[size] = val;
            await sleep(400);
        }
        const images = (pr.linkedData?.image || []).map(img);
        return {
            externalId: pr.id, handle, title: pr.name, brand: pr.designer?.name || pr.designer || '',
            price: variants[0]?.price || money(pr.linkedData?.offers?.price), compareAtPrice: null,
            description: String(pr.linkedData?.description || '').replace(/&nbsp;|%22/g, ' ').replace(/\s+/g, ' ').trim(),
            productType: pr.hierarchy?.[0]?.level2 || '', tags: [], category: pr.hierarchy?.[0]?.level2 || 'Clothing',
            gender: /^men'?s\b/i.test(pr.name) ? 'Men' : 'Women',
            images: images.length ? images : [], sizes, styles: [...new Set(skus.map(s => s.color?.name).filter(Boolean))],
            variants, availability, storeAvailability, productUrl: `${BASE}/p/${handle}`,
        };
    } finally { await page.close(); }
}

// ── modes ─────────────────────────────────────────────────────────────────
async function catalog() {
    log('catalog: walking Get It Fast');
    // ?page= is 1-indexed — page=1 is the same as no param. 120 per page.
    const byId = new Map();
    let pages = 0;
    for (let pg = 1; pg <= 60; pg++) {
        const page = await open(`${LISTING}?page=${pg}`);
        const plp = await page.evaluate(() => window.store?.getState?.()?.productListPage || null).catch(() => null);
        await page.close();
        const list = plp?.products?.list || [];
        if (!list.length) break;
        const before = byId.size;
        for (const p of list) byId.set(p.id, fromListing(p));
        const added = byId.size - before;
        pages = pg;
        log(`  page ${pg}: ${list.length} (+${added} new, ${byId.size} total of ${plp?.products?.total ?? '?'})`);
        if (!added) { log('  page repeated — end of listing'); break; }
        if (limit && byId.size >= limit) break;
        const total = plp?.products?.total;
        if (total && byId.size >= total) break;
        await sleep(1500);
    }
    let all = [...byId.values()];
    if (limit) all = all.slice(0, limit);
    log(`  walked ${pages} page(s) → ${all.length} unique products`);
    for (let i = 0; i < all.length; i += 200) {
        const r = await post('ingestInventory', { storeId: STORE_ID, source: 'bergdorf', mode: 'catalog', products: all.slice(i, i + 200) });
        log(`  sent ${i + Math.min(200, all.length - i)}/${all.length} (written ${r.written})`);
    }
    log(`catalog done: ${all.length} products`);
}

async function refresh(targets) {
    // targets: [{handle}] — default: products shown in the app for this store
    if (!targets) {
        if (onlyHandle) targets = [{ handle: onlyHandle }];
        else targets = (await get('pendingChecks', { storeId: STORE_ID, wait: 0, all: 1 }).catch(() => ({ requests: [] }))).requests;
    }
    if (!targets.length) { log('refresh: nothing to refresh'); return; }
    if (limit) targets = targets.slice(0, limit);
    log(`refresh: ${targets.length} products`);
    const out = [];
    for (const t of targets) {
        try { out.push(await productDetail(t.handle)); log(`  ✓ ${t.handle} ${JSON.stringify(out.at(-1).storeAvailability)}`); }
        catch (e) { log(`  ✗ ${t.handle}: ${e.message}`); }
        if (out.length && out.length % 25 === 0) { await post('ingestInventory', { storeId: STORE_ID, source: 'bergdorf', mode: 'refresh', products: out.splice(0) }); }
        await sleep(800);
    }
    if (out.length) await post('ingestInventory', { storeId: STORE_ID, source: 'bergdorf', mode: 'refresh', products: out });
    log('refresh done');
}

async function serve() {
    log(`serve: store ${STORE_ID}, buildings ${BUILDINGS.join(' + ')}`);
    let lastRun = '';
    const tick = async () => {
        const hhmm = new Date().toTimeString().slice(0, 5);
        for (const [at, job] of [['03:00', 'catalog'], ['10:30', 'refresh'], ['15:00', 'refresh']]) {
            const key = new Date().toDateString() + at;
            if (hhmm === at && lastRun !== key) { lastRun = key; try { job === 'catalog' ? await catalog() : await refreshShown(); } catch (e) { log(`${job} failed: ${e.message}`); } }
        }
    };
    setInterval(tick, 30000);
    // Anything shown in the app without sizes gets filled in promptly — clicking
    // Show in the portal is the signal to go read that product properly.
    let lastFill = 0;
    for (;;) {
        try {
            const { requests } = await get('pendingChecks', { storeId: STORE_ID, wait: 25 });
            if (requests.length) { log(`live: ${requests.length} check(s)`); await refresh(requests); continue; }
            if (Date.now() - lastFill > 60000) {
                lastFill = Date.now();
                const missing = await needingDetail().catch(() => []);
                if (missing.length) { log(`fill: ${missing.length} shown product(s) missing sizes`); await refresh(missing.slice(0, 20)); }
            }
        } catch (e) { log(`poll: ${e.message}`); await sleep(5000); }
    }
}
// products currently shown in the app — the backend tells us via a refresh-all request
async function refreshShown() {
    const { requests } = await get('pendingChecks', { storeId: STORE_ID, wait: 0, all: 1 });
    await refresh(requests);
}

// Products the backend knows about that still have no sizes — the listing page
// doesn't carry them, only each product's own page does.
async function needingDetail(includeHidden = false) {
    const q = { storeId: STORE_ID, wait: 0, all: 1, unsized: 1 };
    if (includeHidden) q.hidden = 1;
    const { requests } = await get('pendingChecks', q);
    return requests;
}

async function detail() {
    const targets = await needingDetail(argv.includes('--hidden'));
    if (!targets.length) { log('detail: everything already has sizes'); return; }
    log(`detail: ${targets.length} product(s) without sizes`);
    await refresh(targets);
}

try { if (mode === 'catalog') await catalog(); else if (mode === 'refresh') await refresh(); else if (mode === 'detail') await detail(); else await serve(); }
finally { if (mode !== 'serve') await ctx?.close(); }
