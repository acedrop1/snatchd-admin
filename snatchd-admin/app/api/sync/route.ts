import { NextResponse } from 'next/server';

// DEPRECATED: This endpoint is being replaced by Cloud Function for real-time stock checks
// The new architecture uses:
// 1. Apify for daily catalog discovery (product IDs, names, images)
// 2. Cloud Function `checkStock` for on-demand, per-store availability
//
// This endpoint remains for backward compatibility but should not be used for new integrations

export async function POST(req: Request) {
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
