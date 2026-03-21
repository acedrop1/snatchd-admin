import { NextRequest, NextResponse } from "next/server";

// ── Category mapping from Jacquemus PID prefix ────────────────────────────────
// PIDs are like: DRW2401-001-100 (DRW = Dress Women)
function getCategoryFromPid(pid: string): string {
    const raw = pid.toUpperCase();

    if (raw.startsWith("DRW")) return "Dresses";
    if (raw.startsWith("TOW")) return "Tops";
    if (raw.startsWith("SKW")) return "Skirts";
    if (raw.startsWith("JAW") || raw.startsWith("BLW") || raw.startsWith("BCW")) return "Jackets";
    if (raw.startsWith("PAW")) return "Pants";
    if (raw.startsWith("SHW")) return "Shorts";
    if (raw.startsWith("SWW") || raw.startsWith("SBW")) return "Swimwear";
    if (raw.startsWith("BAW") || raw.startsWith("BAU") || raw.startsWith("BPW") || raw.startsWith("BTW")) return "Bags";
    if (raw.startsWith("FOW") || raw.startsWith("FOU") || raw.startsWith("MUL")) return "Shoes";
    if (raw.startsWith("JWW") || raw.startsWith("EYW") || raw.startsWith("EYU") || raw.startsWith("ACU") || raw.startsWith("ACW") || raw.startsWith("HAW") || raw.startsWith("SCW")) return "Accessories";

    return "Clothing";
}

// ── Default sizes by category ─────────────────────────────────────────────────
function getDefaultSizes(category: string): string[] {
    switch (category) {
        case "Shoes":
            return ["35", "36", "37", "38", "39", "40", "41", "42"];
        case "Bags":
            return ["OS"];
        case "Accessories":
            return ["OS"];
        case "Swimwear":
            return ["34", "36", "38", "40", "42"];
        default:
            // Dresses, Tops, Skirts, Jackets, Pants, Shorts, Clothing
            return ["32", "34", "36", "38", "40", "42", "44"];
    }
}

// ── Clean up a price string like "$390.00" → 390 ─────────────────────────────
function parsePrice(raw: string): number {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
}

// ── Strip HTML tags ───────────────────────────────────────────────────────────
function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ── Parse products from Jacquemus listing page HTML ───────────────────────────
function parseListingHtml(html: string): any[] {
    const products: any[] = [];
    const seen = new Set<string>();

    // ── Strategy 1: data-pid product tiles ───────────────────────────────────
    // SFCC renders product tiles as elements with data-pid="..." attributes.
    // We extract pid, then find title/price/image within each tile block.
    const tileRegex = /data-pid="([A-Z0-9_\-]+)"([^>]*)>([\s\S]*?)(?=data-pid="|<\/body|<footer)/gi;
    let m: RegExpExecArray | null;

    while ((m = tileRegex.exec(html)) !== null) {
        const pid = m[1].trim();
        const block = m[3];

        if (!pid || pid.length < 3 || seen.has(pid)) continue;
        seen.add(pid);

        // Skip obviously non-product PIDs
        if (/^\d+$/.test(pid)) continue;

        // ── Title ─────────────────────────────────────────────────────────
        let title = "";
        const titlePatterns = [
            /class="[^"]*(?:product-name|tile-body__name|product-tile__name|pdp-link__product-name|item-name)[^"]*"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i,
            /class="[^"]*(?:product-name|tile-body__name|product-tile__name)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|span|h[1-6]|div)>/i,
            /aria-label="([^"]+)"/i,
        ];
        for (const pattern of titlePatterns) {
            const match = block.match(pattern);
            if (match) { title = stripHtml(match[1]); break; }
        }

        // ── Price ─────────────────────────────────────────────────────────
        let price = 0;
        const pricePatterns = [
            /class="[^"]*(?:price__sales|price-container|sales|product-price|formatted-price)[^"]*"[^>]*>[\s\S]*?(\$[\d,]+(?:\.\d{2})?)/i,
            /(\$[\d,]+(?:\.\d{2})?)/,
        ];
        for (const pattern of pricePatterns) {
            const match = block.match(pattern);
            if (match) { price = parsePrice(match[1]); break; }
        }

        // ── Image ─────────────────────────────────────────────────────────
        let imageUrl = "";
        const imgPatterns = [
            /data-src="([^"]+(?:jacquemus\.com|cloudinary|imgix|scene7|hybris)[^"]*)"/i,
            /src="([^"]+(?:jacquemus\.com|cloudinary|imgix|scene7|hybris)[^"]*\.(?:jpg|jpeg|webp|png)[^"]*)"/i,
            /src="(\/on\/demandware[^"]+\.(?:jpg|jpeg|webp|png)[^"]*)"/i,
        ];
        for (const pattern of imgPatterns) {
            const match = block.match(pattern);
            if (match) {
                imageUrl = match[1].startsWith("http") ? match[1] : `https://www.jacquemus.com${match[1]}`;
                // Remove existing query params and add sizing
                imageUrl = imageUrl.split("?")[0] + "?sw=600&sh=600&sm=fit";
                break;
            }
        }

        // ── Product URL ───────────────────────────────────────────────────
        let productUrl = "";
        const urlMatch = block.match(/href="(\/en_us\/[^"]+\.html[^"]*)"/i);
        if (urlMatch) {
            productUrl = `https://www.jacquemus.com${urlMatch[1]}`;
        }

        const category = getCategoryFromPid(pid);

        products.push({
            externalId: pid,
            title: title || pid,
            price,
            category,
            brand: "Jacquemus",
            gender: "Women",
            sizes: getDefaultSizes(category),
            description: "",
            imageURL: imageUrl,
            images: imageUrl ? [imageUrl] : [],
            inStock: true,
            isRemoteImage: !!imageUrl,
            productUrl,
        });
    }

    // ── Strategy 2: embedded JSON (SFCC pageContext / product data) ───────────
    if (products.length === 0) {
        // Some SFCC pages embed product JSON in a script tag
        const jsonPatterns = [
            /"hits"\s*:\s*(\[[\s\S]*?\])\s*,\s*"(?:total|count|numberOfResults)"/,
            /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
            /dataLayer\.push\((\{[\s\S]*?\})\)/,
        ];

        for (const pattern of jsonPatterns) {
            const match = html.match(pattern);
            if (!match) continue;

            try {
                const data = JSON.parse(match[1]);
                const hits: any[] = Array.isArray(data) ? data : (data.products || data.hits || []);

                for (const hit of hits) {
                    const pid = hit.productId || hit.pid || hit.id || "";
                    if (!pid || seen.has(pid)) continue;
                    seen.add(pid);

                    const category = getCategoryFromPid(pid);
                    products.push({
                        externalId: pid,
                        title: hit.productName || hit.name || hit.title || pid,
                        price: hit.price?.sales?.value || hit.listPrice || hit.price || 0,
                        category,
                        brand: "Jacquemus",
                        gender: "Women",
                        sizes: getDefaultSizes(category),
                        description: "",
                        imageURL: hit.images?.small?.[0]?.url || hit.image || "",
                        images: [hit.images?.small?.[0]?.url || hit.image || ""].filter(Boolean),
                        inStock: hit.available !== false,
                        isRemoteImage: !!(hit.images?.small?.[0]?.url || hit.image),
                        productUrl: hit.selectedProductUrl || "",
                    });
                }
                if (products.length > 0) break;
            } catch {
                // JSON parse failed, continue to next strategy
            }
        }
    }

    return products;
}

