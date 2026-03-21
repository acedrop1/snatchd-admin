import { NextResponse } from "next/server";

// Skims uses Shopify — their public products.json endpoint returns up to 250 products per page
const SKIMS_URL = "https://skims.com/products.json?limit=250";

// ── Map Shopify product_type → Snatchd category ───────────────────────────────
function getCategory(productType: string, tags: string[], title: string): string {
    const all = [productType, ...tags, title].join(" ").toUpperCase();

    if (["BRA", "BRALETTE", "BODYSUIT"].some(x => all.includes(x))) return "Bras & Bodysuits";
    if (["UNDERWEAR", "THONG", "BRIEF", "BOYSHORT", "PANTY"].some(x => all.includes(x))) return "Underwear";
    if (["SHAPEWEAR", "SCULPT", "SHAPING", "SHORTS SCULPT"].some(x => all.includes(x))) return "Shapewear";
    if (["SWIM", "BIKINI", "ONE-PIECE", "COVERUP"].some(x => all.includes(x))) return "Swimwear";
    if (["LOUNGE", "PAJAMA", "PJ", "SLEEP", "SATIN"].some(x => all.includes(x))) return "Loungewear";
    if (["ACTIVEWEAR", "LEGGING", "SPORTS BRA", "BIKE SHORT"].some(x => all.includes(x))) return "Activewear";
    if (["DRESS", "SKIRT"].some(x => all.includes(x))) return "Dresses";
    if (["TOP", "TANK", "CAMISOLE", "CARDIGAN", "PULLOVER"].some(x => all.includes(x))) return "Tops";
    if (["PANT", "JEAN", "TROUSER", "SHORT"].some(x => all.includes(x))) return "Bottoms";
    if (["MATERNITY"].some(x => all.includes(x))) return "Maternity";
    if (["SOCK", "TIGHTS", "STOCKING"].some(x => all.includes(x))) return "Accessories";
    if (["MEN", "MENS"].some(x => all.includes(x))) return "Men's";

    return "Clothing";
}

// ── Extract gender from product metadata ─────────────────────────────────────
function getGender(productType: string, tags: string[], title: string): string {
    const all = [productType, ...tags, title].join(" ").toLowerCase();
    if (all.includes("men") && !all.includes("women")) return "Men";
    return "Women"; // Skims is primarily women's
}

// ── Extract unique size values from all variants ──────────────────────────────
function getSizes(variants: any[]): string[] {
    const sizeSet = new Set<string>();
    for (const v of variants) {
        // Shopify stores size as option1, option2, or option3
        for (const key of ["option1", "option2", "option3"]) {
            const val = v[key];
            if (!val) continue;
            // Only include size-like values — skip color names
            if (/^(XXS|XS|S|M|L|XL|XXL|2X|3X|4X|5X|[0-9]{1,2}[A-Z]{0,2})$/i.test(val.trim())) {
                sizeSet.add(val.trim().toUpperCase());
            }
        }
    }

    // Sort sizes in logical order
    const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2X", "3X", "4X", "5X"];
    const sorted = [...sizeSet].sort((a, b) => {
        const ai = sizeOrder.indexOf(a);
        const bi = sizeOrder.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
    });

    return sorted.length > 0 ? sorted : ["XS", "S", "M", "L", "XL"];
}

// ── Strip HTML tags from description ─────────────────────────────────────────
function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET() {
    try {
        const res = await fetch(SKIMS_URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "application/json",
            },
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Skims returned HTTP ${res.status}. Check if skims.com is accessible.` },
                { status: 502 }
            );
        }

        const data = await res.json();
        const raw: any[] = data?.products ?? [];

        if (raw.length === 0) {
            return NextResponse.json(
                { error: "No products returned from Skims. The Shopify endpoint may have changed." },
                { status: 422 }
            );
        }

        const products = raw
            .filter((p: any) => p.images?.length > 0 && p.variants?.length > 0)
            .map((p: any) => {
                const price = parseFloat(p.variants[0]?.price ?? "0");
                const images: string[] = p.images.slice(0, 4).map((img: any) => img.src);
                const imageURL = images[0] ?? "";
                const sizes = getSizes(p.variants);
                const category = getCategory(p.product_type, p.tags ?? [], p.title);
                const gender = getGender(p.product_type, p.tags ?? [], p.title);
                const rawDesc = p.body_html ? stripHtml(p.body_html) : "";
                const description = rawDesc.length > 300 ? rawDesc.slice(0, 300).trim() + "…" : rawDesc;

                return {
                    externalId: String(p.id),
                    title: p.title,
                    brand: "Skims",
                    price,
                    category,
                    gender,
                    sizes,
                    description,
                    deliveryTime: "40 Mins",
                    inStock: p.variants.some((v: any) => v.available),
                    imageURL,
                    images,
                    isRemoteImage: !!imageURL,
                };
            });

        return NextResponse.json({ products, count: products.length });

    } catch (err: any) {
        return NextResponse.json(
            { error: err.message ?? "Unknown error fetching Skims products." },
            { status: 500 }
        );
    }
}
