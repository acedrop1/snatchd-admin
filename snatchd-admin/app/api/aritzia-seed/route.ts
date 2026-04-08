import { NextResponse } from "next/server";

// ── Algolia config (from Aritzia's public page config) ─────────────────────────
const ALGOLIA_APP_ID  = "SONLJM8OH6";
const ALGOLIA_API_KEY = "1455bca7c6c33e746a0f38beb28422e6";
const INDEX_BASE      = "production_ecommerce_aritzia__Aritzia_US";

// ── Category mapping from product type string ─────────────────────────────────
function mapCategory(raw: string): string {
    const s = (raw || "").toLowerCase();
    if (s.includes("dress"))                        return "Dresses";
    if (s.includes("top") || s.includes("blouse") || s.includes("shirt") || s.includes("tee")) return "Tops";
    if (s.includes("pant") || s.includes("trouser") || s.includes("legging")) return "Pants";
    if (s.includes("jacket") || s.includes("coat") || s.includes("blazer") || s.includes("outerwear")) return "Jackets";
    if (s.includes("skirt"))                        return "Skirts";
    if (s.includes("short"))                        return "Shorts";
    if (s.includes("sweater") || s.includes("knit") || s.includes("cardigan")) return "Knitwear";
    if (s.includes("bag") || s.includes("tote") || s.includes("purse") || s.includes("clutch")) return "Bags";
    if (s.includes("shoe") || s.includes("sandal") || s.includes("boot") || s.includes("heel") || s.includes("flat")) return "Shoes";
    if (s.includes("accessory") || s.includes("accessories") || s.includes("hat") || s.includes("scarf") || s.includes("belt")) return "Accessories";
    if (s.includes("bodysuit"))                     return "Bodysuits";
    if (s.includes("jumpsuit") || s.includes("romper")) return "Jumpsuits";
    if (s.includes("swim"))                         return "Swimwear";
    return "Clothing";
}

// ── Default sizes for Aritzia ────────────────────────────────────────────────
function getDefaultSizes(category: string): string[] {
    if (["Bags", "Accessories"].includes(category)) return ["OS"];
    if (["Shoes"].includes(category))               return ["6", "7", "8", "9", "10", "11"];
    return ["XXS", "XS", "S", "M", "L", "XL"];
}

// ── Query Algolia (server-side, no CORS restriction) ─────────────────────────
async function queryAlgolia(indexName: string, categoryId: string, hitsPerPage = 100, page = 0) {
    const url = `https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${encodeURIComponent(indexName)}/query`;
    const body = {
        query: "",
        filters: `categoryPageId:"${categoryId}"`,
        hitsPerPage,
        page,
        attributesToRetrieve: [
            "name", "displayName", "masterId", "pid", "productId",
            "price", "defaultVariantPrice",
            "defaultColorSwatchURL", "image", "images", "swatchImages",
            "productType", "categoryPageId", "categoryIds",
            "available", "inStock", "availability",
            "colorName", "sizes", "sizeNames",
            "productUrl", "url", "pdpUrl",
            "brand",
        ],
    };

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "X-Algolia-Application-Id": ALGOLIA_APP_ID,
            "X-Algolia-API-Key": ALGOLIA_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    return res.json();
}

// ── Map an Algolia hit → Snatchd product ──────────────────────────────────────
function hitToProduct(hit: any) {
    const rawCategory = hit.productType || hit.categoryPageId || "";
    const category    = mapCategory(rawCategory);

    // Best available image
    const imageURL =
        hit.defaultColorSwatchURL ||
        hit.swatchImages?.[0] ||
        hit.images?.[0]?.url ||
        hit.image ||
        "";

    const images = [
        hit.defaultColorSwatchURL,
        ...(hit.swatchImages || []),
        ...(hit.images || []).map((i: any) => i?.url || i),
    ].filter(Boolean).slice(0, 5);

    // Price: Algolia can nest price differently per currency
    const rawPrice =
        hit.price?.USD ||
        hit.defaultVariantPrice?.USD ||
        hit.price?.value ||
        hit.price ||
        0;
    const price = typeof rawPrice === "object" ? (rawPrice.default || rawPrice.min || 0) : Number(rawPrice);

    const externalId = hit.masterId || hit.pid || hit.productId || hit.objectID || "";
    const title      = hit.displayName || hit.name || externalId;
    const productUrl = hit.pdpUrl || hit.productUrl || hit.url
        ? `https://www.aritzia.com${hit.pdpUrl || hit.productUrl || hit.url || ""}`
        : `https://www.aritzia.com/us/en/product/${externalId}`;

    const sizes = hit.sizeNames || hit.sizes || getDefaultSizes(category);

    return {
        externalId,
        title,
        price,
        category,
        brand: "Aritzia",
        gender: "Women",
        sizes: Array.isArray(sizes) ? sizes : [sizes],
        description: "",
        imageURL,
        images,
        inStock: hit.available !== false && hit.inStock !== false,
        isRemoteImage: !!imageURL,
        productUrl,
    };
}