// ── Fetch sizes from a product detail page ────────────────────────────────────
async function fetchProductSizes(productUrl: string, category: string): Promise<string[]> {
    if (!productUrl) return getDefaultSizes(category);

    try {
        const res = await fetch(productUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return getDefaultSizes(category);
        const html = await res.text();

        // SFCC size buttons often have data-attr-value or class containing the size
        const sizes: string[] = [];

        // Pattern: <button ... data-attr-value="36" ...>
        const attrValueRegex = /data-attr-value="([^"]+)"/gi;
        let m: RegExpExecArray | null;
        while ((m = attrValueRegex.exec(html)) !== null) {
            const val = m[1].trim();
            // Only include size-like values (numeric EU sizes or letter sizes)
            if (/^(XS|S|M|L|XL|XXL|[0-9]{2,3}|OS|ONE SIZE|TU)$/i.test(val)) {
                if (!sizes.includes(val)) sizes.push(val);
            }
        }

        // Pattern: variation-value="36"
        if (sizes.length === 0) {
            const varRegex = /variation-value="([^"]+)"/gi;
            while ((m = varRegex.exec(html)) !== null) {
                const val = m[1].trim();
                if (/^(XS|S|M|L|XL|XXL|[0-9]{2,3}|OS|ONE SIZE|TU)$/i.test(val)) {
                    if (!sizes.includes(val)) sizes.push(val);
                }
            }
        }

        return sizes.length > 0 ? sizes : getDefaultSizes(category);
    } catch {
        return getDefaultSizes(category);
    }
}

// ── Main GET handler ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url") || "https://www.jacquemus.com/en_us/women-newness-view-all?start=0&sz=200";
    const fetchSizes = searchParams.get("fetchSizes") === "true";
    const maxProducts = parseInt(searchParams.get("max") || "200", 10);

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Cache-Control": "max-age=0",
                "Referer": "https://www.jacquemus.com/",
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Jacquemus returned HTTP ${response.status}. The site may be blocking server-side requests. Try using the static seed data instead.` },
                { status: 502 }
            );
        }

        const html = await response.text();

        // Check for Cloudflare challenge
        if (html.includes("challenge-platform") || html.includes("cf-browser-verification") || html.includes("Just a moment")) {
            return NextResponse.json(
                { error: "Cloudflare bot protection detected. Use the static seed data to populate Jacquemus products." },
                { status: 503 }
            );
        }

        let products = parseListingHtml(html);
        products = products.slice(0, maxProducts);

        if (products.length === 0) {
            return NextResponse.json(
                { error: "No products could be parsed from the page. The HTML structure may have changed.", html_length: html.length },
                { status: 422 }
            );
        }

        // Optionally fetch real sizes from each product detail page (slower, ~1s per product)
        if (fetchSizes) {
            const sizeResults = await Promise.allSettled(
                products.slice(0, 20).map(async (p) => {
                    if (!p.productUrl) return p;
                    const sizes = await fetchProductSizes(p.productUrl, p.category);
                    return { ...p, sizes };
                })
            );
            products = [
                ...sizeResults.map((r, i) => r.status === "fulfilled" ? r.value : products[i]),
                ...products.slice(20),
            ];
        }

        return NextResponse.json({
            products,
            count: products.length,
            sourceUrl: url,
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Unknown error while fetching Jacquemus products." },
            { status: 500 }
        );
    }
}
