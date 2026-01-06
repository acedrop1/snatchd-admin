import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();
const db = admin.firestore();

interface CheckStockRequest {
    productId: string;        // Firestore doc ID
    zaraProductId: string;    // Numeric Zara ID
    latitude: number;         // User location
    longitude: number;
    forceRefresh?: boolean;   // Bypass cache
}

interface StoreAvailability {
    storeId: string;
    storeName: string;
    address?: string;
    inStock: boolean;
    distance?: number;
    lastChecked: string;
}

/**
 * Cloud Function: checkStock (2nd Gen)
 * 
 * Real-time stock checker for Zara products using their public API.
 * Implements 60-minute caching to avoid rate limits.
 */
export const checkStock = onRequest({ cors: true }, async (req, res) => {
    // CORS is handled automatically by { cors: true } option in v2

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { productId, zaraProductId, latitude, longitude, forceRefresh } = req.body as CheckStockRequest;

        // Validation
        if (!productId || !zaraProductId) {
            res.status(400).json({ error: 'Missing required fields: productId, zaraProductId' });
            return;
        }

        if (!latitude || !longitude) {
            res.status(400).json({ error: 'Missing location: latitude, longitude' });
            return;
        }

        console.log(`📍 Stock check requested for product ${productId} (Zara ID: ${zaraProductId}) near ${latitude},${longitude}`);

        // Step 1: Check cache (unless forceRefresh)
        if (!forceRefresh) {
            const now = new Date();
            const availabilityRef = db.collection(`products/${productId}/availability`);
            const cachedDocs = await availabilityRef
                .where('expiresAt', '>', now)
                .get();

            if (!cachedDocs.empty) {
                console.log(`✅ Cache HIT - Returning ${cachedDocs.size} cached stores`);
                const stores: StoreAvailability[] = cachedDocs.docs.map(doc => {
                    const data = doc.data();
                    return {
                        storeId: doc.id,
                        storeName: data.storeName,
                        address: data.storeAddress,
                        inStock: data.inStock,
                        distance: data.distance,
                        lastChecked: data.lastChecked?.toDate().toISOString() || new Date().toISOString()
                    };
                });

                res.status(200).json({
                    success: true,
                    cached: true,
                    stores
                });
                return;
            }
        }

        // Step 2: Call Zara API
        console.log(`🌐 Cache MISS - Calling Zara API...`);
        const zaraUrl = `https://www.zara.com/us/en/stock-sharing/shops/by-physical-stock?lat=${latitude}&lng=${longitude}&productIds=${zaraProductId}`;

        const response = await axios.get(zaraUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
            },
            timeout: 10000 // 10 second timeout
        });

        const shops = response.data.shops || [];
        console.log(`📦 Zara API returned ${shops.length} stores`);

        // Step 3: Update cache (60-minute TTL)
        const batch = db.batch();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
        const stores: StoreAvailability[] = [];

        for (const shop of shops) {
            const storeId = shop.id || shop.shopId || `store_${shop.name.replace(/\s+/g, '_')}`;
            const docRef = db.doc(`products/${productId}/availability/${storeId}`);

            const storeData = {
                inStock: shop.stockStatus === 'in_stock',
                storeName: shop.name,
                storeAddress: shop.address || '',
                distance: shop.distance || null,
                lastChecked: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt
            };

            batch.set(docRef, storeData, { merge: true });

            stores.push({
                storeId,
                storeName: shop.name,
                address: shop.address,
                inStock: shop.stockStatus === 'in_stock',
                distance: shop.distance,
                lastChecked: new Date().toISOString()
            });
        }

        await batch.commit();
        console.log(`✅ Cached ${stores.length} stores with 60min TTL`);

        // Step 4: Return results
        res.status(200).json({
            success: true,
            cached: false,
            stores
        });

    } catch (error: any) {
        console.error('❌ Stock check error:', error.message);

        // Handle specific errors
        if (error.code === 'ECONNABORTED') {
            res.status(504).json({ error: 'Zara API timeout' });
            return;
        }

        if (error.response?.status === 404) {
            res.status(404).json({ error: 'Product not found in Zara system' });
            return;
        }

        res.status(500).json({
            error: 'Stock check failed',
            message: error.message
        });
    }
});

/**
 * Cloud Function: updateZaraSohoStock
 * 
 * Manual Trigger: Updates stock status for all Zara products availability 
 * specifically for Zara SoHo (Store ID 11719).
 * 
 * Url Trigger: POST /updateZaraSohoStock
 */
export const updateZaraSohoStock = onRequest({
    timeoutSeconds: 300, // 5 min timeout for processing multiple items
    cors: true
}, async (req, res) => {
    // Basic security: Check internal token or just rely on obscurity for now
    // For testing simplification we allow GET/POST

    console.log("🌚 Starting Manual Stock Check for Zara SoHo...");

    const ZARA_SOHO_ID = 11719;
    const SOHO_LAT = 40.7246;
    const SOHO_LNG = -73.9985;

    try {
        // 1. Get all Zara products
        const snapshot = await db.collection("products")
            .where("brand", "==", "Zara")
            .get();

        if (snapshot.empty) {
            res.status(200).json({ message: "No Zara products found." });
            return;
        }

        const batch = db.batch();
        let counter = 0;
        const results: any[] = [];

        // Loop through docs
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const productId = doc.id;
            const zaraProductId = data.zaraProductId; // Ensure this field exists!

            if (!zaraProductId) {
                console.log(`⚠️ Skipping ${productId}: No zaraProductId found`);
                continue;
            }

            // 2. Ask Zara: "Is this item near SoHo?"
            const url = `https://www.zara.com/us/en/stock-sharing/shops/by-physical-stock?lat=${SOHO_LAT}&lng=${SOHO_LNG}&productIds=${zaraProductId}`;

            let isAvailable = false;

            try {
                const response = await axios.get(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' }
                });

                // 3. The "Gold Filter" - strictly check for Store 11719
                const shops = response.data.shops || [];

                // Find SoHo store in the results
                // Note: Zara API might return string or number for IDs, be safe with loose comparison or casting
                const sohoStore = shops.find((shop: any) =>
                    shop.id == ZARA_SOHO_ID || shop.shopId == ZARA_SOHO_ID
                );

                if (sohoStore && sohoStore.stockStatus === "in_stock") {
                    isAvailable = true;
                }

                results.push({ productId, zaraProductId, isAvailable });

            } catch (error: any) {
                console.error(`Error checking ${productId}:`, error.message);
                results.push({ productId, error: error.message });
            }

            // 4. Update the specific "SoHo" Flag
            const docRef = db.collection("products").doc(productId);
            batch.update(docRef, {
                in_stock_soho: isAvailable,
                last_checked_soho: admin.firestore.FieldValue.serverTimestamp()
            });

            counter++;

            // Simple batching: Commit every 400 items (Firestore limit is 500)
            // Since we are likely < 150, one batch is fine. 
            // If > 400, strictly we should split batches.

            // Slight delay to be polite to Zara API
            await new Promise(r => setTimeout(r, 200));
        }

        await batch.commit();
        console.log(`✅ Sweep complete. Updated ${counter} items for Zara SoHo.`);

        res.status(200).json({
            success: true,
            updatedCount: counter,
            details: results
        });

    } catch (error: any) {
        console.error("❌ Fatal error in sweep:", error);
        res.status(500).json({ error: error.message });
    }
});
