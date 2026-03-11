import { NextResponse } from "next/server";

const SKIMS_URL = "https://skims.com/products.json?limit=30";

const toTitleCase = (s: string) =>
    s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const typeToCategory = (productType: string, tags: string[]): string => {
    const t = (productType || "").toUpperCase();
    const allTags = tags.join(" ").toUpperCase();
    if (["SHOE", "BOOT", "SNEAKER", "SANDAL", "HEEL"].some((x) => t.includes(x) || allTags.includes(x)))
        return "Shoes";
    if (["BAG", "TOTE", "WALLET", "CLUTCH"].some((x) => t.includes(x) || allTags.includes(x)))
        return "Accessories";
    if (["SOCK", "ACCESSORY", "ACCESSORIES", "MASK"].some((x) => t.includes(x) || allTags.includes(x)))
        return "Accessories";
    return "Clothing";
};

export async function GET() {
    try {
        const res = await fetch(SKIMS_URL, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "application/json",
            },
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Skims API error: ${res.status}` },
                { status: 502 }
            );
        }

        const data = await res.json();
        const raw: any[] = data?.products ?? [];

        const products = raw
            .filter((p: any) => p.images?.length > 0 && p.variants?.length > 0)
            .slice(0, 30)
            .map((p: any) => {
                const price = parseFloat(p.variants[0]?.price ?? "0");
                const image = p.images[0]?.src ?? "";
                const images = p.images.slice(0, 3).map((img: any) => img.src);

                return {
                    externalId: String(p.id),
                    title: toTitleCase(p.title),
                    brand: "Skims",
                    price,
                    category: typeToCategory(p.product_type, p.tags ?? []),
                    deliveryTime: "40 Mins",
                    description: p.body_html
                        ? p.body_html.replace(/<[^>]+>/g, "").slice(0, 120).trim()
                        : toTitleCase(p.product_type || ""),
                    color: "",
                    inStock: p.variants.some((v: any) => v.available),
                    images,
                    source: "skims_shopify",
                };
            });

        return NextResponse.json({ products, count: products.length });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}
