"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import Link from "next/link";
import { Plus, Store as StoreIcon, Loader2, EyeOff, Eye, CheckSquare, Square, Trash2, Tag, X, Check, ChevronDown } from "lucide-react";
import { SEED_STORES } from "@/lib/seedStores";

const TAG_META: Record<string, { label: string; color: string; activeColor: string }> = {
    foryou:   { label: "#foryou",   color: "bg-purple-500/15 text-purple-300 border-purple-500/20", activeColor: "bg-purple-500/30 text-purple-200 border-purple-400/50" },
    trending: { label: "#trending", color: "bg-blue-500/15 text-blue-300 border-blue-500/20",       activeColor: "bg-blue-500/30 text-blue-200 border-blue-400/50" },
    "60min":  { label: "#60min",    color: "bg-green-500/15 text-green-300 border-green-500/20",    activeColor: "bg-green-500/30 text-green-200 border-green-400/50" },
};

const ALL_TAGS = ["foryou", "trending", "60min"] as const;

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

    // Bulk select state
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkWorking, setBulkWorking] = useState(false);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const tagDropdownRef = useRef<HTMLDivElement>(null);

    // Close tag dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
                setShowTagDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

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

    // ── Select mode helpers ───────────────────────────────────────────────────

    function exitSelectMode() {
        setSelectMode(false);
        setSelectedIds(new Set());
        setShowTagDropdown(false);
    }

    function toggleCard(storeId: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(storeId) ? next.delete(storeId) : next.add(storeId);
            return next;
        });
    }

    function selectAll() {
        setSelectedIds(new Set(filteredStores.map(s => s.id)));
    }

    function deselectAll() {
        setSelectedIds(new Set());
    }

    // ── Bulk delete ───────────────────────────────────────────────────────────

    async function handleBulkDelete() {
        if (selectedIds.size === 0) return;
        if (!confirm(`Permanently delete ${selectedIds.size} store${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
        setBulkWorking(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => batch.delete(doc(db, "stores", id)));
            await batch.commit();
            setStores(prev => prev.filter(s => !selectedIds.has(s.id)));
            exitSelectMode();
        } catch (err) {
            console.error("Bulk delete failed", err);
            alert("Delete failed. Check console.");
        } finally {
            setBulkWorking(false);
        }
    }

    // ── Bulk tag (toggle each tag independently) ──────────────────────────────

    async function handleBulkTag(tag: string, action: "add" | "remove") {
        if (selectedIds.size === 0) return;
        setBulkWorking(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                const store = stores.find(s => s.id === id);
                const current: string[] = store?.tags || [];
                const updated = action === "add"
                    ? Array.from(new Set([...current, tag]))
                    : current.filter((t: string) => t !== tag);
                batch.update(doc(db, "stores", id), { tags: updated });
            });
            await batch.commit();
            setStores(prev => prev.map(s => {
                if (!selectedIds.has(s.id)) return s;
                const current: string[] = s.tags || [];
                const updated = action === "add"
                    ? Array.from(new Set([...current, tag]))
                    : current.filter((t: string) => t !== tag);
                return { ...s, tags: updated };
            }));
        } catch (err) {
            console.error("Bulk tag failed", err);
            alert("Tagging failed. Check console.");
        } finally {
            setBulkWorking(false);
        }
    }

    // Does every selected store have this tag?
    function allSelectedHaveTag(tag: string): boolean {
        return Array.from(selectedIds).every(id => {
            const store = stores.find(s => s.id === id);
            return store?.tags?.includes(tag);
        });
    }

    // Does any selected store have this tag?
    function someSelectedHaveTag(tag: string): boolean {
        return Array.from(selectedIds).some(id => {
            const store = stores.find(s => s.id === id);
            return store?.tags?.includes(tag);
        });
    }

    const allFiltered = filteredStores.length > 0 && filteredStores.every(s => selectedIds.has(s.id));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Stores</h2>
                    <p className="text-neutral-400">Manage brand partners and retail locations.</p>
                </div>
                <div className="flex items-center gap-3">
                    {!loading && stores.length > 0 && (
                        <button
                            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition border ${
                                selectMode
                                    ? "bg-white/10 text-white border-white/20 hover:bg-white/15"
                                    : "bg-transparent text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-500"
                            }`}
                        >
                            {selectMode ? <><X className="h-4 w-4" /> Cancel</> : <><CheckSquare className="h-4 w-4" /> Select</>}
                        </button>
                    )}
                    <Link
                        href="/dashboard/stores/new"
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-md text-sm font-bold text-black hover:bg-neutral-200 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Add Store
                    </Link>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectMode && (
                <div className="sticky top-0 z-30 flex items-center gap-3 rounded-xl border border-white/15 bg-neutral-950/90 backdrop-blur-md px-5 py-3 shadow-lg">
                    {/* Count + select all */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-white font-semibold text-sm">
                            {selectedIds.size} selected
                        </span>
                        <div className="flex gap-2">
                            <button onClick={allFiltered ? deselectAll : selectAll} className="text-xs text-neutral-400 hover:text-white transition underline underline-offset-2">
                                {allFiltered ? "Deselect all" : `Select all ${filteredStores.length}`}
                            </button>
                        </div>
                    </div>

                    {/* Actions — only shown when something is selected */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2">

                            {/* Tag button + dropdown */}
                            <div className="relative" ref={tagDropdownRef}>
                                <button
                                    onClick={() => setShowTagDropdown(v => !v)}
                                    disabled={bulkWorking}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white text-sm font-medium hover:bg-white/15 transition disabled:opacity-50"
                                >
                                    {bulkWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                                    Tag
                                    <ChevronDown className={`h-3.5 w-3.5 transition ${showTagDropdown ? "rotate-180" : ""}`} />
                                </button>

                                {showTagDropdown && (
                                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-neutral-900 shadow-2xl py-2 z-50">
                                        <p className="px-4 py-1.5 text-xs text-neutral-500 font-medium uppercase tracking-wider">Apply / Remove Tags</p>
                                        {ALL_TAGS.map(tag => {
                                            const meta = TAG_META[tag];
                                            const allHave = allSelectedHaveTag(tag);
                                            const someHave = someSelectedHaveTag(tag);
                                            return (
                                                <div key={tag} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${tag === "foryou" ? "bg-purple-400" : tag === "trending" ? "bg-blue-400" : "bg-green-400"}`} />
                                                        <span className="text-sm text-white font-medium">{meta.label}</span>
                                                        {someHave && !allHave && (
                                                            <span className="text-xs text-neutral-500">partial</span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => handleBulkTag(tag, "add")}
                                                            disabled={allHave || bulkWorking}
                                                            title="Add tag"
                                                            className="p-1 rounded hover:bg-green-500/20 text-neutral-500 hover:text-green-400 transition disabled:opacity-30"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleBulkTag(tag, "remove")}
                                                            disabled={!someHave || bulkWorking}
                                                            title="Remove tag"
                                                            className="p-1 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition disabled:opacity-30"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Delete button */}
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkWorking}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete {selectedIds.size}
                            </button>
                        </div>
                    )}
                </div>
            )}

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
                    <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">Get started by adding your first retail partner.</p>
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
                    const isSelected = selectedIds.has(store.id);

                    const cardContent = (
                        <div className={`group relative overflow-hidden rounded-xl border transition ${
                            selectMode
                                ? isSelected
                                    ? "border-white ring-2 ring-white/40 bg-neutral-900"
                                    : "border-white/10 bg-neutral-900/50 hover:border-white/30"
                                : isActive
                                    ? "border-white/10 bg-neutral-900/50 hover:bg-neutral-900 hover:ring-1 hover:ring-white/20"
                                    : "border-white/5 bg-neutral-900/20 opacity-50"
                        }`}>
                            {/* Banner/Cover */}
                            <div className="h-32 bg-neutral-800 relative">
                                {store.image ? (
                                    <img src={store.image} alt={store.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-neutral-800">
                                        <StoreIcon className="h-8 w-8 text-neutral-600" />
                                    </div>
                                )}

                                {/* Select mode overlay */}
                                {selectMode ? (
                                    <div className={`absolute inset-0 transition ${isSelected ? "bg-black/30" : "bg-transparent group-hover:bg-black/20"}`}>
                                        <div className={`absolute top-3 left-3 w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                                            isSelected ? "bg-white border-white" : "bg-black/40 border-white/60"
                                        }`}>
                                            {isSelected && <Check className="h-4 w-4 text-black" strokeWidth={3} />}
                                        </div>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
                                )}

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
                                <h3 className={`font-bold text-lg mb-1 transition ${
                                    selectMode ? "text-white" : isActive ? "text-white group-hover:text-green-400" : "text-neutral-500"
                                }`}>
                                    {store.name}
                                </h3>
                                <p className="text-sm text-neutral-400 line-clamp-2">{store.description || "No description provided."}</p>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {store.categories?.map((cat: string) => (
                                        <span key={cat} className="px-2 py-0.5 rounded bg-white/5 text-xs text-neutral-300 border border-white/5">{cat}</span>
                                    ))}
                                </div>

                                {storeTags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {storeTags.map(tag => {
                                            const meta = TAG_META[tag];
                                            return meta ? (
                                                <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isSelected ? meta.activeColor : meta.color}`}>
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
                        </div>
                    );

                    return selectMode ? (
                        <div key={store.id} className="cursor-pointer" onClick={() => toggleCard(store.id)}>
                            {cardContent}
                        </div>
                    ) : (
                        <Link href={`/dashboard/stores/${store.id}`} key={store.id} className="block">
                            {cardContent}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
