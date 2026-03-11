import { NextResponse } from "next/server";

const ZARA_PAGE_URL = "https://www.zara.com/us/en/woman-new-in-l1180.html";
const ZARA_CATEGORY_URL =
    "https://www.zara.com/us/en/category/2546081/products?ajax=true";

const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

/** Parse raw Set-Cookie header string(s) into a single Cookie: header value */
function extractCookieString(raw: string | null): string {
    if (!raw) return "";
    // Multiple set-cookie values come back as a single string split by ", " before the next directive
    // Each cookie entry looks like: "name=value; Path=/; ..."
    // We want just the name=value pairs
    return raw
        .split(/,\s*(?=[^;]+=[^;]+;)/) // split on ", " that starts a new cookie
        .map((c) => c.split(";")[0].trim())
        .filter(Boolean)
        .join("; ");
}

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
        // ── Step 1: Visit the Zara category page to get a session cookie ─────
        const pageRes = await fetch(ZARA_PAGE_URL, {
            headers: {
                "User-Agent": UA,
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
            },
            redirect: "follow",
            next: { revalidate: 0 },
        });

        // Collect all Set-Cookie headers (Node fetch combines them)
        const rawCookies = pageRes.headers.get("set-cookie");
        const cookieStr = extractCookieString(rawCookies);

        // ── Step 2: Call the AJAX category endpoint with the session cookie ──
        const apiHeaders: Record<string, string> = {
            "User-Agent": UA,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": ZARA_PAGE_URL,
            "Origin": "https://www.zara.com",
            "X-Requested-With": "XMLHttpRequest",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
        };
        if (cookieStr) apiHeaders["Cookie"] = cookieStr;

        const apiRes = await fetch(ZARA_CATEGORY_URL, {
            headers: apiHeaders,
            next: { revalidate: 0 },
        });

        if (!apiRes.ok) {
            return NextResponse.json(
                {
                    error: `Zara API error: ${apiRes.status}`,
                    hint: "Zara may have changed their auth flow. Check the cookie step.",
                    cookieObtained: !!cookieStr,
                },
                { status: 502 }
            );
        }

        const data = await apiRes.json();
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
