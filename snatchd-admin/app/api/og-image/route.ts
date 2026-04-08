import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/og-image?url=<product_url>
 *
 * Extracts the og:image from a product page.
 * Uses Microlink API as primary (bypasses Cloudflare/bot protection),
 * falls back to direct HTML fetch.
 */
export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing url param" }, { status: 400 });

    // ── 1. Try Microlink (handles JS-rendered pages & Cloudflare) ─────────────
    try {
        const mlRes = await fetch(
            `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=false&video=false&audio=false`,
            { signal: AbortSignal.timeout(10000) }
        );
        if (mlRes.ok) {
            const ml = await mlRes.json();
            const imageUrl = ml?.data?.image?.url || ml?.data?.logo?.url || null;
            if (imageUrl) return NextResponse.json({ imageUrl });
        }
    } catch { /* fall through */ }

    // ── 2. Direct HTML fetch fallback ─────────────────────────────────────────
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
            const reader = res.body?.getReader();
            let html = "";
            let bytes = 0;
            if (reader) {
                const decoder = new TextDecoder();
                while (bytes < 60_000) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    html += decoder.decode(value, { stream: true });
                    bytes += value?.length ?? 0;
                    if (html.includes("</head>")) break;
                }
                reader.cancel();
            }

            const ogMatch =
                html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
            const twMatch =
                html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

            const imageUrl = ogMatch?.[1] || twMatch?.[1] || null;
            if (imageUrl) return NextResponse.json({ imageUrl });
        }
    } catch { /* fall through */ }

    return NextResponse.json({ error: "No image found" }, { status: 404 });
}
