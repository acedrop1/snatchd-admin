import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/og-image?url=<product_url>
 *
 * Returns { imageUrl, images[] } — primary image + all product images found.
 * Uses Microlink first (bypasses Cloudflare), falls back to direct HTML parse.
 */
export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing url param" }, { status: 400 });

    // ── 1. Try Microlink ──────────────────────────────────────────────────────
    try {
        const mlRes = await fetch(
            `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=false&video=false&audio=false`,
            { signal: AbortSignal.timeout(10000) }
        );
        if (mlRes.ok) {
            const ml = await mlRes.json();
            const imageUrl = ml?.data?.image?.url || ml?.data?.logo?.url || null;
            if (imageUrl) {
                return NextResponse.json({ imageUrl, images: [imageUrl] });
            }
        }
    } catch { /* fall through */ }

    // ── 2. Direct HTML fetch — extract ALL product images ────────────────────
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
            // Read full page — product images are often in JSON-LD or body img tags
            const reader = res.body?.getReader();
            let html = "";
            let bytes = 0;
            if (reader) {
                const decoder = new TextDecoder();
                while (bytes < 200_000) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    html += decoder.decode(value, { stream: true });
                    bytes += value?.length ?? 0;
                }
                reader.cancel();
            }

            const allImages: string[] = [];

            // a) JSON-LD Product schema — most reliable source for all images
            const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
            for (const match of jsonLdMatches) {
                try {
                    const data = JSON.parse(match[1]);
                    const items = Array.isArray(data) ? data : [data];
                    for (const item of items) {
                        if (item["@type"] === "Product" || item.image) {
                            const imgs = Array.isArray(item.image) ? item.image : [item.image];
                            imgs.forEach((img: any) => {
                                const u = typeof img === "string" ? img : img?.url;
                                if (u && u.startsWith("http")) allImages.push(u);
                            });
                        }
                    }
                } catch { /* skip malformed */ }
            }

            // b) og:image / twitter:image meta tags
            const ogMatches = html.matchAll(/<meta[^>]+(?:property=["']og:image["']|name=["']twitter:image["'])[^>]+content=["']([^"']+)["']/gi);
            for (const m of ogMatches) if (m[1]?.startsWith("http")) allImages.push(m[1]);

            const ogMatches2 = html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property=["']og:image["']|name=["']twitter:image["'])/gi);
            for (const m of ogMatches2) if (m[1]?.startsWith("http")) allImages.push(m[1]);

            // c) <img> tags with product-image-like src (CDN URLs, not icons/logos)
            if (allImages.length < 2) {
                const imgMatches = html.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|webp)(\?[^"']*)?)[^>]*>/gi);
                for (const m of imgMatches) {
                    const src = m[1];
                    // Skip tiny images (tracking pixels, icons) by filtering suspicious paths
                    if (!/icon|logo|sprite|pixel|badge|flag|thumb\.gif/i.test(src)) {
                        allImages.push(src);
                    }
                }
            }

            // Deduplicate and return
            const unique = [...new Set(allImages)].filter(Boolean);
            if (unique.length > 0) {
                return NextResponse.json({ imageUrl: unique[0], images: unique.slice(0, 10) });
            }
        }
    } catch { /* fall through */ }

    return NextResponse.json({ error: "No image found" }, { status: 404 });
}
