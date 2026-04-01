import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

const ZARA_PAGE_URL  = "https://www.zara.com/us/en/woman-best-sellers-l5912.html?v1=2491343";
const ZARA_API_URL   = "https://www.zara.com/us/en/category/2491343/products?ajax=true";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

function extractCookieString(raw: string | null): string {
    if (!raw) return "";
    return raw
        .split(/,\s*(?=[^;]+=[^;]+;)/)
        .map((c) => c.split(";")[0].trim())
        .filter(Boolean)
        .join("; ");
}

const toTitleCase = (s: string) =>
    s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const familyToCategory = (f: string) => {
    const s = (f || "").toUpperCase();
    if (["SHOE", "BOOT", "SANDAL", "SNEAKER", "HEEL", "FLAT"].some((x) => s.includes(x))) return "Shoes";
    if (["BAG", "PURSE", "WALLET", "CLUTCH", "TOTE", "BACKPACK"].some((x) => s.includes(x))) return "Accessories";
    if (["JEWEL", "SCARF", "BELT", "HAT", "SUNGLASS", "EARRING", "NECKLACE"].some((x) => s.includes(x))) return "Accessories";
    return "Clothing";
};

const buildImageUrl = (xm: any) => {
    if (!xm?.path || !xm?.name) return null;
    return `https://static.zara.net/photos//${xm.path}w/563/${xm.name}.jpg`;
};

export async function POST() {
    try {
        // Step 1: Get session cookie from best sellers page
        const pageRes = await fetch(ZARA_PAGE_URL, {
            headers: {
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "no-cache",
            },
            redirect: "follow",
            next: { revalidate: 0 },
        });

        const cookieStr = extractCookieString(pageRes.headers.get("set-cookie"));

        // Step 2: Fetch best sellers JSON
        const apiHeaders: Record<string, string> = {
            "User-Agent": UA,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": ZARA_PAGE_URL,
            "Origin": "https://www.zara.com",
            "X-Requested-With": "XMLHttpRequest",
        };
        if (cookieStr) apiHeaders["Cookie"] = cookieStr;

        const apiRes = await fetch(ZARA_API_URL, { headers: apiHeaders, next: { revalidate: 0 } });

        if (!apiRes.ok) {
            return NextResponse.json(
                { error: `Zara API error: ${apiRes.status}`, hint: "Category ID may have changed or cookies failed." },
                { status: 502 }
            );
        }

        const data = await apiRes.json();
        const parsed: any[] = [];

        for (const group of data?.productGroups ?? []) {
            for (const el of group?.elements ?? []) {
                for (const cc of el?.commercialComponents ?? []) {
                    if (cc.type !== "Product" || parsed.length >= 40) continue;
                    const color = cc.detail?.colors?.[0];
                    const xm = color?.xmedia?.[0];
                    const image = buildImageUrl(xm);
                    if (!image || !cc.name) continue;

                    parsed.push({
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
                        source: "zara_best_sellers",
                        storeId: "zara_soho", // links to Zara SoHo store
                    });
                }
            }
        }

        if (parsed.length === 0) {
            return NextResponse.json({ error: "No products found — Zara may have changed their API structure." }, { status: 404 });
        }

        // Step 3: Upsert into Firestore (match on externalId to avoid duplicates)
        const productsRef = collection(db, "products");
        let added = 0;
        let updated = 0;

        for (const p of parsed) {
            const existing = await getDocs(query(productsRef, where("externalId", "==", p.externalId)));
            if (existing.empty) {
                await addDoc(productsRef, { ...p, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                added++;
            } else {
                await updateDoc(doc(db, "products", existing.docs[0].id), {
                    ...p,
                    updatedAt: serverTimestamp(),
                });
                updated++;
            }
        }

        return NextResponse.json({ success: true, added, updated, total: parsed.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
    }
}
