"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { Plus, Store as StoreIcon, Loader2, EyeOff, Eye } from "lucide-react";
import { SEED_STORES } from "@/lib/seedStores";

const TAG_META: Record<string, { label: string; color: string }> = {
    foryou:   { label: "#foryou",   color: "bg-purple-500/15 text-purple-300 border-purple-500/20" },
    trending: { label: "#trending", color: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
    "60min":  { label: "#60min",    color: "bg-green-500/15 text-green-300 border-green-500/20" },
};

const FILTER_OPTIONS = [
    { value: "all",      label: "All Stores" },
    { value: "foryou",   label: "#foryou" },
    { value: "trending", label: "#trending" },
    { value: "60min",    label: "#60min" },
    { value: "untagged", label: "Untagged" },
];

export default function StoresPage() {
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [tagFilter, setTagFilter] = useState("all");

    async function toggleVisibility(e: React.MouseEvent, storeId: string, currentIsActive: boolean) {
        e.preventDefault();
        e.stopPropagation();
        setTogglingId(storeId);
        try {
            await updateDoc(doc(db, "stores", storeId), { isActive: !currentIsActive });
            setStores(prev => prev.map(s => s.id === storeId ? { ...s, isActive: !currentIsActive } : s));
        } catch (err) {
            console.error("Failed to toggle visibility", err);
        } finally {
            setTogglingId(null);
        }
    }

    useEffect(() => {
        async function fetchAndAutoSeed() {
            try {
                const querySnapshot = await getDocs(collection(db, "stores"));
                const existing = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const existingNames = new Set(existing.map((s: any) => s.name));
                const toAdd = SEED_STORES.filter(s => !existingNames.has(s.name));

                if (toAdd.length > 0) {
                    await Promise.all(toAdd.map(store =>
                        addDoc(collection(db, "stores"), { ...store, rating: 5.0, isActive: true, createdAt: serverTimestamp() })
                    ));
                    const refreshed = await getDocs(collection(db, "stores"));
                    setStores(refreshed.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } else {
                    setStores(existing);
                }
            } catch (error) {
                console.error("Error fetching stores:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAndAutoSeed();
    }, []);

    const filteredStores = useMemo(() => {
        if (tagFilter === "all") return stores;
        if (tagFilter === "untagged") return stores.filter(s => !s.tags || s.tags.length === 0);
        return stores.filter(s => s.tags?.includes(tagFilter));
    }, [stores, tagFilter]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Stores</h2>
                    <p className="text-neutral-400">Manage brand partners and retail locations.</p>
                </div>
                <Link
                    href="/dashboard/stores/new"
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-md text-sm font-bold text-black hover:bg-neutral-200 transition"
                >
                    <Plus className="h-4 w-4" />
                    Add Store
                </Link>
            </div>

            {/* Tag Filter */}
            {!loading && stores.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    {FILTER_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setTagFilter(opt.value)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                                tagFilter === opt.value
                                    ? "bg-white text-black border-white"
                                    : "bg-transparent text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-white"
                            }`}
                        >
                            {opt.label}
                            <span className="ml-1.5 text-xs opacity-60">
                                {opt.value === "all" ? stores.length
                                    : opt.value === "untagged" ? stores.filter(s => !s.tags || s.tags.length === 0).length
                                    : stores.filter(s => s.tags?.includes(opt.value)).length}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}

            {!loading && stores.length === 0 && (
                <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 mb-4">
                        <StoreIcon className="h-6 w-6 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No stores configured</h3>
                    <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
                        Get started by adding your first retail partner.
                    </p>
                    <Link href="/dashboard/stores/new" className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-md text-sm font-bold text-black hover:bg-neutral-200 transition">
                        Add Store
                    </Link>
                </div>
            )}

            {!loading && filteredStores.length === 0 && stores.length > 0 && (
                <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-center">
                    <p className="text-neutral-500 text-sm">No stores match this filter.</p>
                </div>
            )}

            {/* Store Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredStores.map((store) => {
                    const isActive = store.isActive !== false;
                    const storeTags: string[] = store.tags || [];
                    return (
                        <Link
                            href={`/dashboard/stores/${store.id}`}
                            key={store.id}
                            className={`group relative overflow-hidden rounded-xl border transition block ${
                                isActive
                                    ? "border-white/10 bg-neutral-900/50 hover:bg-neutral-900 hover:ring-1 hover:ring-white/20"
                                    : "border-white/5 bg-neutral-900/20 opacity-50"
                            }`}
                        >
                            {/* Banner/Cover */}
                            <div className="h-32 bg-neutral-800 relative">
                                {store.image ? (
                                    <img src={store.image} alt={store.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-neutral-800">
                                        <StoreIcon className="h-8 w-8 text-neutral-600" />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-[2px]">
                                    <span className="px-4 py-2 bg-white text-black text-sm font-bold rounded-full">Edit Store</span>
                                </div>

                                {!isActive && (
                                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 border border-white/10 text-xs text-neutral-400 font-medium">
                                        <EyeOff className="h-3 w-3" />
                                        Hidden
                                    </div>
                                )}

                                <button
                                    onClick={(e) => toggleVisibility(e, store.id, isActive)}
                                    title={isActive ? "Hide from app" : "Show in app"}
                                    className={`absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                                        isActive
                                            ? "bg-black/60 border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
                                            : "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                                    }`}
                                >
                                    {togglingId === store.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : isActive ? (
                                        <><Eye className="h-3 w-3" /> Visible</>
                                    ) : (
                                        <><EyeOff className="h-3 w-3" /> Hidden</>
                                    )}
                                </button>

                                {/* Logo Badge */}
                                <div className="absolute -bottom-6 left-6 h-12 w-12 rounded-lg border-2 border-black bg-black overflow-hidden shadow-lg z-10">
                                    {store.logo ? (
                                        <img src={store.logo} alt="logo" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full bg-neutral-800" />
                                    )}
                                </div>
                            </div>

                            <div className="p-6 pt-8">
                                <h3 className={`font-bold text-lg mb-1 transition ${isActive ? "text-white group-hover:text-green-400" : "text-neutral-500"}`}>
                                    {store.name}
                                </h3>
                                <p className="text-sm text-neutral-400 line-clamp-2">{store.description || "No description provided."}</p>

                                {/* Categories */}
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {store.categories?.map((cat: string) => (
                                        <span key={cat} className="px-2 py-0.5 rounded bg-white/5 text-xs text-neutral-300 border border-white/5">
                                            {cat}
                                        </span>
                                    ))}
                                </div>

                                {/* Home Feed Tags */}
                                {storeTags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {storeTags.map(tag => {
                                            const meta = TAG_META[tag];
                                            return meta ? (
                                                <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
                                                    {meta.label}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                )}

                                {store.externalId && (
                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-neutral-600"}`} />
                                        <span className="text-xs text-neutral-500 font-mono">ID: {store.externalId}</span>
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
