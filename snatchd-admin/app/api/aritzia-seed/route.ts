import { NextResponse } from "next/server";

// ── Aritzia Seed — curated catalog (April 2026) ──────────────────────────────
// Aritzia is Cloudflare-protected end-to-end on the PDP/category HTML, so we
// can't scrape it from a Vercel/Firebase datacenter IP. Instead we keep a
// curated list of real product IDs + color IDs sourced from the live site,
// and build the full image gallery from the CDN pattern.
//
// The image CDN (assets.aritzia.com) is NOT Cloudflare-protected — it serves
// images publicly — so we can confidently generate `_on_a` / `_on_b` / `_on_c`
// / `_on_d` variants for every product and get the full gallery.
//
// To refresh: open a category page in your browser, use the extraction helper
// in ~/scripts/aritzia-pull.js (or copy the Algolia hits from DevTools), and
// append/replace entries below.
//
// `cdnBase` is the part of the URL BEFORE `_on_<letter>`. Example:
//   https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_77775_36527
// We tack on `_on_a`, `_on_b`, `_on_c`, `_on_d` to get front/back/detail shots.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SeedProduct {
  externalId: string;          // Aritzia product ID (also used for stock lookup)
  aritziaColorId: string;      // default color swatch ID
  title: string;
  price: number;
  category: string;
  sizes: string[];
  cdnBase: string;             // image URL up to but NOT including `_on_<letter>`
  productUrl: string;
}