// ── Fallback: scrape SFCC category page HTML ──────────────────────────────────
async function scrapeSFCC(categoryId = "new", sz = 96): Promise<any[]> {
    const url = `https://www.aritzia.com/on/demandware.store/Sites-Aritzia_US-Site/en_US/Search-Show?cgid=${categoryId}&sz=${sz}&format=ajax`;
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const products: any[] = [];
    const seen = new Set<string>();

    // Extract data-pid tiles
    const tileRe = /data-pid="([A-Z0-9_-]+)"/gi;
    const nameRe  = /class="[^"]*(?:product-name|link)[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i;
    const priceRe = /class="[^"]*(?:sales|price-standard|regular-price)[^"]*"[^>]*>[\s\S]*?\$\s*([\d,]+\.?\d*)/i;
    const imgRe   = /data-src="([^"]*assets\.aritzia\.com[^"]+\.jpg[^"]*)".*?data-pid="|<img[^>]+src="([^"]*assets\.aritzia\.com[^"]+)"/i;

    let m: RegExpExecArray | null;
    while ((m = tileRe.exec(html)) !== null) {
        const pid = m[1];
        if (seen.has(pid) || /^\d{1,3}$/.test(pid)) continue;
        seen.add(pid);

        const start  = Math.max(0, m.index - 200);
        const end    = Math.min(html.length, m.index + 2000);
        const block  = html.substring(start, end);

        const nameMatch  = block.match(nameRe);
        const priceMatch = block.match(priceRe);
        const imgMatch   = block.match(imgRe);

        const title    = nameMatch?.[1]?.trim() || pid;
        const price    = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : 0;
        const imageURL = imgMatch?.[1] || imgMatch?.[2] || "";
        const category = mapCategory(pid);

        products.push({
            externalId: pid,
            title,
            price,
            category,
            brand: "Aritzia",
            gender: "Women",
            sizes: getDefaultSizes(category),
            description: "",
            imageURL,
            images: imageURL ? [imageURL] : [],
            inStock: true,
            isRemoteImage: !!imageURL,
            productUrl: `https://www.aritzia.com/us/en/product/${pid}`,
        });
    }

    return products;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET() {
    const indexVariants = [
        INDEX_BASE,
        `${INDEX_BASE}_price_asc`,
        `${INDEX_BASE}_price_desc`,
        `${INDEX_BASE}_newest`,
    ];

    // ── Try Algolia first ─────────────────────────────────────────────────────
    for (const indexName of indexVariants) {
        try {
            const data = await queryAlgolia(indexName, "new", 100, 0);

            if (data.status === 404 || data.message?.includes("does not exist")) continue;
            if (!Array.isArray(data.hits) || data.hits.length === 0)              continue;

            // Fetch additional pages if there are more results
            const allHits = [...data.hits];
            const totalPages = Math.ceil((data.nbHits || 0) / 100);
            for (let p = 1; p < Math.min(totalPages, 5); p++) {
                const more = await queryAlgolia(indexName, "new", 100, p);
                if (Array.isArray(more.hits)) allHits.push(...more.hits);
            }

            const products = allHits
                .map(hitToProduct)
                .filter(p => p.externalId && p.title);

            return NextResponse.json({
                source: "algolia",
                indexUsed: indexName,
                products,
                total: products.length,
            });
        } catch {
            continue;
        }
    }

    // ── Fallback: SFCC scrape ──────────────────────────────────────────────────
    try {
        const products = await scrapeSFCC("new", 96);
        if (products.length > 0) {
            return NextResponse.json({
                source: "sfcc",
                products,
                total: products.length,
            });
        }
    } catch (err: any) {
        return NextResponse.json({ error: `SFCC scrape failed: ${err.message}` }, { status: 500 });
    }

    return NextResponse.json({ error: "Could not fetch Aritzia products from any source." }, { status: 502 });
}
