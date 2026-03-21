"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Search, X, CheckCircle, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

interface Product {
    id: string;
    title: string;
    brand: string;
    price: number;
    storeId: string;
    storeName?: string;
    imageURL?: string;
    category?: string;
    isJustDropped?: boolean;
}

export default function JustDroppedPage() {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [savingId, setSavingId] = useState<string | null>(null);
    const [filterBrand, setFilterBrand] = useState("All");

    // Load all products + stores (to get store names)
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [productsSnap, storesSnap] = await Promise.all([
                    getDocs(collection(db, "products")),
                    getDocs(collection(db, "stores")),
                ]);
                const storeMap: Record<string, string> = {};
                storesSnap.docs.forEach(d => { storeMap[d.id] = d.data().name || d.id; });

                const products: Product[] = productsSnap.docs.map(d => ({
                    id: d.id,
                    title: d.data().title || "",
                    brand: d.data().brand || "",
                    price: d.data().price || 0,
                    storeId: d.data().storeId || "",
                    storeName: storeMap[d.data().storeId] || "",
                    imageURL: d.data().images?.[0] || d.data().imageURL || "",
                    category: d.data().category || "",
                    isJustDropped: d.data().isJustDropped === true,
                }));

                // Sort: just dropped first, then alphabetically
                products.sort((a, b) => {
                    if (a.isJustDropped && !b.isJustDropped) return -1;
                    if (!a.isJustDropped && b.isJustDropped) return 1;
                    return a.title.localeCompare(b.title);
                });

                setAllProducts(products);
            } catch (err) {
                console.error("Failed to load products", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const brands = useMemo(() => {
        const set = new Set(allProducts.map(p => p.brand).filter(Boolean));
        return ["All", ...Array.from(set).sort()];
    }, [allProducts]);

    const featuredProducts = allProducts.filter(p => p.isJustDropped);
    const filteredProducts = useMemo(() => {
        return allProducts.filter(p => {
            const matchesBrand = filterBrand === "All" || p.brand === filterBrand;
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || (p.storeName || "").toLowerCase().includes(q);
            return matchesBrand && matchesSearch;
        });
    }, [allProducts, searchQuery, filterBrand]);

    async function toggleJustDropped(productId: string, current: boolean) {
        setSavingId(productId);
        try {
            await updateDoc(doc(db, "products", productId), { isJustDropped: !current });
            setAllProducts(prev =>
                prev.map(p => p.id === productId ? { ...p, isJustDropped: !current } : p)
            );
        } catch (err) {
            console.error("Failed to update product", err);
        } finally {
            setSavingId(null);
        }
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Just Dropped</h2>
                    <p className="text-neutral-400 text-sm">Select products to feature in the Just Dropped section on the home screen.</p>
                </div>
            </div>

            {/* Currently Featured */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Currently Featured</h3>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-xs font-mono">
                        {featuredProducts.length} products
                    </span>
                </div>

                {featuredProducts.length === 0 ? (
                    <p className="text-neutral-500 text-sm py-4">No products featured yet. Search below and click a product to add it.</p>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {featuredProducts.map(p => (
                            <div key={p.id} className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                {p.imageURL ? (
                                    <img src={p.imageURL} alt={p.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded bg-neutral-800 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate max-w-[140px]">{p.title}</p>
                                    <p className="text-xs text-neutral-500">{p.brand}</p>
                                </div>
                                <button
                                    onClick={() => toggleJustDropped(p.id, true)}
                                    disabled={savingId === p.id}
                                    className="ml-1 text-neutral-500 hover:text-red-400 transition"
                                >
                                    {savingId === p.id
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <X className="h-4 w-4" />
                                    }
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Search + Filter */}
            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search products, brands, stores..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg bg-neutral-900 border border-neutral-800 pl-10 pr-4 py-2.5 text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none transition text-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <select
                        value={filterBrand}
                        onChange={e => setFilterBrand(e.target.value)}
                        className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2.5 text-white text-sm focus:border-neutral-600 focus:outline-none transition"
                    >
                        {brands.map(b => <option key={b}>{b}</option>)}
                    </select>
                </div>

                {/* All Products Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => toggleJustDropped(product.id, product.isJustDropped ?? false)}
                                disabled={savingId === product.id}
                                className={`relative text-left rounded-xl border overflow-hidden transition group ${
                                    product.isJustDropped
                                        ? "border-white/40 ring-1 ring-white/20"
                                        : "border-white/10 hover:border-white/25"
                                }`}
                            >
                                {/* Image */}
                                <div className="aspect-[3/4] bg-neutral-900 overflow-hidden">
                                    {product.imageURL ? (
                                        <img
                                            src={product.imageURL}
                                            alt={product.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Sparkles className="h-8 w-8 text-neutral-700" />
                                        </div>
                                    )}
                                </div>

                                {/* Selected badge */}
                                {product.isJustDropped && (
                                    <div className="absolute top-2 right-2 bg-white rounded-full p-0.5">
                                        <CheckCircle className="h-4 w-4 text-black" />
                                    </div>
                                )}

                                {/* Saving spinner */}
                                {savingId === product.id && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="p-3 space-y-0.5">
                                    <p className="text-xs text-neutral-500 truncate">{product.brand} · {product.storeName}</p>
                                    <p className="text-sm font-medium text-white leading-tight line-clamp-2">{product.title}</p>
                                    <p className="text-sm text-neutral-300">${product.price}</p>
                                </div>
                            </button>
                        ))}

                        {filteredProducts.length === 0 && (
                            <div className="col-span-full text-center py-16 text-neutral-500">
                                No products match your search.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