const PRODUCTS: SeedProduct[] = [
  // ── Pants ──────────────────────────────────────────────────────────────────
  { externalId: "77775",  aritziaColorId: "36527", title: "The Effortless Pant™ - Crepette™", price: 148, category: "Pants", sizes: ["00","0","2","4","6","8","10","12","14","16"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_77775_36527",  productUrl: "https://www.aritzia.com/us/en/product/the-effortless-pant%E2%84%A2/77775.html" },
  { externalId: "118495", aritziaColorId: "18891", title: "The Lodge Pant™ - Crepette™",       price: 138, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_118495_18891", productUrl: "https://www.aritzia.com/us/en/product/the-lodge-pant%E2%84%A2/118495.html" },
  { externalId: "132573", aritziaColorId: "36948", title: "Seville Pant",                       price: 148, category: "Pants", sizes: ["0","2","4","6","8","10"],      cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_132573_36948", productUrl: "https://www.aritzia.com/us/en/product/seville-pant/132573.html" },
  { externalId: "132654", aritziaColorId: "36948", title: "Melina Pant",                        price: 128, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"],  cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_132654_36948", productUrl: "https://www.aritzia.com/us/en/product/melina-pant/132654.html" },
  { externalId: "131380", aritziaColorId: "36527", title: "The Alanis Pant™",                   price: 118, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"],  cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_131380_36527", productUrl: "https://www.aritzia.com/us/en/product/the-alanis-pant%E2%84%A2/131380.html" },
  { externalId: "131400", aritziaColorId: "36948", title: "The Alanis Pant™ - Linen",           price: 128, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"],  cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_131400_36948", productUrl: "https://www.aritzia.com/us/en/product/the-alanis-pant%E2%84%A2/131400.html" },
  { externalId: "130057", aritziaColorId: "36527", title: "Beaumont Pant",                      price: 118, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"],  cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_130057_36527", productUrl: "https://www.aritzia.com/us/en/product/beaumont-pant/130057.html" },
  { externalId: "130469", aritziaColorId: "36948", title: "Solis Pant",                         price: 108, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"],  cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_130469_36948", productUrl: "https://www.aritzia.com/us/en/product/solis-pant/130469.html" },
  { externalId: "129913", aritziaColorId: "11420", title: "Contour Knit Flare Pant",            price: 118, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"],  cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_129913_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-flare-pant/129913.html" },
  { externalId: "130034", aritziaColorId: "11420", title: "Contour Rib Cargo Pant",             price: 128, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"],  cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_130034_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-rib-cargo-pant/130034.html" },
  { externalId: "130749", aritziaColorId: "36948", title: "TNS Straight Pant",                  price: 108, category: "Pants", sizes: ["2XS","XS","S","M","L","XL"],  cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a06_130749_36948", productUrl: "https://www.aritzia.com/us/en/product/tns-straight-pant/130749.html" },

  // ── Tops ───────────────────────────────────────────────────────────────────
  { externalId: "115785", aritziaColorId: "1275",  title: "Wilfred Drapey Crew T-Shirt",         price: 55,  category: "Tops", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a01_115785_1275",  productUrl: "https://www.aritzia.com/us/en/product/wilfred-drapey-crew-t-shirt/115785.html" },
  { externalId: "127845", aritziaColorId: "1274",  title: "Le Fou Wilfred Wrap Blouse",          price: 88,  category: "Tops", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a01_127845_1274",  productUrl: "https://www.aritzia.com/us/en/product/le-fou-wilfred-wrap-blouse/127845.html" },
  { externalId: "125363", aritziaColorId: "1275",  title: "Loom Linen Larimer Tank",             price: 48,  category: "Tops", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a01_125363_1275",  productUrl: "https://www.aritzia.com/us/en/product/loom-linen-larimer-tank/125363.html" },
  { externalId: "120105", aritziaColorId: "11420", title: "Contour Knit Henley Top",             price: 78,  category: "Tops", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a01_120105_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-henley-top/120105.html" },
  { externalId: "132402", aritziaColorId: "1275",  title: "Loom Linen Henley Shirt",             price: 68,  category: "Tops", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a01_132402_1275",  productUrl: "https://www.aritzia.com/us/en/product/loom-linen-henley-shirt/132402.html" },
  { externalId: "126089", aritziaColorId: "11420", title: "Contour Rib Polo Shirt",              price: 78,  category: "Tops", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a01_126089_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-rib-polo-shirt/126089.html" },
  { externalId: "124566", aritziaColorId: "1275",  title: "Loom Linen Boxy T-Shirt",             price: 50,  category: "Tops", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a01_124566_1275",  productUrl: "https://www.aritzia.com/us/en/product/loom-linen-boxy-t-shirt/124566.html" },
  { externalId: "124945", aritziaColorId: "1275",  title: "Loom Linen Quay T-Shirt",             price: 50,  category: "Tops", sizes: ["2XS","XS","S","M","L"],      cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a01_124945_1275",  productUrl: "https://www.aritzia.com/us/en/product/loom-linen-quay-t-shirt/124945.html" },

  // ── Dresses ────────────────────────────────────────────────────────────────
  { externalId: "106955", aritziaColorId: "36948", title: "Melina Dress",                        price: 158, category: "Dresses", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a03_106955_36948", productUrl: "https://www.aritzia.com/us/en/product/melina-dress/106955.html" },
  { externalId: "129878", aritziaColorId: "11420", title: "Contour Knit Midi Dress",             price: 148, category: "Dresses", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a03_129878_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-midi-dress/129878.html" },
  { externalId: "131196", aritziaColorId: "11420", title: "Contour Knit Mini Dress",             price: 128, category: "Dresses", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a03_131196_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-mini-dress/131196.html" },

  // ── Jackets & Blazers ──────────────────────────────────────────────────────
  { externalId: "125490", aritziaColorId: "36527", title: "Wilfred Effortless Crepe Blazer",     price: 228, category: "Jackets",  sizes: ["2XS","XS","S","M","L","XL"],    cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a04_125490_36527", productUrl: "https://www.aritzia.com/us/en/product/wilfred-effortless-crepe-blazer/125490.html" },
  { externalId: "122424", aritziaColorId: "35421", title: "Standout Blazer",                     price: 248, category: "Blazers",  sizes: ["00","0","2","4","6","8","10"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a04_122424_35421", productUrl: "https://www.aritzia.com/us/en/product/standout-blazer/122424.html" },
  { externalId: "131692", aritziaColorId: "1275",  title: "Loom Linen Relaxed Jacket",           price: 178, category: "Jackets",  sizes: ["2XS","XS","S","M","L","XL"],    cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a04_131692_1275",  productUrl: "https://www.aritzia.com/us/en/product/loom-linen-relaxed-jacket/131692.html" },
  { externalId: "129548", aritziaColorId: "36948", title: "The Melina Jacket™",                  price: 198, category: "Jackets",  sizes: ["2XS","XS","S","M","L","XL"],    cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a04_129548_36948", productUrl: "https://www.aritzia.com/us/en/product/the-melina-jacket%E2%84%A2/129548.html" },
  { externalId: "132403", aritziaColorId: "11420", title: "Contour Knit Bomber",                 price: 168, category: "Jackets",  sizes: ["2XS","XS","S","M","L","XL"],    cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a04_132403_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-bomber/132403.html" },

  // ── Knitwear ───────────────────────────────────────────────────────────────
  { externalId: "128654", aritziaColorId: "36527", title: "Sunday Best Crew Sweater",            price: 128, category: "Knitwear", sizes: ["2XS","XS","S","M","L","XL"],    cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a07_128654_36527", productUrl: "https://www.aritzia.com/us/en/product/sunday-best-crew-sweater/128654.html" },
  { externalId: "130891", aritziaColorId: "11420", title: "Contour Knit Cardigan",               price: 138, category: "Knitwear", sizes: ["2XS","XS","S","M","L","XL"],    cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a07_130891_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-cardigan/130891.html" },
  { externalId: "131820", aritziaColorId: "11420", title: "Contour Knit Polo Sweater",           price: 118, category: "Knitwear", sizes: ["2XS","XS","S","M","L","XL"],    cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a07_131820_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-polo-sweater/131820.html" },

  // ── Shorts ─────────────────────────────────────────────────────────────────
  { externalId: "125003", aritziaColorId: "36524", title: "AirPlush Cotton™ Sail Short",         price: 58,  category: "Shorts", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a26_125003_36524", productUrl: "https://www.aritzia.com/us/en/product/airplush-cotton%E2%84%A2-sail-short/125003.html" },
  { externalId: "132801", aritziaColorId: "36527", title: "Effortless Crepe Short",              price: 88,  category: "Shorts", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a26_132801_36527", productUrl: "https://www.aritzia.com/us/en/product/effortless-crepe-short/132801.html" },
  { externalId: "131985", aritziaColorId: "1275",  title: "Loom Linen Bermuda Short",            price: 78,  category: "Shorts", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a26_131985_1275",  productUrl: "https://www.aritzia.com/us/en/product/loom-linen-bermuda-short/131985.html" },
  { externalId: "130902", aritziaColorId: "11420", title: "Contour Rib Bike Short",              price: 68,  category: "Shorts", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a26_130902_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-rib-bike-short/130902.html" },

  // ── Bodysuits & Jumpsuits ──────────────────────────────────────────────────
  { externalId: "132890", aritziaColorId: "11420", title: "Contour Knit Bodysuit",               price: 88,  category: "Bodysuits",  sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a05_132890_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-bodysuit/132890.html" },
  { externalId: "131402", aritziaColorId: "36527", title: "Effortless Crepe Jumpsuit",           price: 198, category: "Jumpsuits",  sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a05_131402_36527", productUrl: "https://www.aritzia.com/us/en/product/effortless-crepe-jumpsuit/131402.html" },

  // ── Skirts ─────────────────────────────────────────────────────────────────
  { externalId: "131867", aritziaColorId: "36948", title: "Seville Midi Skirt",                  price: 118, category: "Skirts", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a08_131867_36948", productUrl: "https://www.aritzia.com/us/en/product/seville-midi-skirt/131867.html" },
  { externalId: "131943", aritziaColorId: "36527", title: "Effortless Crepe Mini Skirt",         price: 88,  category: "Skirts", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a08_131943_36527", productUrl: "https://www.aritzia.com/us/en/product/effortless-crepe-mini-skirt/131943.html" },
  { externalId: "130212", aritziaColorId: "11420", title: "Contour Knit Midi Skirt",             price: 108, category: "Skirts", sizes: ["2XS","XS","S","M","L","XL"], cdnBase: "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/s26_a08_130212_11420", productUrl: "https://www.aritzia.com/us/en/product/contour-knit-midi-skirt/130212.html" },
];

// ── Shared fields applied to every product ─────────────────────────────────
const SHARED = {
  brand: "Aritzia",
  gender: "Women",
  description: "",           // enriched client-side from the PDP (JSON-LD)
  inStock: true,
  isRemoteImage: true,
};

// Aritzia PDP image suffixes — `_on_a` is the hero, `_on_b`/`_on_c`/`_on_d`
// are alt angles. Not every product has all four, but the CDN is forgiving:
// missing variants 404 silently and the iOS gallery skips them on load.
const GALLERY_SUFFIXES = ["_on_a", "_on_b", "_on_c", "_on_d"];

function buildGallery(cdnBase: string): string[] {
  return GALLERY_SUFFIXES.map((suffix) => `${cdnBase}${suffix}`);
}

export async function GET() {
  const products = PRODUCTS.map((p) => {
    const images = buildGallery(p.cdnBase);
    return {
      ...SHARED,
      externalId: p.externalId,
      aritziaProductId: p.externalId,
      aritziaColorId: p.aritziaColorId,
      aritziaSkuBySize: {} as Record<string, string>,
      title: p.title,
      price: p.price,
      category: p.category,
      sizes: p.sizes,
      imageURL: images[0],
      images,
      productUrl: p.productUrl,
    };
  });

  return NextResponse.json({
    products,
    total: products.length,
    note: "Descriptions and missing alt images are enriched client-side from the PDP.",
  });
}
