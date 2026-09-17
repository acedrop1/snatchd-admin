import { NextRequest, NextResponse } from "next/server";

// Live Skims catalog for the store "Live Inventory" tab. All parsing lives in
// the Cloud Function so the app, the scheduler and the portal share one
// implementation. Returns the same {products} shape the save flow expects,
// plus per-size `availability` from skims.com.
const FN = "https://us-central1-snatchd-app26.cloudfunctions.net/skimsCatalog";

export async function GET(req: NextRequest) {
    const collection = req.nextUrl.searchParams.get("collection") || "best-sellers";
    const limit = req.nextUrl.searchParams.get("limit") || "40";
    try {
        const res = await fetch(`${FN}?collection=${encodeURIComponent(collection)}&limit=${limit}`, {
            signal: AbortSignal.timeout(280_000),
            cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.error || `HTTP ${res.status}` }, { status: res.status });
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 502 });
    }
}
