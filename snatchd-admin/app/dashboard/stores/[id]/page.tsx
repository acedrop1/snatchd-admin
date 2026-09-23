"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Package, RefreshCw, CheckCircle, XCircle, ExternalLink, Trash2, AlertTriangle, Layers, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { adminPost } from "@/lib/adminApi";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, setDoc, serverTimestamp, query, where, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ── Smart category inference ───────────────────────────────────────────────────
// Looks at product name + description and maps to standard app categories.
// Categories must match exactly what the app's store filters use.
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
    { category: "Dresses",      keywords: ["dress", "gown", "midi dress", "mini dress", "maxi dress", "slip dress"] },
    { category: "Jumpsuits",    keywords: ["jumpsuit", "romper", "one-piece", "playsuit", "overall"] },
    { category: "Jeans",        keywords: ["jean", "denim pant", "denim trouser", "skinny denim", "wide leg denim", "flare denim"] },
    { category: "Bottoms",      keywords: ["pant", "trouser", "short", "skirt", "legging", "tight", "jogger", "sweatpant", "cargo", "bermuda", "culotte", "capri"] },
    { category: "Tops",         keywords: ["top", "tee", "t-shirt", "tshirt", "tank", "crop", "blouse", "shirt", "bralette", "bodysuit", "cami", "tube", "halter", "corset"] },
    { category: "Sweaters",     keywords: ["sweater", "knit", "cardigan", "pullover", "crewneck", "turtleneck", "sweatshirt", "hoodie", "fleece"] },
    { category: "Outerwear",    keywords: ["jacket", "coat", "blazer", "parka", "puffer", "trench", "cape", "vest", "anorak", "windbreaker"] },
    { category: "Swimwear",     keywords: ["swimsuit", "bikini", "swim", "one piece", "swimwear", "coverup", "cover-up"] },
    { category: "Accessories",  keywords: ["bag", "purse", "tote", "clutch", "belt", "hat", "cap", "scarf", "glove", "sock", "jewelry", "necklace", "earring", "bracelet", "ring", "sunglasses", "glasses", "wallet", "keychain"] },
    { category: "Shoes",        keywords: ["shoe", "boot", "sandal", "sneaker", "heel", "loafer", "flat", "pump", "mule", "clog", "slipper", "wedge"] },
    { category: "Lingerie",     keywords: ["bra", "underwear", "lingerie", "thong", "brief", "panty", "lounge"] },
    { category: "Activewear",   keywords: ["sports bra", "athletic", "workout", "gym", "yoga", "running", "cycling short", "compression"] },
];

