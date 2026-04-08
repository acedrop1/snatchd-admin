import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/og-image?url=<product_url>
 *
 * Fetches the product page and extracts the og:image (or twitter:image) meta tag.
 * Used to auto-fill missing product images when uploading a CSV.
 */
export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing url param" }, { status: 400 });

    try {
        const res = await fetch(url, {
            headers: {
                // Mimic a real browser to avoid bot-blocking
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "no-cache",
            },
            // Only read the first 50KB — og:image is always in the <head>
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 });
        }

        // Stream only the first 50KB to keep it fast
        const reader = res.body?.getReader();
        let html = "";
        let bytes = 0;
        if (reader) {
            const decoder = new TextDecoder();
            while (bytes < 50_000) {
                const { done, value } = await reader.read();
                if (done) break;
                html += decoder.decode(value, { stream: true });
                bytes += value?.length ?? 0;
                // Stop once we've passed </head>
                if (html.includes("</head>")) break;
            }
            reader.cancel();
        }

        // Extract og:image
        const ogMatch =
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

        // Fallback: twitter:image
        const twMatch =
            html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

        const imageUrl = ogMatch?.[1] || twMatch?.[1] || null;

        if (!imageUrl) {
            return NextResponse.json({ error: "No og:image found" }, { status: 404 });
        }

        return NextResponse.json({ imageUrl });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Fetch failed" }, { status: 502 });
    }
}
