import { NextResponse } from "next/server";

const ZARA_CATEGORY_URL =
    "https://www.zara.com/us/en/category/2546081/products?ajax=true";

const toTitleCase = (s: string) =>
    s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const familyToCategory = (f: string) => {
    const s = (f || "").toUpperCase();
    if (["SHOE", "BOOT", "SANDAL", "SNEAKER", "HEEL", "FLAT"].some((x) => s.includes(x)))
        return "Shoes";
    if (["BAG", "PURSE", "WALLET", "CLUTCH", "TOTE", "BACKPACK"].some((x) => s.includes(x)))
        return "Accessories";
    if (["JEWEL", "SCARF", "BELT", "HAT", "SUNGLASS", "EARRING", "NECKLACE"].some((x) => s.includes(x)))
        return "Accessories";
    return "Clothing";
};

const buildImageUrl = (xm: any) => {
    if (!xm?.path || !xm?.name) return null;
    return `https://static.zara.net/photos//${xm.path}w/563/${xm.name}.jpg`;
};

export async function GET() {
    try {
        const res = await fetch(ZARA_CATEGORY_URL, {
            headers: {
                "Accept": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Zara API error: ${res.status}` },
                { status: 502 }
            );
        }

        const data = await res.json();
        const products: any[] = [];

        for (const group of data?.productGroups ?? []) {
            for (const el of group?.elements ?? []) {
                for (const cc of el?.commercialComponents ?? []) {
                    if (cc.type !== "Product" || products.length >= 30) continue;
                    const color = cc.detail?.colors?.[0];
                    const xm = color?.xmedia?.[0];
                    const image = buildImageUrl(xm);
                    if (!image || !cc.name) continue;

                    products.push({
                        externalId: String(cc.id),
                        title: toTitleCase(cc.name),
                        brand: "Zara",
                        price: cc.price / 100,
                        category: familyToCategory(cc.familyName ?? ""),
                        deliveryTime: "35 Mins",
                        description: `${toTitleCase(cc.familyName ?? "")} in ${color?.name ?? ""}`,
                        color: color?.name ?? "",
                        inStock: color?.availability === "in_stock",
                        images: [image],
                        source: "zara_new_in",
                    });

                    if (products.length >= 30) break;
                }
                if (products.length >= 30) break;
            }
            if (products.length >= 30) break;
        }

        return NextResponse.json({ products, count: products.length });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}
