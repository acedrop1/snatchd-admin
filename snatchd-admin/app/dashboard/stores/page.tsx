"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Plus, Store as StoreIcon, Loader2 } from "lucide-react";

export default function StoresPage() {
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStores() {
            try {
                const querySnapshot = await getDocs(collection(db, "stores"));
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setStores(data);
            } catch (error) {
                console.error("Error fetching stores:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStores();
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
                {stores.map((store) => (
                    <Link
                        href={`/dashboard/stores/${store.id}`}
                        key={store.id}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/50 transition hover:bg-neutral-900 block hover:ring-1 hover:ring-white/20"
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
                            <h3 className="font-bold text-lg text-white mb-1 group-hover:text-green-400 transition">{store.name}</h3>
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
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs text-neutral-500 font-mono">ID: {store.externalId}</span>
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
