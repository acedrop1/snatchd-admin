"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Package, RefreshCw, CheckCircle, XCircle, ExternalLink, Trash2, AlertTriangle, Layers } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, setDoc, serverTimestamp, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ── Brand catalog URL mapping ─────────────────────────────────────────────────
const BRAND_CATALOG_URLS: Record<string, string> = {
    "Jacquemus": "https://www.jacquemus.com/en_us/women-newness-view-all?start=0&sz=200",
    "Zara": "https://www.zara.com/us/en/woman-new-in-l1180.html",
    "Skims": "https://skims.com/collections/new-arrivals",
};

function getBrandFromStoreName(name: string): string {
    return name.split(" ")[0].trim();
}

function getCatalogUrl(storeName: string): string {
    const brand = getBrandFromStoreName(storeName);
    return BRAND_CATALOG_URLS[brand] || "";
}

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

    // Inventory state
    const [savedProducts, setSavedProducts] = useState<any[]>([]);
    const [fetchedProducts, setFetchedProducts] = useState<any[]>([]);
    const [catalogUrl, setCatalogUrl] = useState("");
    const [fetchStatus, setFetchStatus] = useState<"idle" | "fetching" | "done" | "error">("idle");
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
    const [saveProgress, setSaveProgress] = useState(0);
    const [saveCount, setSaveCount] = useState(0);
    const [deletingProducts, setDeletingProducts] = useState(false);

    // Load store + existing inventory
    useEffect(() => {
        async function fetchData() {
            if (!storeId) return;
            try {
                const docRef = doc(db, "stores", storeId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setName(data.name || "");
                    setDescription(data.description || "");
                    setCategories(data.categories?.join(", ") || "");
                    setExternalId(data.externalId || "");
                    setRating(data.rating?.toString() || "5.0");
                    setDeliveryTime(data.deliveryTime || "30-45 min");
                    setCurrentLogo(data.logo || "");
                    setCurrentBanner(data.image || "");
                    setCatalogUrl(getCatalogUrl(data.name || ""));
                } else {
                    alert("Store not found");
                    router.push("/dashboard/stores");
                    return;
                }

                // Load existing products for this store
                const productsSnap = await getDocs(collection(db, "products"));
                const storeProducts = productsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((p: any) => p.storeId === storeId);
                setSavedProducts(storeProducts);

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

            if (logoFile) {
                const logoRef = ref(storage, `stores/${Date.now()}_${logoFile.name}`);
                await uploadBytes(logoRef, logoFile);
                logoUrl = await getDownloadURL(logoRef);
            }
            if (bannerFile) {
                const bannerRef = ref(storage, `stores/${Date.now()}_${bannerFile.name}`);
                await uploadBytes(bannerRef, bannerFile);
                bannerUrl = await getDownloadURL(bannerRef);
            }

            await updateDoc(doc(db, "stores", storeId), {
                name, description, externalId,
                logo: logoUrl, image: bannerUrl,
                categories: categories.split(",").map(c => c.trim()).filter(c => c.length > 0),
                rating: parseFloat(rating),
                deliveryTime,
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

    // ── Fetch products from brand website ─────────────────────────────────────
    // Shopify brands have a live /products.json endpoint — their seed route fetches it directly.
    // SFCC brands (Jacquemus etc.) go through the scraper with the catalog URL.
    const LIVE_FETCH_ENDPOINTS: Record<string, string> = {
        "Skims": "/api/skims-seed",
        "Kith": "/api/kith-seed",
        // SFCC brands below use the jacquemus-live scraper with their catalog URL
    };

    const handleFetchFromWebsite = async () => {
        const currentBrand = getBrandFromStoreName(name);

        if (!catalogUrl && !LIVE_FETCH_ENDPOINTS[currentBrand]) {
            alert("No catalog URL configured for this brand.");
            return;
        }
        setFetchStatus("fetching");
        setFetchError(null);
        setFetchedProducts([]);

        try {
            // Use brand-specific live endpoint if available, otherwise use the SFCC scraper
            const apiUrl = LIVE_FETCH_ENDPOINTS[currentBrand]
                ?? `/api/jacquemus-live?url=${encodeURIComponent(catalogUrl)}`;

            const res = await fetch(apiUrl);
            const data = await res.json();

            if (!res.ok || data.error) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }

            setFetchedProducts(data.products || []);
            setFetchStatus("done");
        } catch (err: any) {
            setFetchError(err.message || "Failed to fetch products.");
            setFetchStatus("error");
        }
    };

    // ── Use static seed data as fallback ──────────────────────────────────────
    const handleUseStaticData = async () => {
        const brand = getBrandFromStoreName(name);
        const STATIC_SEED_ENDPOINTS: Record<string, string> = {
            "Jacquemus": "/api/jacquemus-seed",
            "Skims": "/api/skims-seed",
        };
        const endpoint = STATIC_SEED_ENDPOINTS[brand] ?? null;

        if (!endpoint) {
            alert(`No static seed data available for ${brand}.`);
            return;
        }

        setFetchStatus("fetching");
        setFetchError(null);

        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load static data");
            setFetchedProducts(data.products || []);
            setFetchStatus("done");
        } catch (err: any) {
            setFetchError(err.message);
            setFetchStatus("error");
        }
    };

    // ── Save fetched products to Firestore ────────────────────────────────────
    const handleSaveProducts = async () => {
        if (fetchedProducts.length === 0) return;
        setSaveStatus("saving");
        setSaveProgress(0);
        setSaveCount(0);

        const brand = getBrandFromStoreName(name);
        let written = 0;

        for (const product of fetchedProducts) {
            const docId = `${brand.toLowerCase()}_${product.externalId}_${storeId}`;
            await setDoc(doc(db, "products", docId), {
                ...product,
                storeId,
                brand,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            });
            written++;
            setSaveCount(written);
            setSaveProgress(Math.round((written / fetchedProducts.length) * 100));
        }

        setSaveStatus("done");
        // Refresh saved products list
        const snap = await getDocs(collection(db, "products"));
        setSavedProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((p: any) => p.storeId === storeId));
    };

    // ── Delete all products for this store ────────────────────────────────────
    const handleDeleteAllProducts = async () => {
        if (!confirm(`Delete all ${savedProducts.length} products from this store? This cannot be undone.`)) return;
        setDeletingProducts(true);
        try {
            for (const product of savedProducts) {
                await deleteDoc(doc(db, "products", product.id));
            }
            setSavedProducts([]);
            setFetchedProducts([]);
            setSaveStatus("idle");
        } catch (err) {
            alert("Error deleting products.");
        } finally {
            setDeletingProducts(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-white">Loading store...</div>;

    const brand = getBrandFromStoreName(name);
    const hasStaticSeed = ["Jacquemus", "Skims"].includes(brand);

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
                    {savedProducts.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-mono">
                            {savedProducts.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Settings Tab */}
            {activeTab === "settings" ? (
                <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {/* Basic Info */}
                    <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                        <h3 className="font-semibold text-white">Basic Information</h3>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Store Name</label>
                            <input type="text" required value={name} onChange={e => setName(e.target.value)}
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition" />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Description</label>
                            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-neutral-300">Rating (0-5)</label>
                                <input type="number" step="0.1" max="5" value={rating} onChange={e => setRating(e.target.value)}
                                    className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-neutral-300">Delivery Time</label>
                                <input type="text" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)}
                                    className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Categories (Comma separated)</label>
                            <input type="text" value={categories} onChange={e => setCategories(e.target.value)}
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition" />
                        </div>
                    </div>

                    {/* Branding */}
                    <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                        <h3 className="font-semibold text-white">Branding Assets</h3>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Store Logo</label>
                            <div className="flex items-center gap-4">
                                {currentLogo && (
                                    <div className="h-16 w-16 rounded bg-black border border-neutral-800 overflow-hidden shrink-0">
                                        <img src={currentLogo} className="h-full w-full object-cover" alt="Logo" />
                                    </div>
                                )}
                                <div className="relative flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-600 transition bg-black h-16">
                                    <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className="text-center pointer-events-none text-xs text-neutral-500">
                                        {logoFile ? <span className="text-green-500">{logoFile.name}</span> : "Change Logo"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Cover Image</label>
                            <div className="flex flex-col gap-4">
                                {currentBanner && (
                                    <div className="h-32 w-full rounded bg-black border border-neutral-800 overflow-hidden">
                                        <img src={currentBanner} className="h-full w-full object-cover" alt="Banner" />
                                    </div>
                                )}
                                <div className="relative flex items-center justify-center w-full h-20 rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-600 transition bg-black">
                                    <input type="file" accept="image/*" onChange={e => setBannerFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className="text-center pointer-events-none text-xs text-neutral-500">
                                        {bannerFile ? <span className="text-green-500">{bannerFile.name}</span> : "Change Cover Image"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="submit" disabled={saving}
                            className="flex-[2] flex items-center justify-center rounded-lg bg-white py-3 text-black font-bold hover:bg-neutral-200 transition disabled:opacity-50">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>

            ) : (
                // ── Live Inventory Tab ─────────────────────────────────────────────────
                <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">

                    {/* Sync Source */}
                    <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Sync Products from Website</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Fetch live product data from {brand}'s website and save to this store.
                                </p>
                            </div>
                            {savedProducts.length > 0 && (
                                <button onClick={handleDeleteAllProducts} disabled={deletingProducts}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded text-xs font-medium hover:bg-red-500/20 transition">
                                    <Trash2 className="h-3 w-3" />
                                    {deletingProducts ? "Clearing..." : `Clear ${savedProducts.length} Products`}
                                </button>
                            )}
                        </div>

                        {/* URL Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Catalog URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={catalogUrl}
                                    onChange={e => setCatalogUrl(e.target.value)}
                                    placeholder="https://www.jacquemus.com/en_us/women-newness-view-all?start=0&sz=200"
                                    className="flex-1 rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white text-sm font-mono focus:border-white focus:outline-none transition"
                                />
                                {catalogUrl && (
                                    <a href={catalogUrl} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-2 bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition flex items-center">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleFetchFromWebsite}
                                disabled={fetchStatus === "fetching" || !catalogUrl}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-bold hover:bg-neutral-200 transition disabled:opacity-50"
                            >
                                {fetchStatus === "fetching" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                {fetchStatus === "fetching" ? "Fetching..." : "Fetch from Website"}
                            </button>

                            {hasStaticSeed && (
                                <button
                                    onClick={handleUseStaticData}
                                    disabled={fetchStatus === "fetching"}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md text-sm font-bold hover:bg-purple-500/30 transition disabled:opacity-50"
                                >
                                    <Layers className="h-4 w-4" />
                                    Use Pre-Loaded Data
                                </button>
                            )}
                        </div>

                        {/* Fetch Error */}
                        {fetchStatus === "error" && fetchError && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-red-400 font-medium">Fetch Failed</p>
                                    <p className="text-xs text-red-400/70 mt-1">{fetchError}</p>
                                    {hasStaticSeed && (
                                        <p className="text-xs text-neutral-400 mt-2">
                                            → Use <strong className="text-purple-400">"Use Pre-Loaded Data"</strong> to load the static product catalog instead.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fetched Products Preview */}
                    {fetchedProducts.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-neutral-900/50 overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-white/5">
                                <div>
                                    <h4 className="font-semibold text-white">{fetchedProducts.length} Products Ready</h4>
                                    <p className="text-xs text-neutral-400 mt-0.5">Review before saving to this store</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {saveStatus === "done" && (
                                        <span className="flex items-center gap-1 text-xs text-green-400">
                                            <CheckCircle className="h-3.5 w-3.5" /> Saved
                                        </span>
                                    )}
                                    <button
                                        onClick={handleSaveProducts}
                                        disabled={saveStatus === "saving"}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-bold hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        {saveStatus === "saving" ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Saving {saveCount}/{fetchedProducts.length}...</>
                                        ) : (
                                            <>Save {fetchedProducts.length} Products to Store</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {saveStatus === "saving" && (
                                <div className="h-1 bg-neutral-800">
                                    <div className="h-1 bg-green-500 transition-all duration-300" style={{ width: `${saveProgress}%` }} />
                                </div>
                            )}

                            {/* Product Table */}
                            <div className="overflow-auto max-h-96">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-neutral-900">
                                        <tr className="text-xs text-neutral-500 text-left">
                                            <th className="px-4 py-2 font-medium w-12">IMG</th>
                                            <th className="px-4 py-2 font-medium">Title</th>
                                            <th className="px-4 py-2 font-medium">Category</th>
                                            <th className="px-4 py-2 font-medium text-right">Price</th>
                                            <th className="px-4 py-2 font-medium">Sizes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fetchedProducts.map((p, i) => (
                                            <tr key={p.externalId || i} className="border-t border-white/5 hover:bg-white/5 transition">
                                                <td className="px-4 py-2">
                                                    <div className="h-10 w-10 rounded bg-neutral-800 overflow-hidden">
                                                        {p.imageURL ? (
                                                            <img src={p.imageURL} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <Package className="h-5 w-5 text-neutral-600 m-auto mt-2.5" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="font-medium text-white truncate max-w-48">{p.title}</div>
                                                    <div className="text-xs text-neutral-500 font-mono">{p.externalId}</div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-neutral-300">{p.category}</span>
                                                </td>
                                                <td className="px-4 py-2 text-right text-white font-medium">
                                                    ${p.price}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex flex-wrap gap-1 max-w-32">
                                                        {(p.sizes || []).slice(0, 5).map((s: string) => (
                                                            <span key={s} className="px-1.5 py-0.5 rounded bg-neutral-800 text-xs text-neutral-300">{s}</span>
                                                        ))}
                                                        {(p.sizes || []).length > 5 && (
                                                            <span className="text-xs text-neutral-500">+{(p.sizes || []).length - 5}</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Saved Products Summary */}
                    {savedProducts.length > 0 && fetchedProducts.length === 0 && (
                        <div className="rounded-xl border border-white/10 bg-neutral-900/50 overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-white">Current Inventory</h4>
                                    <p className="text-xs text-neutral-400 mt-0.5">{savedProducts.length} products in this store</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {/* Category breakdown */}
                                    {Object.entries(
                                        savedProducts.reduce((acc: Record<string, number>, p: any) => {
                                            const cat = p.category || "Other";
                                            acc[cat] = (acc[cat] || 0) + 1;
                                            return acc;
                                        }, {})
                                    ).map(([cat, count]) => (
                                        <span key={cat} className="px-2 py-1 rounded bg-white/5 text-xs text-neutral-300 border border-white/5">
                                            {cat} <span className="text-neutral-500">({count})</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="overflow-auto max-h-80">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-neutral-900">
                                        <tr className="text-xs text-neutral-500 text-left">
                                            <th className="px-4 py-2 font-medium w-12">IMG</th>
                                            <th className="px-4 py-2 font-medium">Title</th>
                                            <th className="px-4 py-2 font-medium">Category</th>
                                            <th className="px-4 py-2 font-medium text-right">Price</th>
                                            <th className="px-4 py-2 font-medium">Sizes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {savedProducts.map((p, i) => (
                                            <tr key={p.id || i} className="border-t border-white/5 hover:bg-white/5 transition">
                                                <td className="px-4 py-2">
                                                    <div className="h-10 w-10 rounded bg-neutral-800 overflow-hidden">
                                                        {p.imageURL || p.images?.[0] ? (
                                                            <img src={p.imageURL || p.images[0]} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <Package className="h-5 w-5 text-neutral-600 m-auto mt-2.5" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="font-medium text-white truncate max-w-48">{p.title}</div>
                                                    <div className="text-xs text-neutral-500 font-mono">{p.externalId}</div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-neutral-300">{p.category}</span>
                                                </td>
                                                <td className="px-4 py-2 text-right text-white font-medium">
                                                    ${p.price}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex flex-wrap gap-1 max-w-32">
                                                        {(p.sizes || []).slice(0, 5).map((s: string) => (
                                                            <span key={s} className="px-1.5 py-0.5 rounded bg-neutral-800 text-xs text-neutral-300">{s}</span>
                                                        ))}
                                                        {(p.sizes || []).length > 5 && (
                                                            <span className="text-xs text-neutral-500">+{(p.sizes || []).length - 5}</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {savedProducts.length === 0 && fetchedProducts.length === 0 && fetchStatus !== "fetching" && (
                        <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                            <Package className="h-10 w-10 text-neutral-600 mx-auto mb-4" />
                            <h3 className="text-white font-medium mb-2">No products yet</h3>
                            <p className="text-sm text-neutral-500">
                                Fetch products from the {brand} website above, or use the pre-loaded static catalog.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
