import { NextResponse } from 'next/server';

// DEPRECATED: Apify sync has been removed.
// Inventory is now managed directly via the Live Inventory tab in each store's detail page.
// Use /api/jacquemus-live or the static seed endpoints instead.

export async function POST(req: Request) {
    return NextResponse.json(
        { error: "This endpoint has been deprecated. Use the Live Inventory tab in each store to sync products." },
        { status: 410 }
    );
}

// Keep for legacy reference — unused
async function _legacyPost(req: Request) {
    try {
        const { storeId, externalId, skus } = await req.json();

        return NextResponse.json({
            success: false,
            error: "This endpoint is deprecated. Please use the Cloud Function 'checkStock' for real-time availability.",
            message: "The sync logic has been replaced with on-demand stock checks to avoid rate limits and provide per-store accuracy."
        }, { status: 410 }); // 410 Gone

    } catch (error) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: "Endpoint deprecated" }, { status: 410 });
    }
}
