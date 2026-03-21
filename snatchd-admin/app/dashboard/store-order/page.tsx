"use client";

import { useState, useEffect, useRef } from "react";
import { GripVertical, Loader2, CheckCircle, ArrowUp, ArrowDown, Store as StoreIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";

const SECTIONS = [
    { key: "foryou",   label: "Snatchd For You",     tag: "#foryou",   color: "text-purple-400" },
    { key: "trending", label: "Trending in Your Area", tag: "#trending", color: "text-blue-400" },
    { key: "60min",    label: "Under 60 Minutes",     tag: "#60min",    color: "text-green-400" },
];

interface StoreItem {
    id: string;
    name: string;
    logo?: string;
    image?: string;
    categories?: string[];
}

export default function StoreOrderPage() {
    const [stores, setStores] = useState<StoreItem[]>([]);
    const [orderConfig, setOrderConfig] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [activeSection, setActiveSection] = useState("foryou");

    // Drag state
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [storesSnap, orderSnap] = await Promise.all([
                    getDocs(collection(db, "stores")),
                    getDoc(doc(db, "config", "store-order")),
                ]);

                const allStores: StoreItem[] = storesSnap.docs.map(d => ({
                    id: d.id,
                    name: d.data().name || "",
                    logo: d.data().logo || "",
                    image: d.data().image || "",
                    categories: d.data().categories || [],
                    tags: d.data().tags || [],
                }));
                setStores(allStores as any);

                const config = orderSnap.exists() ? orderSnap.data() as Record<string, string[]> : {};
                setOrderConfig(config);
            } catch (err) {
                console.error("Failed to load", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Get stores for current section, ordered by config (then fallback to tag-filtered stores)
    function getSectionStores(sectionKey: string): StoreItem[] {
        const taggedStores = (stores as any[]).filter(s => s.tags?.includes(sectionKey));
        const order: string[] = orderConfig[sectionKey] || [];

        if (order.length === 0) return taggedStores;

        // Sort: those in the order list come first (in that order), rest appended at end
        const inOrder = order
            .map(id => taggedStores.find(s => s.id === id))
            .filter(Boolean) as StoreItem[];
        const notInOrder = taggedStores.filter(s => !order.includes(s.id));
        return [...inOrder, ...notInOrder];
    }

    function updateOrder(sectionKey: string, newList: StoreItem[]) {
        setOrderConfig(prev => ({ ...prev, [sectionKey]: newList.map(s => s.id) }));
    }

    async function saveOrder() {
        setSaving(true);
        try {
            await setDoc(doc(db, "config", "store-order"), orderConfig, { merge: true });
            setSavedAt(new Date());
        } catch (err) {
            console.error("Failed to save order", err);
            alert("Failed to save. Check console.");
        } finally {
            setSaving(false);
        }
    }

    // Drag handlers
    function handleDragStart(index: number) {
        dragItem.current = index;
    }

    function handleDragEnter(index: number) {
        dragOverItem.current = index;
        // Reorder live while dragging
        const sectionStores = getSectionStores(activeSection);
        if (dragItem.current === null || dragItem.current === index) return;
        const updated = [...sectionStores];
        const dragged = updated.splice(dragItem.current, 1)[0];
        updated.splice(index, 0, dragged);
        dragItem.current = index;
        updateOrder(activeSection, updated);
    }

    function handleDragEnd() {
        dragItem.current = null;
        dragOverItem.current = null;
    }

    // Move up / down buttons
    function move(index: number, direction: -1 | 1) {
        const sectionStores = getSectionStores(activeSection);
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= sectionStores.length) return;
        const updated = [...sectionStores];
        const [item] = updated.splice(index, 1);
        updated.splice(newIndex, 0, item);
        updateOrder(activeSection, updated);
    }

    const sectionStores = getSectionStores(activeSection);

    return (
        <div className="space-y-8 max-w-3xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <GripVertical className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">Store Order</h2>
                        <p className="text-neutral-400 text-sm">Drag to set the display order within each home feed section.</p>
                    </div>
                </div>
                <button
                    onClick={saveOrder}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-sm font-bold hover:bg-neutral-200 transition disabled:opacity-50"
                >
                    {saving
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                        : savedAt
                            ? <><CheckCircle className="h-4 w-4 text-green-600" /> Saved</>
                            : "Save Order"
                    }
                </button>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-neutral-800">
                {SECTIONS.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setActiveSection(s.key)}
                        className={`px-5 py-3 text-sm font-medium transition border-b-2 ${
                            activeSection === s.key
                                ? `border-white text-white`
                                : "border-transparent text-neutral-400 hover:text-white"
                        }`}
                    >
                        {s.label}
                        <span className="ml-2 text-xs font-mono opacity-60">
                            {getSectionStores(s.key).length}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                </div>
            ) : sectionStores.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                    <StoreIcon className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
                    <p className="text-neutral-500 text-sm">No stores tagged with <span className="font-mono text-neutral-400">{SECTIONS.find(s => s.key === activeSection)?.tag}</span> yet.</p>
                    <p className="text-neutral-600 text-xs mt-1">Tag stores in their settings page to have them appear here.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-neutral-500 mb-4">Drag rows to reorder, or use the arrows. The first 10 stores are shown in the app — the rest are visible via "View All".</p>
                    {sectionStores.map((store, index) => (
                        <div
                            key={store.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={e => e.preventDefault()}
                            className={`flex items-center gap-4 rounded-xl border bg-neutral-900/60 p-4 cursor-grab active:cursor-grabbing transition select-none ${
                                index < 10
                                    ? "border-white/10 hover:border-white/20"
                                    : "border-neutral-800 opacity-60"
                            }`}
                        >
                            {/* Position number */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                index < 10 ? "bg-white/10 text-white" : "bg-neutral-800 text-neutral-600"
                            }`}>
                                {index + 1}
                            </div>

                            {/* Drag handle */}
                            <GripVertical className="h-5 w-5 text-neutral-600 flex-shrink-0" />

                            {/* Store image */}
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                                {store.logo || store.image ? (
                                    <img src={store.logo || store.image} alt={store.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <StoreIcon className="h-4 w-4 text-neutral-600" />
                                    </div>
                                )}
                            </div>

                            {/* Store info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{store.name}</p>
                                {store.categories && store.categories.length > 0 && (
                                    <p className="text-xs text-neutral-500 truncate">{store.categories.join(", ")}</p>
                                )}
                            </div>

                            {/* After 10 badge */}
                            {index >= 10 && (
                                <span className="text-xs text-neutral-600 border border-neutral-800 rounded px-2 py-0.5 flex-shrink-0">
                                    View All only
                                </span>
                            )}

                            {/* Up / Down arrows */}
                            <div className="flex flex-col gap-1 flex-shrink-0">
                                <button
                                    onClick={() => move(index, -1)}
                                    disabled={index === 0}
                                    className="p-1 rounded hover:bg-white/10 text-neutral-500 hover:text-white transition disabled:opacity-20"
                                >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => move(index, 1)}
                                    disabled={index === sectionStores.length - 1}
                                    className="p-1 rounded hover:bg-white/10 text-neutral-500 hover:text-white transition disabled:opacity-20"
                                >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {sectionStores.length > 10 && (
                        <p className="text-xs text-neutral-600 text-center pt-2">
                            Stores #{11}–{sectionStores.length} are hidden behind "View All" in the app.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