function inferCategory(title: string, description: string = ""): string {
    const text = `${title} ${description}`.toLowerCase();
    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.some(k => text.includes(k))) return rule.category;
    }
    return "Clothing";
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
    const [brand, setBrand] = useState("");
    const [rating, setRating] = useState("5.0");
    const [deliveryTime, setDeliveryTime] = useState("30-45 min");
    const [currentLogo, setCurrentLogo] = useState("");
    const [currentBanner, setCurrentBanner] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);

    // Tags
    const [tags, setTags] = useState<string[]>([]);
    const ALL_TAGS = [
        { value: "foryou",   label: "#foryou",   desc: "Snatchd For You" },
        { value: "trending", label: "#trending", desc: "Trending in Your Area" },
        { value: "60min",    label: "#60min",    desc: "Under 60 Minutes" },
    ];

    // Visibility
    const [isActive, setIsActive] = useState(true);
    const [togglingActive, setTogglingActive] = useState(false);

    // Location
    const [address, setAddress] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [deliveryRadius, setDeliveryRadius] = useState("");
    const [geocoding, setGeocoding] = useState(false);

    const geocodeFromAddress = async () => {
        if (!address.trim()) { alert("Enter a store address first."); return; }
        setGeocoding(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
            const res = await fetch(url, { headers: { "Accept-Language": "en" } });
            const data = await res.json();
            if (data.length > 0) {
                setLatitude(parseFloat(data[0].lat).toFixed(6));
                setLongitude(parseFloat(data[0].lon).toFixed(6));
            } else {
                alert("Address not found. Try a more specific address.");
            }
        } catch {
            alert("Geocoding failed. Enter coordinates manually.");
        } finally {
            setGeocoding(false);
        }
    };

    // Inventory state
    const [savedProducts, setSavedProducts] = useState<any[]>([]);
    // Where this store's inventory comes from — set explicitly, never guessed from the name
    const [inventorySource, setInventorySource] = useState<"manual" | "shopify" | "bergdorf" | "zara">("manual");
    const [sourceDomain, setSourceDomain] = useState("");
    const [sourceStoreId, setSourceStoreId] = useState("3862");   // Zara SoHo, 503 Broadway
    const [sourceQuery, setSourceQuery] = useState("");
    const [savingSource, setSavingSource] = useState(false);
    const [sourceSaved, setSourceSaved] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
    const [saveProgress, setSaveProgress] = useState(0);
    const [deletingProducts, setDeletingProducts] = useState(false);
    const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0, found: 0 });
    const [descProgress, setDescProgress] = useState({ done: 0, total: 0, found: 0 });

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
                    setBrand(data.brand || (data.name || "").split(" ")[0]);
                    setInventorySource(data.inventorySource || "manual");
                    setSourceDomain(data.sourceDomain || "");
                    setSourceStoreId(String(data.sourceStoreId || "3862"));
                    setSourceQuery(data.sourceQuery || "");
                    setRating(data.rating?.toString() || "5.0");
                    setDeliveryTime(data.deliveryTime || "30-45 min");
                    setCurrentLogo(data.logo || "");
                    setCurrentBanner(data.image || "");
                    setIsActive(data.isActive !== false); // treat missing as active
                    setTags(data.tags || []);
                    setAddress(data.address || "");
                    setLatitude(data.latitude?.toString() || "");
                    setLongitude(data.longitude?.toString() || "");
                    setDeliveryRadius(data.deliveryRadius?.toString() || "");
                } else {
                    alert("Store not found");
                    router.push("/dashboard/stores");
                    return;
                }

                // Only this store's products — not the whole catalog
                const productsSnap = await getDocs(query(collection(db, "products"), where("storeId", "==", storeId)));
                setSavedProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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

            // Auto-geocode: if address is set but lat/lon are missing, resolve them automatically
            let finalLat = latitude ? parseFloat(latitude) : null;
            let finalLon = longitude ? parseFloat(longitude) : null;
            if (address.trim() && (finalLat === null || finalLon === null)) {
                try {
                    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address.trim())}`;
                    const geoRes = await fetch(geoUrl, { headers: { "Accept-Language": "en" } });
                    const geoData = await geoRes.json();
                    if (geoData.length > 0) {
                        finalLat = parseFloat(parseFloat(geoData[0].lat).toFixed(6));
                        finalLon = parseFloat(parseFloat(geoData[0].lon).toFixed(6));
                        setLatitude(finalLat.toString());
                        setLongitude(finalLon.toString());
                    }
                } catch {
                    // Geocoding failed silently — coordinates stay null
                }
            }

            await updateDoc(doc(db, "stores", storeId), {
                name, description, externalId, brand: brand.trim() || name.split(" ")[0],
                inventorySource, sourceDomain: sourceDomain.trim() || null,
                sourceStoreId: inventorySource === "zara" ? sourceStoreId.trim() : null, sourceQuery: sourceQuery.trim() || null,
                logo: logoUrl, image: bannerUrl,
                categories: categories.split(",").map(c => c.trim()).filter(c => c.length > 0),
                rating: parseFloat(rating),
                deliveryTime,
                isActive,
                tags,
                address: address.trim() || null,
                latitude: finalLat,
                longitude: finalLon,
                deliveryRadius: deliveryRadius ? parseFloat(deliveryRadius) : null,
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

    // ── Quick visibility toggle (without full save) ───────────────────────────
    const handleQuickToggle = async () => {
        setTogglingActive(true);
        const newValue = !isActive;
        try {
            await updateDoc(doc(db, "stores", storeId), { isActive: newValue });
            setIsActive(newValue);
        } catch (err) {
            console.error("Failed to toggle visibility", err);
            alert("Failed to update visibility.");
        } finally {
            setTogglingActive(false);
        }
    };

    const [bulking, setBulking] = useState(false);
    const setAllShown = async (next: boolean) => {
        const targets = savedProducts.filter(p => (p.isActive !== false) !== next);
        if (!targets.length) return;
        if (!confirm(`${next ? "Show" : "Hide"} ${targets.length} product${targets.length === 1 ? "" : "s"} in the app?`)) return;
        setBulking(true);
        try {
            // Firestore caps a batch at 500 writes
            for (let i = 0; i < targets.length; i += 400) {
                const batch = writeBatch(db);
                for (const p of targets.slice(i, i + 400)) batch.update(doc(db, "products", p.id), { isActive: next });
                await batch.commit();
            }
            setSavedProducts(prev => prev.map(p => ({ ...p, isActive: next })));
        } catch (e: any) { alert("Failed: " + e.message); }
        finally { setBulking(false); }
    };

    const toggleShown = async (p: any) => {
        const next = p.isActive === false;
        await updateDoc(doc(db, "products", p.id), { isActive: next });
        setSavedProducts(prev => prev.map(x => x.id === p.id ? { ...x, isActive: next } : x));
    };

    const [reloading, setReloading] = useState(false);
    const reloadProducts = async () => {
        setReloading(true);
        try {
            const snap = await getDocs(query(collection(db, "products"), where("storeId", "==", storeId)));
            setSavedProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } finally { setReloading(false); }
    };

    // ── Inventory source ──────────────────────────────────────────────────────
    const saveSource = async () => {
        setSavingSource(true); setSourceSaved(false);
        try {
            await updateDoc(doc(db, "stores", storeId), {
                inventorySource, sourceDomain: sourceDomain.trim() || null, brand: brand.trim() || name.split(" ")[0],
                sourceStoreId: inventorySource === "zara" ? sourceStoreId.trim() : null, sourceQuery: sourceQuery.trim() || null,
            });
            setSourceSaved(true);
            setTimeout(() => setSourceSaved(false), 4000);
        } catch (e: any) { alert("Could not save source: " + e.message); }
        finally { setSavingSource(false); }
    };

    const handleSyncCatalog = async () => {
        setSyncing(true); setSyncResult(null);
        try {
            await saveSource();
            const r = await adminPost("syncStoreCatalog", { storeId });
            setSyncResult(`Synced ${r.synced} products from ${r.source}${r.removed ? `, replaced ${r.removed} older entries` : ""}${r.failed?.length ? `, ${r.failed.length} failed` : ""}.`);
            await reloadProducts();
        } catch (e: any) { setSyncResult("Sync failed: " + e.message); }
        finally { setSyncing(false); }
    };

    const handleRefreshStock = async () => {
        setSyncing(true); setSyncResult(null);
        try {
            const r = await adminPost("refreshStock");
            const mine = r.stores?.[storeId];
            setSyncResult(mine ? `Availability refreshed: ${mine.updated} updated, ${mine.unknown} unknown${mine.tripped ? " — source unreachable, breaker tripped" : ""}.` : "Refreshed (this store has no live source).");
            await reloadProducts();
        } catch (e: any) { setSyncResult("Refresh failed: " + e.message); }
        finally { setSyncing(false); }
    };

    // ── Delete all products for this store ────────────────────────────────────
    const handleDeleteAllProducts = async () => {
        if (!confirm(`Delete all ${savedProducts.length} products from ${name}?\n\nThis removes them from the database. It does not just hide them — use Show/Shown for that.`)) return;
        setDeletingProducts(true);
        try {
            for (const product of savedProducts) {
                await deleteDoc(doc(db, "products", product.id));
            }
            setSavedProducts([]);
            setSaveStatus("idle");
        } catch (err) {
            alert("Error deleting products.");
        } finally {
            setDeletingProducts(false);
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
                    {/* Visibility Banner */}
                    <div className={`flex items-center justify-between rounded-xl border p-5 transition ${
                        isActive
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-red-500/30 bg-red-500/5"
                    }`}>
                        <div className="flex items-center gap-3">
                            {isActive
                                ? <Eye className="h-5 w-5 text-green-400 flex-shrink-0" />
                                : <EyeOff className="h-5 w-5 text-red-400 flex-shrink-0" />
                            }
                            <div>
                                <p className={`font-semibold text-sm ${isActive ? "text-green-400" : "text-red-400"}`}>
                                    {isActive ? "Visible in app" : "Hidden from app"}
                                </p>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    {isActive
                                        ? "Customers can see and shop this store."
                                        : "This store is temporarily hidden from customers."
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleQuickToggle}
                            disabled={togglingActive}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                                isActive
                                    ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                                    : "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                            }`}
                        >
                            {togglingActive
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : isActive
                                    ? <><EyeOff className="h-4 w-4" /> Hide from app</>
                                    : <><Eye className="h-4 w-4" /> Show in app</>
                            }
                        </button>
                    </div>
                    {/* Home Feed Tags */}
                    <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                        <div>
                            <h3 className="font-semibold text-white">Home Feed Sections</h3>
                            <p className="text-xs text-neutral-500 mt-1">Tag this store to control which sections it appears in on the home screen.</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {ALL_TAGS.map(tag => {
                                const active = tags.includes(tag.value);
                                return (
                                    <button
                                        key={tag.value}
                                        type="button"
                                        onClick={() => setTags(prev =>
                                            active ? prev.filter(t => t !== tag.value) : [...prev, tag.value]
                                        )}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
                                            active
                                                ? "bg-white text-black border-white"
                                                : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-white"
                                        }`}
                                    >
                                        <span className="font-mono">{tag.label}</span>
                                        <span className={`text-xs ${active ? "text-neutral-600" : "text-neutral-600"}`}>{tag.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                        <h3 className="font-semibold text-white">Basic Information</h3>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Store Name</label>
                            <input type="text" required value={name} onChange={e => setName(e.target.value)}
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition" />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Brand</label>
                            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Skims"
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition" />
                            <p className="text-xs text-neutral-500">Shown on products. Two locations of the same brand share this.</p>
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

                    {/* Location */}
                    <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-white">Location</h3>
                            {address && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    View on Maps
                                </a>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Store Address</label>
                            <input
                                type="text"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="e.g. 113 Prince St, New York, NY 10012"
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none transition"
                            />
                            <div className="flex items-center gap-3">
                                <p className="text-xs text-neutral-500">Shown in the app. After entering the address, click to auto-fill coordinates.</p>
                                <button
                                    type="button"
                                    onClick={geocodeFromAddress}
                                    disabled={geocoding || !address.trim()}
                                    className="shrink-0 rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40 transition"
                                >
                                    {geocoding ? "Geocoding…" : "⌖ Auto-fill Lat/Lng"}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-neutral-300">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={latitude}
                                    onChange={e => setLatitude(e.target.value)}
                                    placeholder="40.7230"
                                    className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none transition"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-neutral-300">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={longitude}
                                    onChange={e => setLongitude(e.target.value)}
                                    placeholder="-74.0020"
                                    className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none transition"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-neutral-300">Delivery Radius (miles)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={deliveryRadius}
                                    onChange={e => setDeliveryRadius(e.target.value)}
                                    placeholder="10"
                                    className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white placeholder:text-neutral-600 focus:border-white focus:outline-none transition"
                                />
                                <p className="text-xs text-neutral-500">How far from this store Snatchd will deliver. Leave blank to use the global default (10 mi).</p>
                            </div>
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

                    {/* Inventory source */}
                    <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Inventory source</h3>
                                <p className="text-sm text-neutral-400 mt-1">Where this location's products, prices, sizes and availability come from.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {savedProducts.length > 0 && (
                                    <>
                                        <button onClick={() => setAllShown(true)} disabled={bulking}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-xs font-medium hover:bg-green-500/20 transition disabled:opacity-50">
                                            {bulking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                            Show all
                                        </button>
                                        <button onClick={() => setAllShown(false)} disabled={bulking}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-neutral-300 rounded text-xs font-medium hover:bg-white/10 transition disabled:opacity-50">
                                            <EyeOff className="h-3 w-3" /> Hide all
                                        </button>
                                    </>
                                )}
                                <button onClick={reloadProducts} disabled={reloading}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-neutral-300 rounded text-xs font-medium hover:bg-white/10 transition disabled:opacity-50">
                                    {reloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                    Reload
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {([
                                { v: "shopify", t: "Shopify catalog",  d: "Any brand on a standard Shopify store — paste the domain" },
                                { v: "bergdorf", t: "Bergdorf runner", d: "Their own per-store count, read by the Mac runner. Nightly catalog, 10:30 & 15:00, live on open." },
                                { v: "zara",     t: "Zara store stock", d: "Zara's own per-size count at one store, via parse.bot. 10:30 & 15:00, live on open. Metered." },
                                { v: "manual",  t: "No live source",   d: "Products stay as they are. A Snatcher confirms stock in store." },
                            ] as const).map(o => (
                                <button key={o.v} type="button" onClick={() => setInventorySource(o.v)}
                                    className={`text-left rounded-lg border p-4 transition ${inventorySource === o.v ? "border-white bg-white/5" : "border-neutral-800 hover:border-neutral-600"}`}>
                                    <p className="font-semibold text-white text-sm">{o.t}</p>
                                    <p className="text-xs text-neutral-500 mt-1">{o.d}</p>
                                </button>
                            ))}
                        </div>

                        {inventorySource === "shopify" && (
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-neutral-300">Store domain</label>
                                <input type="text" value={sourceDomain} onChange={e => setSourceDomain(e.target.value.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))}
                                    placeholder="kith.com"
                                    className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white font-mono text-sm placeholder:text-neutral-600 focus:border-white focus:outline-none transition" />
                                <p className="text-xs text-neutral-500">Verified working: kith.com, aloyoga.com, aimeleondore.com. Anything that serves /products.json.</p>
                            </div>
                        )}

                        {inventorySource === "zara" && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-neutral-300">Zara store</label>
                                    <select value={sourceStoreId} onChange={e => setSourceStoreId(e.target.value)}
                                        className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white text-sm focus:border-white focus:outline-none transition">
                                        <option value="3862">SoHo · 503 Broadway (3862)</option>
                                        <option value="3818">Fifth Ave · 500 Fifth (3818)</option>
                                        <option value="3037">Flatiron · 101 Fifth (3037)</option>
                                        <option value="3904">FiDi · 222 Broadway (3904)</option>
                                        <option value="3074">Herald Sq · 39 W 34th (3074)</option>
                                        <option value="11818">Hudson Yards (11818)</option>
                                        <option value="3946">Lincoln Sq · 1963 Broadway (3946)</option>
                                    </select>
                                    <p className="text-xs text-neutral-500">Stock is read for this one store. One Zara store per Snatchd store.</p>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-neutral-300">Catalog searches</label>
                                    <input type="text" value={sourceQuery} onChange={e => setSourceQuery(e.target.value)}
                                        placeholder="blazer, jeans, dress, coat, knit, shirt, trousers, skirt"
                                        className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white font-mono text-sm placeholder:text-neutral-600 focus:border-white focus:outline-none transition" />
                                    <p className="text-xs text-neutral-500">Comma-separated. Each term is one search (~36 products). Sizes and photos arrive with the sync; the SoHo count runs on products you Show.</p>
                                </div>
                            </div>
                        )}

                        {inventorySource === "bergdorf" && (
                            <p className="text-xs text-neutral-400 rounded-lg border border-white/10 bg-black/40 p-3">
                                Products arrive from the runner (<span className="font-mono">tools/bergdorf-runner</span>). New items land hidden — use <strong className="text-white">Show</strong> on the rows below to carry them. Save the source so the app knows to ask the runner for live checks.
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            {inventorySource === "bergdorf" ? (
                                <button onClick={saveSource} disabled={savingSource}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-bold hover:bg-neutral-200 transition disabled:opacity-50">
                                    {savingSource ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save source"}
                                </button>
                            ) : inventorySource !== "manual" ? (
                                <>
                                    <button onClick={handleSyncCatalog} disabled={syncing || (inventorySource === "shopify" && !sourceDomain.trim())}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-bold hover:bg-neutral-200 transition disabled:opacity-50">
                                        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                        {syncing ? "Working…" : "Sync catalog now"}
                                    </button>
                                    <button onClick={handleRefreshStock} disabled={syncing || savedProducts.length === 0}
                                        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-200 rounded-md text-sm font-medium hover:bg-neutral-700 transition disabled:opacity-50">
                                        Refresh availability
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={saveSource} disabled={savingSource}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-bold hover:bg-neutral-200 transition disabled:opacity-50">
                                        {savingSource ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save source"}
                                    </button>
                                </>
                            )}
                            {sourceSaved && <span className="flex items-center gap-1 text-sm text-green-400"><CheckCircle className="h-4 w-4" /> Saved — source is {inventorySource}</span>}
                            {syncResult && <span className={`text-sm ${syncResult.includes("failed") ? "text-red-400" : "text-green-400"}`}>{syncResult}</span>}
                        </div>
                    </div>

                    {savedProducts.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-neutral-900/50 overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-white">Current Inventory</h4>
                                    <p className="text-xs text-neutral-400 mt-0.5">{savedProducts.filter(p => p.isActive !== false).length} shown in app · {savedProducts.length} total</p>
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
                                            <th className="px-4 py-2 font-medium">In stock</th>
                                            <th className="px-4 py-2 font-medium">In app</th>
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
                                                <td className="px-4 py-2 text-xs">
                                                    {(() => {
                                                        const a = p.availability || {}; const vals = Object.values(a) as string[];
                                                        const inStock = vals.filter(v => v === "in_stock").length;
                                                        if (!vals.length || p.availabilitySource === "none") return <span className="text-neutral-500">not checked yet</span>;
                                                        const src = p.availabilitySource === "zara" || p.availabilitySource === "bergdorf" ? "at store"
                                                            : p.availabilitySource === "zara_online" || p.availabilitySource === "shopify" || p.availabilitySource === "skims" ? "online" : "";
                                                        return <span className={inStock ? "text-green-400" : "text-red-400"}>{inStock}/{vals.length} sizes{src && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-neutral-500">{src}</span>}</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {p.discontinued ? <span className="text-xs text-neutral-500">No longer sold</span> : (
                                                    <button onClick={() => toggleShown(p)}
                                                        className={`px-2 py-1 rounded text-xs font-medium border transition ${p.isActive === false ? "border-neutral-700 text-neutral-400 hover:text-white" : "border-green-500/30 bg-green-500/10 text-green-400"}`}>
                                                        {p.isActive === false ? "Show" : "Shown"}
                                                    </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {savedProducts.length > 0 && (
                        <details className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
                            <summary className="cursor-pointer text-sm text-red-400/80 hover:text-red-400">Danger zone</summary>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <button onClick={handleDeleteAllProducts} disabled={deletingProducts}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded text-xs font-medium hover:bg-red-500/20 transition">
                                    <Trash2 className="h-3 w-3" />
                                    {deletingProducts ? "Deleting…" : `Delete all ${savedProducts.length} products`}
                                </button>
                                <span className="text-xs text-neutral-500">Deletes them from the database. A synced source will bring them back on the next sync.</span>
                            </div>
                        </details>
                    )}

                    {/* Empty State */}
                    {savedProducts.length === 0 && (
                        <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                            <Package className="h-10 w-10 text-neutral-600 mx-auto mb-4" />
                            <h3 className="text-white font-medium mb-2">No products yet</h3>
                            <p className="text-sm text-neutral-500">
                                Pick a source above and sync, or upload a CSV for a manual store.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
