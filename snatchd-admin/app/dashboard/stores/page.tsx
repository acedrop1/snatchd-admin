"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { Plus, Store as StoreIcon, Loader2, EyeOff, Eye } from "lucide-react";
import { SEED_STORES } from "@/lib/seedStores";

export default function StoresPage() {
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<string | null>(null);

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
                // 1. Fetch current stores from Firestore
                const querySnapshot = await getDocs(collection(db, "stores"));
                const existing = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const existingNames = new Set(existing.map((s: any) => s.name));

                // 2. Auto-seed any SEED_STORES entries that are missing
                const toAdd = SEED_STORES.filter(s => !existingNames.has(s.name));

                if (toAdd.length > 0) {
                    const addPromises = toAdd.map(store =>
                        addDoc(collection(db, "stores"), {
                            ...store,
                            rating: 5.0,
                            isActive: true,
                            createdAt: serverTimestamp(),
                        })
                    );
                    await Promise.all(addPromises);

                    // Re-fetch after seeding
                    const refreshed = await getDocs(collection(db, "stores"));
                    const data = refreshed.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setStores(data);
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

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}

            {/* Empty State */}
            {!loading && stores.length === 0 && (
                <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 mb-4">
                        <StoreIcon className="h-6 w-6 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No stores configured</h3>
                    <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
                        Get started by adding your first retail partner. This will allow you to assign products to them.
                    </p>
                    <Link
                        href="/dashboard/stores/new"
                        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-md text-sm font-bold text-black hover:bg-neutral-200 transition"
                    >
                        Add Store
                    </Link>
                </div>
            )}

            {/* Store Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {stores.map((store) => {
                    const isActive = store.isActive !== false; // treat missing as active
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

                                {/* Edit Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-[2px]">
                                    <span className="px-4 py-2 bg-white text-black text-sm font-bold rounded-full">Edit Store</span>
                                </div>

                                {/* Hidden badge */}
                                {!isActive && (
                                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 border border-white/10 text-xs text-neutral-400 font-medium">
                                        <EyeOff className="h-3 w-3" />
                                        Hidden from app
                                    </div>
                                )}

                                {/* Visibility toggle */}
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

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {store.categories?.map((cat: string) => (
                                        <span key={cat} className="px-2 py-1 rounded bg-white/5 text-xs text-neutral-300 border border-white/5">
                                            {cat}
                                        </span>
                                    ))}
                                </div>

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
