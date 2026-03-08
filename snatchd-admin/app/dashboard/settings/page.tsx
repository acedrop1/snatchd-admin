"use client";

import { useState } from "react";
import { Settings, Upload, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";

// All 12 stores from the Snatchd app — seeded into Firestore so the app shows real data
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

    const handleSeedStores = async () => {
        setSeedStatus("running");
        setResults([]);
        setProgress(0);

        const newResults: StoreResult[] = [];

        for (let i = 0; i < SEED_STORES.length; i++) {
            const store = SEED_STORES[i];
            try {
                // Check if store already exists (avoid duplicates)
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

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-neutral-400">Data management and app configuration.</p>
            </div>

            {/* Seed Stores */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div className="flex items-start justify-between">
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
                </div>

                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex gap-2 text-sm text-yellow-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>This is safe to run multiple times — it skips stores that already exist. Only runs <strong>adds</strong>, never deletes.</span>
                </div>

                {/* Progress Bar */}
                {seedStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Seeding stores...</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Results */}
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
