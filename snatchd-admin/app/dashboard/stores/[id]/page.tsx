"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, UploadCloud, Trash2, Package, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function EditStorePage() {
    const router = useRouter();
    const params = useParams();
    const storeId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<"settings" | "inventory">("settings");

    // Store Data
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [categories, setCategories] = useState("");
    const [externalId, setExternalId] = useState("");
    const [rating, setRating] = useState("5.0");
    const [deliveryTime, setDeliveryTime] = useState("30-45 min");
    const [currentLogo, setCurrentLogo] = useState("");
    const [currentBanner, setCurrentBanner] = useState("");

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);

    // Inventory Data
    const [products, setProducts] = useState<any[]>([]);
    const [syncing, setSyncing] = useState(false);
    // Live Status Map: { "sku123": { inStock: true, qty: 5 } }
    const [liveInventory, setLiveInventory] = useState<Record<string, any>>({});
    const [lastSynced, setLastSynced] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            if (!storeId) return;
            try {
                // Fetch Store
                const docRef = doc(db, "stores", storeId);
                const docSnap = await getDoc(docRef);

                let currentStoreName = "";
                let brandTag = ""; // Extract brand tag (e.g., "Zara" from "Zara SoHo")

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    currentStoreName = data.name || "";
                    // Extract the brand tag (first word of store name)
                    // "Zara SoHo" -> "Zara", "Gucci Tribeca" -> "Gucci"
                    brandTag = currentStoreName.split(" ")[0].trim();

                    setName(data.name || "");
                    setDescription(data.description || "");
                    setCategories(data.categories?.join(", ") || "");
                    setExternalId(data.externalId || "");
                    setRating(data.rating?.toString() || "5.0");
                    setDeliveryTime(data.deliveryTime || "30-45 min");
                    setCurrentLogo(data.logo || "");
                    setCurrentBanner(data.image || "");
                } else {
                    alert("Store not found");
                    router.push("/dashboard/stores");
                    return; // Exit if not found
                }

                // Fetch Master Catalog (For Inventory View)
                // Filter by Brand Tag (e.g., all "Zara" stores share products tagged "Zara")
                const productsRef = collection(db, "products");
                const productsSnap = await getDocs(productsRef);

                // Filter products by brand tag
                // If product.brand matches the extracted brand tag, show it
                // This allows "Zara SoHo", "Zara Madison Ave", etc. to all see "Zara" products
                const filteredProducts = productsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((p: any) => {
                        // If product has a brand tag, it must match this store's brand tag
                        if (p.brand && brandTag) {
                            // Case-insensitive comparison
                            return p.brand.toLowerCase() === brandTag.toLowerCase();
                        }
                        // Show untagged products for now (legacy items)
                        return !p.brand;
                    });

                setProducts(filteredProducts);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [storeId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let logoUrl = currentLogo;
            let bannerUrl = currentBanner;

            // 1. Upload New Logo if changed
            if (logoFile) {
                const logoRef = ref(storage, `stores/${Date.now()}_${logoFile.name}`);
                await uploadBytes(logoRef, logoFile);
                logoUrl = await getDownloadURL(logoRef);
            }

            // 2. Upload New Banner if changed
            if (bannerFile) {
                const bannerRef = ref(storage, `stores/${Date.now()}_${bannerFile.name}`);
                await uploadBytes(bannerRef, bannerFile);
                bannerUrl = await getDownloadURL(bannerRef);
            }

            // 3. Update Firestore
            const docRef = doc(db, "stores", storeId);
            await updateDoc(docRef, {
                name,
                description,
                externalId,
                logo: logoUrl,
                image: bannerUrl,
                categories: categories.split(",").map(c => c.trim()).filter(c => c.length > 0),
                rating: parseFloat(rating),
                deliveryTime
            });

            alert("Store updated successfully.");
        } catch (error) {
            console.error("Error updating store:", error);
            alert("Failed to update store.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this store? This cannot be undone.")) return;

        setDeleting(true);
        try {
            await deleteDoc(doc(db, "stores", storeId));
            router.push("/dashboard/stores");
        } catch (error) {
            console.error("Error deleting store:", error);
            alert("Failed to delete store.");
            setDeleting(false);
        }
    };

    const handleSync = async () => {
        if (!externalId) {
            alert("Error: No External Store ID set.");
            return;
        }
        setSyncing(true);
        try {
            // 1. Get List of SKUs to check (from Master Catalog)
            const skus = products.map(p => p.sku).filter(Boolean);

            // 2. Call API
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, externalId, skus })
            });

            const data = await response.json();

            if (!data.success) throw new Error(data.error || "Sync Failed");

            // 3. Update Local State & Persist to Firestore
            const inventoryMap: Record<string, any> = {};
            const updatePromises: Promise<void>[] = [];

            // We iterate through the existing 'products' state to find matches and update efficiently
            // Note: In a larger app, we might do this via a Batch Write endpoint, but for <1000 items this is fine client-side.
            for (const item of data.inventory) {
                inventoryMap[item.sku] = item;

                // Find the product doc ID
                const product = products.find(p => p.sku === item.sku);
                if (product) {
                    const productRef = doc(db, "products", product.id);
                    updatePromises.push(
                        updateDoc(productRef, {
                            inStock: item.inStock,
                            lastSynced: new Date().toISOString()
                        })
                    );
                }
            }

            // Wait for all updates
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                console.log(`Synced ${updatePromises.length} products to Firestore.`);
            }

            setLiveInventory(inventoryMap);
            setLastSynced(new Date().toLocaleTimeString());
            alert(`Sync Complete! Updated & Saved status for ${data.inventory.length} items.`);

        } catch (error) {
            console.error("Sync Error:", error);
            alert("Sync Failed. Check console.");
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-white">Loading store...</div>;

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/stores" className="p-2 rounded-full hover:bg-neutral-900 text-white transition">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">{name || "Edit Store"}</h2>
                        <p className="text-neutral-400">Manage store details and inventory.</p>
                    </div>
                </div>

                {activeTab === "settings" && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-md text-sm font-medium hover:bg-red-500/20 transition"
                    >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? "Deleting..." : "Delete Store"}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800">
                <button
                    onClick={() => setActiveTab("settings")}
                    className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === "settings" ? "border-white text-white" : "border-transparent text-neutral-400 hover:text-white"}`}
                >
                    Settings
                </button>
                <button
                    onClick={() => setActiveTab("inventory")}
                    className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === "inventory" ? "border-green-500 text-green-400" : "border-transparent text-neutral-400 hover:text-white"}`}
                >
                    Live Inventory
                </button>
            </div>

            {activeTab === "settings" ? (
                <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {/* Basic Info */}
                    <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                        <h3 className="font-semibold text-white">Basic Information</h3>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Store Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Description</label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-neutral-300">Rating (0-5)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    max="5"
                                    value={rating}
                                    onChange={e => setRating(e.target.value)}
                                    className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-neutral-300">Delivery Time</label>
                                <input
                                    type="text"
                                    value={deliveryTime}
                                    onChange={e => setDeliveryTime(e.target.value)}
                                    className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-green-400">
                                External Store ID (Inventory Sync)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={externalId}
                                    onChange={e => setExternalId(e.target.value)}
                                    className="w-full rounded-lg bg-black border border-green-500/30 px-4 py-2 text-white focus:border-green-500 focus:outline-none transition font-mono text-sm"
                                    placeholder="e.g. 1105"
                                />
                                {/* Helper Link */}
                                <a
                                    href="https://www.zara.com/us/en/z-stores-st1404.html"
                                    target="_blank"
                                    className="px-3 py-2 bg-neutral-800 rounded-lg text-xs text-neutral-400 hover:text-white flex items-center justify-center whitespace-nowrap"
                                >
                                    Find ID
                                </a>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Categories (Comma separated)</label>
                            <input
                                type="text"
                                value={categories}
                                onChange={e => setCategories(e.target.value)}
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                            />
                        </div>
                    </div>

                    {/* Branding */}
                    <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                        <h3 className="font-semibold text-white">Branding Assets</h3>

                        {/* Logo Upload */}
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Store Logo</label>
                            <div className="flex items-center gap-4">
                                {currentLogo && (
                                    <div className="h-16 w-16 rounded bg-black border border-neutral-800 overflow-hidden shrink-0">
                                        <img src={currentLogo} className="h-full w-full object-cover" alt="Current Logo" />
                                    </div>
                                )}
                                <div className="relative flex-1 flex items-center justify-center h-offset rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-600 transition bg-black h-16">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setLogoFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="text-center pointer-events-none text-xs text-neutral-500">
                                        {logoFile ? <span className="text-green-500">{logoFile.name}</span> : "Change Logo"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Banner Upload */}
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Cover Image</label>
                            <div className="flex flex-col gap-4">
                                {currentBanner && (
                                    <div className="h-32 w-full rounded bg-black border border-neutral-800 overflow-hidden">
                                        <img src={currentBanner} className="h-full w-full object-cover" alt="Current Banner" />
                                    </div>
                                )}
                                <div className="relative flex items-center justify-center w-full h-20 rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-600 transition bg-black">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setBannerFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="text-center pointer-events-none text-xs text-neutral-500">
                                        {bannerFile ? <span className="text-green-500">{bannerFile.name}</span> : "Change Cover Image"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-[2] flex items-center justify-center rounded-lg bg-white py-3 text-black font-bold hover:bg-neutral-200 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                    {/* Inventory Header */}
                    <div className="flex items-center justify-between p-6 rounded-xl border border-white/10 bg-neutral-900/50">
                        <div>
                            <h3 className="text-lg font-bold text-white">Inventory Status</h3>
                            <div className="flex items-center gap-4 text-sm text-neutral-400 mt-1">
                                <p>Store ID: <span className="font-mono text-green-400">{externalId || "NOT SET"}</span></p>
                                {lastSynced && <p>Last Synced: <span className="text-white">{lastSynced}</span></p>}
                            </div>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={syncing || !externalId}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            {syncing ? "Checking Stock..." : "Sync With Apify"}
                        </button>
                    </div>

                    {/* Master Catalog Status */}
                    <div className="grid gap-4">
                        {products.map(product => {
                            // REAL STATUS LOGIC
                            const status = liveInventory[product.sku];
                            const isAvailable = status ? status.inStock : false; // Default off until synced
                            const hasSynced = Object.keys(liveInventory).length > 0;

                            return (
                                <div key={product.id} className="flex items-center gap-4 p-4 rounded-lg border border-white/5 bg-black hover:bg-neutral-900 transition group">
                                    {/* Image */}
                                    <div className="h-12 w-12 rounded bg-neutral-800 overflow-hidden shrink-0">
                                        {product.images?.[0] ? (
                                            <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Package className="h-6 w-6 text-neutral-600 m-auto mt-3" />
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-white truncate">{product.title}</h4>
                                            <span className="text-xs text-neutral-500 font-mono">{product.sku}</span>
                                        </div>
                                        <p className="text-xs text-neutral-500">{product.category}</p>
                                    </div>

                                    {/* Availability Indicator */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
                                        {/* If we haven't synced ever, show neutral */}
                                        {!hasSynced ? (
                                            <span className="text-xs text-neutral-500">Not Checked</span>
                                        ) : isAvailable ? (
                                            <>
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-xs font-medium text-green-500">In Stock</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                                <span className="text-xs font-medium text-red-500">Sold Out</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
