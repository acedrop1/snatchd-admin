import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
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
 * Core stock sweep logic — shared by both the scheduled and HTTP-triggered functions.
 * Checks all Zara products against the Zara SoHo store (ID: 11719) and updates
 * the `in_stock_soho` field on each product in Firestore.
 */
async function runZaraSohoStockSweep(): Promise<{ updatedCount: number; results: any[] }> {
    const ZARA_SOHO_ID = 11719;
    const SOHO_LAT = 40.7246;
    const SOHO_LNG = -73.9985;

    const snapshot = await db.collection("products")
        .where("brand", "==", "Zara")
        .get();

    if (snapshot.empty) {
        console.log("⚠️ No Zara products found in Firestore.");
        return { updatedCount: 0, results: [] };
    }

    const batch = db.batch();
    let counter = 0;
    const results: any[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const productId = doc.id;
        const zaraProductId = data.zaraProductId;

        if (!zaraProductId) {
            console.log(`⚠️ Skipping ${productId}: No zaraProductId`);
            continue;
        }

        const url = `https://www.zara.com/us/en/stock-sharing/shops/by-physical-stock?lat=${SOHO_LAT}&lng=${SOHO_LNG}&productIds=${zaraProductId}`;
        let isAvailable = false;

        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
                timeout: 8000
            });

            const shops = response.data.shops || [];

            // Log actual response shape on first product to catch Zara API changes
            if (counter === 0 && shops.length > 0) {
                console.log(`🔍 Zara API sample shop fields: ${Object.keys(shops[0]).join(', ')}`);
                console.log(`🔍 Sample stock value: stockStatus=${shops[0].stockStatus}, stock=${shops[0].stock}, availability=${shops[0].availability}`);
            }

            const sohoStore = shops.find((shop: any) =>
                shop.id == ZARA_SOHO_ID || shop.shopId == ZARA_SOHO_ID
            );

            if (sohoStore) {
                // Flexible stock field detection — handles if Zara changes their API response format
                isAvailable =
                    sohoStore.stockStatus === "in_stock" ||
                    sohoStore.stock === "in_stock" ||
                    sohoStore.availability === true ||
                    sohoStore.inStock === true ||
                    sohoStore.available === true;
            }

            results.push({ productId, zaraProductId, isAvailable });
        } catch (err: any) {
            console.error(`❌ Error checking ${productId}:`, err.message);
            results.push({ productId, error: err.message });
        }

        const docRef = db.collection("products").doc(productId);
        batch.update(docRef, {
            in_stock_soho: isAvailable,
            last_checked_soho: admin.firestore.FieldValue.serverTimestamp()
        });

        counter++;

        // Polite delay between Zara API requests
        await new Promise(r => setTimeout(r, 200));
    }

    await batch.commit();
    console.log(`✅ Sweep complete — updated ${counter} Zara products for SoHo.`);
    return { updatedCount: counter, results };
}

/**
 * Cloud Function: updateZaraSohoStock (HTTP)
 *
 * Manual trigger from Admin Portal → Dashboard "Check Zara SoHo Stock" button.
 * POST /updateZaraSohoStock
 */
export const updateZaraSohoStock = onRequest({
    timeoutSeconds: 300,
    cors: true
}, async (req, res) => {
    console.log("🖐 Manual stock sweep triggered via HTTP...");
    try {
        const { updatedCount, results } = await runZaraSohoStockSweep();
        res.status(200).json({ success: true, updatedCount, details: results });
    } catch (error: any) {
        console.error("❌ Fatal error in manual sweep:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Cloud Function: scheduledZaraSohoStock (Scheduled)
 *
 * Automatically runs every 15 minutes to keep Zara SoHo stock fresh.
 * Enable Cloud Scheduler in Firebase Console if not already active.
 */
export const scheduledZaraSohoStock = onSchedule({
    schedule: "every 15 minutes",
    timeoutSeconds: 300,
}, async (_context) => {
    console.log("⏰ Scheduled stock sweep starting...");
    try {
        await runZaraSohoStockSweep();
    } catch (error: any) {
        console.error("❌ Fatal error in scheduled sweep:", error);
    }
});
