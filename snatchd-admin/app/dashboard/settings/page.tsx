"use client";

import { useState, useEffect } from "react";
import { Settings, Upload, CheckCircle, XCircle, Loader2, AlertTriangle, FlaskConical, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

// ── Multi-location stores — each entry is a distinct physical location ───────
const SEED_MULTI_LOCATION_STORES = [
    // ── Apple ────────────────────────────────────────────────────────────────
    {
        name: "Apple SoHo",
        description: "Apple retail store in SoHo — iPhone, Mac, iPad, and accessories.",
        category: "Electronics",
        categories: ["Electronics", "Accessories"],
        deliveryTime: "35 Mins",
        address: "103 Prince St, New York, NY 10012",
        latitude: 40.7254,
        longitude: -73.9971,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Apple Fifth Avenue",
        description: "Apple's iconic 24-hour glass cube store on Fifth Avenue.",
        category: "Electronics",
        categories: ["Electronics", "Accessories"],
        deliveryTime: "40 Mins",
        address: "767 5th Ave, New York, NY 10153",
        latitude: 40.7636,
        longitude: -73.9727,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Apple Upper West Side",
        description: "Apple retail store on the Upper West Side.",
        category: "Electronics",
        categories: ["Electronics", "Accessories"],
        deliveryTime: "40 Mins",
        address: "1981 Broadway, New York, NY 10023",
        latitude: 40.7676,
        longitude: -73.9820,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Apple Grand Central",
        description: "Apple retail store inside Grand Central Terminal.",
        category: "Electronics",
        categories: ["Electronics", "Accessories"],
        deliveryTime: "40 Mins",
        address: "45 Grand Central Terminal, New York, NY 10017",
        latitude: 40.7527,
        longitude: -73.9773,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    // ── Zara ─────────────────────────────────────────────────────────────────
    {
        name: "Zara SoHo",
        description: "Zara's flagship SoHo store — women's, men's, and kids' fashion.",
        category: "Fast Fashion",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "35 Mins",
        address: "580 Broadway, New York, NY 10012",
        latitude: 40.7239,
        longitude: -73.9982,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Zara Fifth Avenue",
        description: "Zara on Fifth Avenue — multi-floor fashion destination.",
        category: "Fast Fashion",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "666 5th Ave, New York, NY 10103",
        latitude: 40.7596,
        longitude: -73.9789,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Zara Columbus Circle",
        description: "Zara at the Time Warner Center, Columbus Circle.",
        category: "Fast Fashion",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "10 Columbus Circle, New York, NY 10019",
        latitude: 40.7683,
        longitude: -73.9836,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Zara Midtown East",
        description: "Zara on Lexington Avenue in Midtown East.",
        category: "Fast Fashion",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "750 Lexington Ave, New York, NY 10022",
        latitude: 40.7628,
        longitude: -73.9674,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    // ── Aesop ─────────────────────────────────────────────────────────────────
    {
        name: "Aesop West Village",
        description: "Aesop skincare boutique in the West Village.",
        category: "Luxury Boutique",
        categories: ["Beauty & Skincare", "Hygiene"],
        deliveryTime: "45 Mins",
        address: "232 W 10th St, New York, NY 10014",
        latitude: 40.7327,
        longitude: -74.0058,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Aesop Upper East Side",
        description: "Aesop skincare boutique on Madison Avenue, UES.",
        category: "Luxury Boutique",
        categories: ["Beauty & Skincare", "Hygiene"],
        deliveryTime: "45 Mins",
        address: "870 Madison Ave, New York, NY 10021",
        latitude: 40.7710,
        longitude: -73.9643,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    // ── Alo ───────────────────────────────────────────────────────────────────
    {
        name: "Alo Upper East Side",
        description: "Alo Yoga flagship on the Upper East Side.",
        category: "Activewear",
        categories: ["Activewear", "Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "981 Madison Ave, New York, NY 10075",
        latitude: 40.7731,
        longitude: -73.9635,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Alo Flatiron",
        description: "Alo Yoga store in the Flatiron District.",
        category: "Activewear",
        categories: ["Activewear", "Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "156 5th Ave, New York, NY 10010",
        latitude: 40.7411,
        longitude: -73.9891,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
];

// ── All 12 core Snatchd stores ────────────────────────────────────────────────
const SEED_STORES = [
    {
        name: "Louis Vuitton",
        description: "Iconic French luxury fashion house known for its monogram canvas goods, ready-to-wear, and accessories.",
        category: "Luxury Fashion",
        categories: ["Luxury Fashion", "Accessories", "Clothing"],
        deliveryTime: "35 Mins",
        address: "116 Greene St, New York, NY 10012",
        latitude: 40.7243,
        longitude: -74.0004,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Nike",
        description: "World's leading athletic footwear and apparel brand.",
        category: "Sportswear",
        categories: ["Sportswear", "Shoes", "Clothing"],
        deliveryTime: "45 Mins",
        address: "529 Broadway, New York, NY 10012",
        latitude: 40.7228,
        longitude: -73.9981,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Aime Leon Dore",
        description: "New York-based label blending sportswear, tailoring, and vintage references.",
        category: "Streetwear",
        categories: ["Streetwear", "Clothing", "Accessories"],
        deliveryTime: "50 Mins",
        address: "232 Mulberry St, New York, NY 10012",
        latitude: 40.7224,
        longitude: -73.9963,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Kith",
        description: "Lifestyle brand and retailer blending fashion, food, and culture.",
        category: "Streetwear",
        categories: ["Streetwear", "Clothing", "Shoes"],
        deliveryTime: "40 Mins",
        address: "337 Lafayette St, New York, NY 10012",
        latitude: 40.7256,
        longitude: -73.9962,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Miu Miu",
        description: "Prada's sister label — playfully intellectual, feminine, and eccentric.",
        category: "Luxury Fashion",
        categories: ["Luxury Fashion", "Clothing", "Accessories"],
        deliveryTime: "35 Mins",
        address: "100 Prince St, New York, NY 10012",
        latitude: 40.7254,
        longitude: -74.0002,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Jacquemus",
        description: "Provençal French brand known for its minimalist, sun-soaked aesthetic.",
        category: "Luxury Fashion",
        categories: ["Luxury Fashion", "Clothing", "Accessories"],
        deliveryTime: "45 Mins",
        address: "98 Prince St, New York, NY 10012",
        latitude: 40.7252,
        longitude: -73.9999,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Bergdorf Goodman",
        description: "New York's premier luxury department store on Fifth Avenue.",
        category: "Luxury Department Store",
        categories: ["Luxury Fashion", "Beauty & Skincare", "Fine Jewelry", "Clothing"],
        deliveryTime: "60 Mins",
        address: "754 5th Ave, New York, NY 10019",
        latitude: 40.7641,
        longitude: -73.9727,
        deliveryRadius: 10,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Alo",
        description: "Mindful movement brand for yoga, fitness, and beyond.",
        category: "Activewear",
        categories: ["Activewear", "Clothing", "Accessories"],
        deliveryTime: "30 Mins",
        address: "136 Prince St, New York, NY 10012",
        latitude: 40.7256,
        longitude: -74.0008,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Cos",
        description: "Modern, functional, and considered design for women and men.",
        category: "Modern Essentials",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "129 Spring St, New York, NY 10012",
        latitude: 40.7248,
        longitude: -74.0009,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Aesop",
        description: "Australian skincare brand formulated from plant-based and laboratory-made ingredients.",
        category: "Luxury Boutique",
        categories: ["Beauty & Skincare", "Hygiene"],
        deliveryTime: "60 Mins",
        address: "87 Greene St, New York, NY 10012",
        latitude: 40.7238,
        longitude: -74.0003,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Chanel",
        description: "Timeless French luxury house — fashion, fragrance, beauty, and fine jewelry.",
        category: "Beauty & Fragrance",
        categories: ["Beauty & Skincare", "Fine Jewelry", "Clothing", "Fragrance"],
        deliveryTime: "55 Mins",
        address: "15 E 57th St, New York, NY 10022",
        latitude: 40.7625,
        longitude: -73.9726,
        deliveryRadius: 10,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Skims",
        description: "Solutions-oriented brand creating the next generation of basics by Kim Kardashian.",
        category: "Modern Basics",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "494 Broadway, New York, NY 10012",
        latitude: 40.7221,
        longitude: -73.9986,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
];

type SeedStatus = "idle" | "running" | "done" | "error";
type StoreResult = { name: string; status: "added" | "skipped" | "error"; message?: string };

export default function SettingsPage() {
    const [seedStatus, setSeedStatus] = useState<SeedStatus>("idle");
    const [results, setResults] = useState<StoreResult[]>([]);
    const [progress, setProgress] = useState(0);

    // Multi-location seed state
    const [multiSeedStatus, setMultiSeedStatus] = useState<SeedStatus>("idle");
    const [multiResults, setMultiResults] = useState<StoreResult[]>([]);
    const [multiProgress, setMultiProgress] = useState(0);

    // Delete all products state
    const [deleteProductsStatus, setDeleteProductsStatus] = useState<SeedStatus>("idle");
    const [deleteProductsCount, setDeleteProductsCount] = useState(0);

    // Zara product seed state
    const [zaraStatus, setZaraStatus] = useState<SeedStatus>("idle");
    const [zaraProgress, setZaraProgress] = useState(0);
    const [zaraTotal, setZaraTotal] = useState(0);
    const [zaraCount, setZaraCount] = useState(0);
    const [zaraError, setZaraError] = useState<string | null>(null);

    // Skims product seed state
    const [skimsStatus, setSkimsStatus] = useState<SeedStatus>("idle");
    const [skimsProgress, setSkimsProgress] = useState(0);
    const [skimsTotal, setSkimsTotal] = useState(0);
    const [skimsCount, setSkimsCount] = useState(0);
    const [skimsError, setSkimsError] = useState<string | null>(null);

    // Jacquemus product seed state
    const [jacquemusStatus, setJacquemusStatus] = useState<SeedStatus>("idle");
    const [jacquemusProgress, setJacquemusProgress] = useState(0);
    const [jacquemusTotal, setJacquemusTotal] = useState(0);
    const [jacquemusCount, setJacquemusCount] = useState(0);
    const [jacquemusError, setJacquemusError] = useState<string | null>(null);

    // Revert store images state
    const [revertStatus, setRevertStatus] = useState<SeedStatus>("idle");
    const [revertResults, setRevertResults] = useState<StoreResult[]>([]);

    // Test mode state
    const [testMode, setTestMode] = useState<boolean>(false);
    const [testModeLoading, setTestModeLoading] = useState(false);
    const [testModeLoaded, setTestModeLoaded] = useState(false);

    // Delivery fees state
    const [standardFee, setStandardFee] = useState<string>("6.00");
    const [priorityFee, setPriorityFee] = useState<string>("6.99");
    const [feesLoading, setFeesLoading] = useState(false);
    const [feesSaved, setFeesSaved] = useState(false);

    // Load test mode + fees from Firestore on mount
    useEffect(() => {
        getDoc(doc(db, "config", "app")).then((snap) => {
            if (snap.exists()) setTestMode(snap.data()?.testMode ?? false);
            setTestModeLoaded(true);
        });
        getDoc(doc(db, "config", "fees")).then((snap) => {
            if (snap.exists()) {
                setStandardFee(String(snap.data()?.standardFee ?? "6.00"));
                setPriorityFee(String(snap.data()?.priorityFee ?? "6.99"));
            }
        });
    }, []);

    const saveFees = async () => {
        const std = parseFloat(standardFee);
        const pri = parseFloat(priorityFee);
        if (isNaN(std) || isNaN(pri) || std < 0 || pri < 0) return;
        setFeesLoading(true);
        try {
            await setDoc(doc(db, "config", "fees"), { standardFee: std, priorityFee: pri }, { merge: true });
            setFeesSaved(true);
            setTimeout(() => setFeesSaved(false), 3000);
        } catch (e) {
            console.error("Failed to save fees", e);
        } finally {
            setFeesLoading(false);
        }
    };

    const handleSeedStores = async () => {
        setSeedStatus("running");
        setResults([]);
        setProgress(0);

        const newResults: StoreResult[] = [];

        for (let i = 0; i < SEED_STORES.length; i++) {
            const store = SEED_STORES[i];
            try {
                const existing = await getDocs(
                    query(collection(db, "stores"), where("name", "==", store.name))
                );

                if (!existing.empty) {
                    newResults.push({ name: store.name, status: "skipped", message: "Already exists" });
                } else {
                    await addDoc(collection(db, "stores"), {
                        ...store,
                        rating: 5.0,
                        isActive: true,
                        createdAt: serverTimestamp(),
                    });
                    newResults.push({ name: store.name, status: "added" });
                }
            } catch (err: any) {
                newResults.push({ name: store.name, status: "error", message: err.message });
            }

            setProgress(Math.round(((i + 1) / SEED_STORES.length) * 100));
            setResults([...newResults]);
        }

        const hasError = newResults.some(r => r.status === "error");
        setSeedStatus(hasError ? "error" : "done");
    };

    const added = results.filter(r => r.status === "added").length;
    const skipped = results.filter(r => r.status === "skipped").length;
    const errors = results.filter(r => r.status === "error").length;

    const handleSeedMultiLocationStores = async () => {
        setMultiSeedStatus("running");
        setMultiResults([]);
        setMultiProgress(0);

        const newResults: StoreResult[] = [];

        for (let i = 0; i < SEED_MULTI_LOCATION_STORES.length; i++) {
            const store = SEED_MULTI_LOCATION_STORES[i];
            try {
                const existing = await getDocs(
                    query(collection(db, "stores"), where("name", "==", store.name))
                );

                if (!existing.empty) {
                    newResults.push({ name: store.name, status: "skipped", message: "Already exists" });
                } else {
                    await addDoc(collection(db, "stores"), {
                        ...store,
                        rating: 5.0,
                        isActive: true,
                        createdAt: serverTimestamp(),
                    });
                    newResults.push({ name: store.name, status: "added" });
                }
            } catch (err: any) {
                newResults.push({ name: store.name, status: "error", message: err.message });
            }

            setMultiProgress(Math.round(((i + 1) / SEED_MULTI_LOCATION_STORES.length) * 100));
            setMultiResults([...newResults]);
        }

        const hasError = newResults.some(r => r.status === "error");
        setMultiSeedStatus(hasError ? "error" : "done");
    };

    const multiAdded = multiResults.filter(r => r.status === "added").length;
    const multiSkipped = multiResults.filter(r => r.status === "skipped").length;
    const multiErrors = multiResults.filter(r => r.status === "error").length;

    // ── Delete All Products ─────────────────────────────────────────────────
    // One-time cleanup: removes every document in the products collection.
    const handleDeleteAllProducts = async () => {
        setDeleteProductsStatus("running");
        setDeleteProductsCount(0);
        try {
            const snap = await getDocs(collection(db, "products"));
            let count = 0;
            for (const d of snap.docs) {
                await deleteDoc(doc(db, "products", d.id));
                count++;
                setDeleteProductsCount(count);
            }
            setDeleteProductsStatus("done");
        } catch (err: any) {
            console.error("Delete products error:", err);
            setDeleteProductsStatus("error");
        }
    };

    // ── Seed Zara Products Handler ──────────────────────────────────────────
    const ZARA_STORE_IDS = [
        "Du7deSoLiKbUbmoxSxDx", // Zara Midtown East
        "NXOeqVgXuiEKkBG9q4qm", // Zara SoHo
        "Szsli4dmIh7gUWr5gysP", // Zara Fifth Avenue
        "iIsoy8QfKuYWgFvTsnkD", // Zara Columbus Circle
    ];

    const handleSeedZaraProducts = async () => {
        setZaraStatus("running");
        setZaraProgress(0);
        setZaraCount(0);
        setZaraTotal(0);
        setZaraError(null);

        try {
            const res = await fetch("/api/zara-seed");
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? `HTTP ${res.status}`);
            }
            const { products } = await res.json();
            const total = products.length * ZARA_STORE_IDS.length;
            setZaraTotal(total);

            let written = 0;
            for (const product of products) {
                for (const storeId of ZARA_STORE_IDS) {
                    const docId = `zara_${product.externalId}_${storeId}`;
                    await setDoc(doc(db, "products", docId), {
                        ...product,
                        storeId,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                    written++;
                    setZaraCount(written);
                    setZaraProgress(Math.round((written / total) * 100));
                }
            }

            setZaraStatus("done");
        } catch (err: any) {
            setZaraError(err.message ?? "Unknown error");
            setZaraStatus("error");
        }
    };

    // ── Seed Skims Products Handler ─────────────────────────────────────────
    const handleSeedSkimsProducts = async () => {
        setSkimsStatus("running");
        setSkimsProgress(0);
        setSkimsCount(0);
        setSkimsTotal(0);
        setSkimsError(null);

        try {
            // Look up the Skims store ID dynamically
            const storeSnap = await getDocs(
                query(collection(db, "stores"), where("name", "==", "Kith"))
            );
            if (storeSnap.empty) {
                throw new Error('Kith store not found in Firestore — run "Seed All Stores" first.');
            }
            const skimsStoreId = storeSnap.docs[0].id;

            const res = await fetch("/api/skims-seed");
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? `HTTP ${res.status}`);
            }
            const { products } = await res.json();
            setSkimsTotal(products.length);

            let written = 0;
            for (const product of products) {
                const docId = `kith_${product.externalId}_${skimsStoreId}`;
                await setDoc(doc(db, "products", docId), {
                    ...product,
                    storeId: skimsStoreId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                written++;
                setSkimsCount(written);
                setSkimsProgress(Math.round((written / products.length) * 100));
            }

            setSkimsStatus("done");
        } catch (err: any) {
            setSkimsError(err.message ?? "Unknown error");
            setSkimsStatus("error");
        }
    };

    // ── Jacquemus Products Handler ───────────────────────────────────────────
    const handleSeedJacquemusProducts = async () => {
        setJacquemusStatus("running");
        setJacquemusProgress(0);
        setJacquemusCount(0);
        setJacquemusTotal(0);
        setJacquemusError(null);

        try {
            const storeSnap = await getDocs(
                query(collection(db, "stores"), where("name", "==", "Jacquemus"))
            );
            if (storeSnap.empty) {
                throw new Error('Jacquemus store not found in Firestore — run "Seed All Stores" first.');
            }
            const jacquemusStoreId = storeSnap.docs[0].id;

            const res = await fetch("/api/jacquemus-seed");
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? `HTTP ${res.status}`);
            }
            const { products } = await res.json();
            setJacquemusTotal(products.length);

            let written = 0;
            for (const product of products) {
                const docId = `jacquemus_${product.externalId}_${jacquemusStoreId}`;
                await setDoc(doc(db, "products", docId), {
                    ...product,
                    storeId: jacquemusStoreId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                written++;
                setJacquemusCount(written);
                setJacquemusProgress(Math.round((written / products.length) * 100));
            }

            setJacquemusStatus("done");
        } catch (err: any) {
            setJacquemusError(err.message ?? "Unknown error");
            setJacquemusStatus("error");
        }
    };

    // ── Revert Store Images Handler ─────────────────────────────────────────
    const handleRevertStoreImages = async () => {
        setRevertStatus("running");
        setRevertResults([]);
        const newResults: StoreResult[] = [];
        try {
            const snap = await getDocs(collection(db, "stores"));
            for (const d of snap.docs) {
                try {
                    await updateDoc(doc(db, "stores", d.id), { image: "", logo: "" });
                    newResults.push({ name: d.data().name ?? d.id, status: "added" });
                } catch (err: any) {
                    newResults.push({ name: d.data().name ?? d.id, status: "error", message: err.message });
                }
                setRevertResults([...newResults]);
            }
        } catch (err: any) {
            newResults.push({ name: "Fetch all stores", status: "error", message: err.message });
            setRevertResults([...newResults]);
        }
        setRevertStatus(newResults.some(r => r.status === "error") ? "error" : "done");
    };

    const revertDone = revertResults.filter(r => r.status === "added").length;
    const revertErrors = revertResults.filter(r => r.status === "error").length;

    // ── Test Mode Handler ───────────────────────────────────────────────────
    const toggleTestMode = async () => {
        setTestModeLoading(true);
        const next = !testMode;
        try {
            await setDoc(doc(db, "config", "app"), { testMode: next }, { merge: true });
            setTestMode(next);
        } catch (err) {
            console.error("Failed to toggle test mode", err);
        }
        setTestModeLoading(false);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-neutral-400">Data management and app configuration.</p>
            </div>

            {/* Seed Stores */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload className="h-5 w-5 text-blue-400" />
                        Seed All Stores to Firestore
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Pushes all 12 Snatchd stores (Louis Vuitton, Nike, ALD, Kith, Miu Miu, Jacquemus,
                        Bergdorf, Alo, Cos, Aesop, Chanel, Skims) into Firestore with their names,
                        descriptions, addresses, and coordinates. Skips any store that already exists.
                        After seeding, upload images via the Stores page.
                    </p>
                </div>

                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex gap-2 text-sm text-yellow-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Safe to run multiple times — skips stores that already exist. Never deletes.</span>
                </div>

                {seedStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Seeding stores...</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-2">
                        {(seedStatus === "done" || seedStatus === "error") && (
                            <p className="text-sm font-medium text-neutral-300">
                                {added} added · {skipped} skipped · {errors} errors
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                            {results.map((r) => (
                                <div
                                    key={r.name}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                                        r.status === "added"
                                            ? "border-green-500/30 bg-green-500/10 text-green-300"
                                            : r.status === "skipped"
                                            ? "border-neutral-700 bg-neutral-800/50 text-neutral-400"
                                            : "border-red-500/30 bg-red-500/10 text-red-300"
                                    }`}
                                >
                                    {r.status === "added" ? (
                                        <CheckCircle className="h-4 w-4 shrink-0" />
                                    ) : r.status === "skipped" ? (
                                        <span className="h-4 w-4 shrink-0 text-center text-xs">—</span>
                                    ) : (
                                        <XCircle className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{r.name}</span>
                                    {r.message && <span className="text-xs opacity-70 truncate">({r.message})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSeedStores}
                    disabled={seedStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-neutral-200 transition disabled:opacity-50"
                >
                    {seedStatus === "running" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Seeding...</>
                    ) : seedStatus === "done" ? (
                        <><CheckCircle className="h-4 w-4" /> Seed Again</>
                    ) : (
                        <><Upload className="h-4 w-4" /> Seed All 12 Stores</>
                    )}
                </button>
            </div>

            {/* Seed Multi-Location Stores */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload className="h-5 w-5 text-purple-400" />
                        Seed Multi-Location Stores (Location Filtering)
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Seeds Apple (SoHo, 5th Ave, UWS, Grand Central), Zara (SoHo, 5th Ave, Columbus Circle,
                        Midtown East), Aesop (West Village, UES), and Alo (UES, Flatiron) — each as a separate
                        Firestore document with neighborhood-specific lat/lng. The iOS app uses GPS to show
                        only the stores near the user.
                    </p>
                </div>

                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 flex gap-2 text-sm text-purple-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Run this <strong>after</strong> the main seed above. Add products to each location separately via the Stores page.</span>
                </div>

                {multiSeedStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Seeding multi-location stores...</span>
                            <span>{multiProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${multiProgress}%` }} />
                        </div>
                    </div>
                )}

                {multiResults.length > 0 && (
                    <div className="space-y-2">
                        {(multiSeedStatus === "done" || multiSeedStatus === "error") && (
                            <p className="text-sm font-medium text-neutral-300">
                                {multiAdded} added · {multiSkipped} skipped · {multiErrors} errors
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                            {multiResults.map((r) => (
                                <div key={r.name} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                                    r.status === "added" ? "border-green-500/30 bg-green-500/10 text-green-300"
                                    : r.status === "skipped" ? "border-neutral-700 bg-neutral-800/50 text-neutral-400"
                                    : "border-red-500/30 bg-red-500/10 text-red-300"
                                }`}>
                                    {r.status === "added" ? <CheckCircle className="h-4 w-4 shrink-0" />
                                    : r.status === "skipped" ? <span className="h-4 w-4 shrink-0 text-center text-xs">—</span>
                                    : <XCircle className="h-4 w-4 shrink-0" />}
                                    <span className="font-medium truncate">{r.name}</span>
                                    {r.message && <span className="text-xs opacity-70 truncate">({r.message})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSeedMultiLocationStores}
                    disabled={multiSeedStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-500 transition disabled:opacity-50"
                >
                    {multiSeedStatus === "running" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Seeding...</>
                    ) : multiSeedStatus === "done" ? (
                        <><CheckCircle className="h-4 w-4" /> Seed Again</>
                    ) : (
                        <><Upload className="h-4 w-4" /> Seed 12 Multi-Location Stores</>
                    )}
                </button>
            </div>

            {/* Seed Zara Products */}
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload className="h-5 w-5 text-teal-400" />
                        Seed Zara New In — Products
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Fetches up to 30 products from Zara's live "New In Women" collection and writes
                        them to all 4 Zara locations (Midtown East, SoHo, Fifth Avenue, Columbus Circle).
                        Uses deterministic doc IDs so re-running is safe — existing products are upserted, not duplicated.
                    </p>
                </div>

                <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-3 flex gap-2 text-sm text-teal-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Safe to run multiple times — overwrites with the latest Zara data. Run daily to keep products fresh.</span>
                </div>

                {zaraStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Writing products to Firestore… ({zaraCount} / {zaraTotal || "?"})</span>
                            <span>{zaraProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${zaraProgress}%` }} />
                        </div>
                    </div>
                )}

                {zaraStatus === "done" && (
                    <p className="text-sm text-green-300 font-medium">
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                        {zaraCount} product docs written across {ZARA_STORE_IDS.length} Zara locations.
                    </p>
                )}

                {zaraStatus === "error" && (
                    <p className="text-sm text-red-300 font-medium">
                        <XCircle className="inline h-4 w-4 mr-1" />
                        {zaraError ?? "Something went wrong. Check the console."}
                    </p>
                )}

                <button
                    onClick={handleSeedZaraProducts}
                    disabled={zaraStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-500 transition disabled:opacity-50"
                >
                    {zaraStatus === "running" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Seeding Zara…</>
                    ) : zaraStatus === "done" ? (
                        <><CheckCircle className="h-4 w-4" /> Seed Again</>
                    ) : (
                        <><Upload className="h-4 w-4" /> Seed Zara Products</>
                    )}
                </button>
            </div>

            {/* Seed Skims Products */}
            <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload className="h-5 w-5 text-pink-400" />
                        Seed Kith — Products
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Fetches up to 30 live products from Kith's public Shopify store and writes
                        them to the Kith location in Firestore. Uses Shopify's free
                        <code className="text-pink-300"> /products.json</code> endpoint — no scraping, no auth needed.
                        Safe to re-run; existing products are upserted with the latest data.
                    </p>
                </div>

                <div className="rounded-lg border border-pink-500/30 bg-pink-500/10 p-3 flex gap-2 text-sm text-pink-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Requires the Kith store to exist in Firestore — run <strong>Seed All Stores</strong> first if you haven't already.</span>
                </div>

                {skimsStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Writing products… ({skimsCount} / {skimsTotal || "?"})</span>
                            <span>{skimsProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full transition-all duration-300" style={{ width: `${skimsProgress}%` }} />
                        </div>
                    </div>
                )}

                {skimsStatus === "done" && (
                    <p className="text-sm text-green-300 font-medium">
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                        {skimsCount} Kith products written to Firestore.
                    </p>
                )}

                {skimsStatus === "error" && (
                    <p className="text-sm text-red-300 font-medium">
                        <XCircle className="inline h-4 w-4 mr-1" />
                        {skimsError ?? "Something went wrong. Check the console."}
                    </p>
                )}

                <button
                    onClick={handleSeedSkimsProducts}
                    disabled={skimsStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-pink-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-600 transition disabled:opacity-50"
                >
                    {skimsStatus === "running" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Seeding Kith…</>
                    ) : skimsStatus === "done" ? (
                        <><CheckCircle className="h-4 w-4" /> Seed Again</>
                    ) : (
                        <><Upload className="h-4 w-4" /> Seed Kith Products</>
                    )}
                </button>
            </div>

            {/* Seed Jacquemus Products */}
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload className="h-5 w-5 text-purple-400" />
                        Seed Jacquemus — Products
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Writes 145 live products from Jacquemus's Women New In collection to the Jacquemus store in Firestore.
                        Includes real product names, prices, descriptions, and size guides scraped directly from jacquemus.com.
                        Safe to re-run; existing products are upserted.
                    </p>
                </div>

                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 flex gap-2 text-sm text-purple-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Requires the Jacquemus store to exist in Firestore — run <strong>Seed All Stores</strong> first if you haven't already.</span>
                </div>

                {jacquemusStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Writing products… ({jacquemusCount} / {jacquemusTotal || "?"})</span>
                            <span>{jacquemusProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${jacquemusProgress}%` }} />
                        </div>
                    </div>
                )}

                {jacquemusStatus === "done" && (
                    <p className="text-sm text-green-300 font-medium">
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                        {jacquemusCount} Jacquemus products written to Firestore.
                    </p>
                )}

                {jacquemusStatus === "error" && (
                    <p className="text-sm text-red-300 font-medium">
                        <XCircle className="inline h-4 w-4 mr-1" />
                        {jacquemusError ?? "Something went wrong. Check the console."}
                    </p>
                )}

                <button
                    onClick={handleSeedJacquemusProducts}
                    disabled={jacquemusStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-purple-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-600 transition disabled:opacity-50"
                >
                    {jacquemusStatus === "running" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Seeding Jacquemus…</>
                    ) : jacquemusStatus === "done" ? (
                        <><CheckCircle className="h-4 w-4" /> Seed Again</>
                    ) : (
                        <><Upload className="h-4 w-4" /> Seed Jacquemus Products</>
                    )}
                </button>
            </div>

            {/* Delete All Products */}
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-orange-400" />
                        Delete All Products
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Permanently deletes every document in the <code className="text-orange-300">products</code> collection.
                        Use this to start fresh before adding real products through the Stores page.
                        Store records and images are not affected.
                    </p>
                </div>
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 flex gap-2 text-sm text-orange-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span><strong>Irreversible.</strong> All products will be permanently removed from Firestore.</span>
                </div>

                {deleteProductsStatus === "done" && (
                    <p className="text-sm text-green-300 font-medium">
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                        {deleteProductsCount} product{deleteProductsCount !== 1 ? "s" : ""} deleted.
                    </p>
                )}
                {deleteProductsStatus === "error" && (
                    <p className="text-sm text-red-300 font-medium">
                        <XCircle className="inline h-4 w-4 mr-1" />
                        Something went wrong. Check the console.
                    </p>
                )}

                <button
                    onClick={handleDeleteAllProducts}
                    disabled={deleteProductsStatus === "running" || deleteProductsStatus === "done"}
                    className="flex items-center gap-2 rounded-lg bg-orange-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition disabled:opacity-50"
                >
                    {deleteProductsStatus === "running" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Deleting ({deleteProductsCount} so far)...</>
                    ) : deleteProductsStatus === "done" ? (
                        <><CheckCircle className="h-4 w-4" /> Done</>
                    ) : (
                        <><Trash2 className="h-4 w-4" /> Delete All Products</>
                    )}
                </button>
            </div>

            {/* Revert Store Images */}
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-400" />
                        Revert Store Images
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Clears the <code className="text-red-300">image</code> and <code className="text-red-300">logo</code> fields
                        on every store back to empty — undoing any accidental overwrites.
                        After running this, go to the <strong className="text-white">Stores page</strong> and
                        re-upload your original images for each store.
                    </p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2 text-sm text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Clears store image URLs for <strong>all</strong> stores. Re-upload via the Stores page after running.</span>
                </div>

                {revertResults.length > 0 && (
                    <div className="space-y-2">
                        {(revertStatus === "done" || revertStatus === "error") && (
                            <p className="text-sm font-medium text-neutral-300">{revertDone} cleared · {revertErrors} errors</p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {revertResults.map((r, i) => (
                                <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs border ${
                                    r.status === "added" ? "border-green-500/30 bg-green-500/10 text-green-300"
                                    : "border-red-500/30 bg-red-500/10 text-red-300"
                                }`}>
                                    {r.status === "added" ? <CheckCircle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
                                    <span className="truncate">{r.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleRevertStoreImages}
                    disabled={revertStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition disabled:opacity-50"
                >
                    {revertStatus === "running" ? <><Loader2 className="h-4 w-4 animate-spin" /> Clearing...</>
                    : revertStatus === "done" ? <><CheckCircle className="h-4 w-4" /> Done — Re-upload via Stores page</>
                    : <><XCircle className="h-4 w-4" /> Clear All Store Images</>}
                </button>
            </div>

            {/* Delivery Fees */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-800">
                        <Settings className="h-5 w-5 text-neutral-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Delivery Fees</h3>
                        <p className="text-sm text-neutral-400">Set the base delivery fees shown to customers at checkout. Changes go live instantly in the app.</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Standard Fee ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={standardFee}
                            onChange={(e) => setStandardFee(e.target.value)}
                            className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                            placeholder="6.00"
                        />
                        <p className="text-xs text-neutral-500">Standard 60–90 min delivery</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Priority Fee ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priorityFee}
                            onChange={(e) => setPriorityFee(e.target.value)}
                            className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                            placeholder="6.99"
                        />
                        <p className="text-xs text-neutral-500">Priority 30–60 min delivery</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={saveFees}
                        disabled={feesLoading}
                        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition disabled:opacity-50"
                    >
                        {feesLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Save Fees"}
                    </button>
                    {feesSaved && <span className="text-sm text-green-400 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Saved — live in app</span>}
                </div>
            </div>

            {/* Test Mode Toggle */}
            <div className={`rounded-xl border p-6 space-y-4 transition-colors ${testMode ? "border-yellow-500/40 bg-yellow-500/5" : "border-white/10 bg-neutral-900/50"}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${testMode ? "bg-yellow-500/20" : "bg-neutral-800"}`}>
                            <FlaskConical className={`h-5 w-5 ${testMode ? "text-yellow-400" : "text-neutral-400"}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Test Mode</h3>
                            <p className="text-sm text-neutral-400">
                                {testMode
                                    ? "ON — iOS app shows a yellow banner. Checkout completes instantly with no real charge."
                                    : "OFF — iOS app behaves normally (simulated checkout)."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTestMode}
                        disabled={testModeLoading || !testModeLoaded}
                        className="shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-50"
                        style={{ background: testMode ? "#eab308" : "#404040", color: testMode ? "#000" : "#fff" }}
                    >
                        {testModeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : testMode
                            ? <><ToggleRight className="h-4 w-4" /> Enabled</>
                            : <><ToggleLeft className="h-4 w-4" /> Disabled</>}
                    </button>
                </div>

                {testMode && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-1.5 text-sm text-yellow-300">
                        <p className="font-semibold">What happens in the iOS app right now:</p>
                        <ul className="space-y-1 text-yellow-200/80 list-disc list-inside text-xs">
                            <li>Yellow "TEST MODE — No real charges" banner appears at top of checkout</li>
                            <li>Payment section shows TEST badge on selected card</li>
                            <li>Stripe test cards pre-loaded (Visa 4242, Amex 5555)</li>
                            <li>Tapping "Place Order" succeeds instantly (0.5s) with no network call</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* How Real-Time Sync Works */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-400" />
                    Real-Time App Sync
                </h3>
                <p className="text-sm text-neutral-400">
                    The iOS app uses live Firestore listeners. Any change you make in this portal — adding a store,
                    uploading a product, editing inventory — is reflected in the customer's app within seconds,
                    with no app restart required.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-1">
                    {[
                        { action: "Add a store", result: "Appears in app instantly" },
                        { action: "Add a product", result: "Shows in store immediately" },
                        { action: "Mark out of stock", result: "Shows SOLD OUT in app" },
                    ].map(item => (
                        <div key={item.action} className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                            <p className="text-xs font-semibold text-white">{item.action}</p>
                            <p className="text-xs text-green-400 mt-1">→ {item.result}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
