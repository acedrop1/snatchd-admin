"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { Plus, Package, Loader2, Search, Upload, Trash2 } from "lucide-react";
import Papa from "papaparse";

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [importing, setImporting] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        try {
            const productsRef = collection(db, "products");
            const querySnapshot = await getDocs(productsRef);

            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(data);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    }

    // --- Selection Logic ---
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set()); // Deselect all
        } else {
            const allIds = new Set(filteredProducts.map(p => p.id));
            setSelectedIds(allIds);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Permanently delete ${selectedIds.size} products?`)) return;

        setLoading(true);
        try {
            // Batch delete in chunks of 450 (Firestore limit is 500)
            const allIds = Array.from(selectedIds);
            const chunks = [];
            for (let i = 0; i < allIds.length; i += 450) {
                chunks.push(allIds.slice(i, i + 450));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(id => {
                    batch.delete(doc(db, "products", id));
                });
                await batch.commit();
            }

            setSelectedIds(new Set());
            fetchProducts();
            alert("Selected products deleted.");
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete selected items.");
        } finally {
            setLoading(false);
        }
    };
    // -----------------------

    // Manual Brand Tagging (User Request)
    const [importBrandTag, setImportBrandTag] = useState("");

    // We no longer fetch stores for the dropdown strictly for import,
    // as the user wants to Type the tag.

    const handleImportClick = () => {
        if (!importBrandTag.trim()) {
            alert("Please type a Brand Tag (e.g. 'Zara') first.");
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const brandName = importBrandTag.trim();

        setImporting(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const batch = writeBatch(db);
                    let count = 0;

                    results.data.forEach((row: any) => {
                        // Priority: mainImage -> image_url -> image -> etc
                        const title = row.title || row.name || row.Product || "Untitled";
                        // Fallback order: sku -> SKU -> id -> ID -> reference
                        const sku = row.sku || row.SKU || row.id || row.ID || row.reference || "";
                        if (!sku) {
                            console.warn("Skipping row missing SKU/ID:", row);
                            return;
                        }

                        const priceStr = row.price || row.Price || "0";
                        const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));

                        // Updated Image Logic
                        const imageUrl = row.mainImage || row.image_url || row.image || row.Image || row.src || row.url_image || "";
                        const images = imageUrl ? [imageUrl] : [];

                        const category = row.category || "General";

                        // Extract Zara Product ID if available (numeric only)
                        // User specified column 'ID' (uppercase) might contain the 9-digit Zara ID
                        const zaraProductId = row["colorsSizesImagesJSON/0/productId"] || row.zaraProductId || row.productId || row.zara_id || row.ID || null;

                        const newDocRef = doc(collection(db, "products"));
                        batch.set(newDocRef, {
                            title,
                            sku,
                            price,
                            images,
                            category,
                            description: row.description || "",
                            brand: brandName,         // Manual Tag
                            zaraProductId,            // For stock API
                            isActive: true,
                            createdAt: serverTimestamp()
                        });
                        count++;
                    });

                    await batch.commit();
                    if (count === 0) {
                        alert("No products were imported! Please check your CSV column names. Required: 'sku', 'id', 'ID', or 'reference'.");
                    } else {
                        alert(`Successfully imported ${count} products tagged as '${brandName}'!`);
                        fetchProducts();
                    }
                } catch (error) {
                    console.error("Error importing CSV:", error);
                    alert("Failed to import CSV. Check console for details.");
                } finally {
                    setImporting(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            },
            error: (error) => {
                console.error("CSV Error:", error);
                setImporting(false);
                alert("Error reading CSV file.");
            }
        });
    };

    const filteredProducts = products.filter(product =>
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Products</h2>
                    <p className="text-neutral-400">Master catalog of all available items.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Bulk Logic: Only show delete if items selected */}
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md text-sm font-bold hover:bg-red-600 transition animate-in fade-in"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete ({selectedIds.size})
                        </button>
                    )}

                    {/* Hidden Input */}
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {/* Brand Tag Input for Import */}
                    <input
                        type="text"
                        value={importBrandTag}
                        onChange={(e) => setImportBrandTag(e.target.value)}
                        placeholder="Brand Tag (e.g. 'Zara')"
                        className="bg-neutral-900 border border-neutral-800 rounded-md text-sm text-white px-3 py-2 focus:border-white focus:outline-none w-48"
                    />

                    <button
                        onClick={handleImportClick}
                        disabled={importing}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-bold transition ${importBrandTag.trim() ? 'bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700' : 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed'}`}
                    >
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Import CSV
                    </button>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search SKU or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm text-white focus:border-white focus:outline-none w-64"
                        />
                    </div>
                    <Link
                        href="/dashboard/products/new"
                        className="flex items-center gap-2 px-4 py-2 bg-white rounded-md text-sm font-bold text-black hover:bg-neutral-200 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Add Product
                    </Link>
                </div>
            </div>

            {/* Select All Bar */}
            {products.length > 0 && (
                <div className="flex items-center gap-2 px-1 py-2 border-b border-white/5">
                    <input
                        type="checkbox"
                        checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 cursor-pointer"
                    />
                    <span className="text-sm text-neutral-400">
                        {selectedIds.size === 0 ? "Select All" : `${selectedIds.size} Selected`}
                    </span>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
                <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 mb-4">
                        <Package className="h-6 w-6 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No products yet</h3>
                    <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
                        Your master catalog is empty. Import a CSV or add items manually.
                    </p>
                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            onClick={handleImportClick}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm font-bold text-white hover:bg-neutral-800 transition"
                        >
                            <Upload className="h-4 w-4" /> Import CSV
                        </button>
                        <Link
                            href="/dashboard/products/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-md text-sm font-bold text-black hover:bg-neutral-200 transition"
                        >
                            Add Product
                        </Link>
                    </div>
                </div>
            )}

            {/* Product Grid */}
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => {
                    const isSelected = selectedIds.has(product.id);
                    return (
                        <div
                            key={product.id}
                            className={`group relative flex flex-col overflow-hidden rounded-lg border bg-neutral-900/50 transition hover:bg-neutral-900 ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-white/10 hover:ring-1 hover:ring-white/20'}`}
                        >
                            {/* Checkbox Overlay */}
                            <div className="absolute top-2 left-2 z-20">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelection(product.id)}
                                    className="h-5 w-5 rounded border-neutral-700 bg-black/50 text-blue-500 focus:ring-blue-500 cursor-pointer shadow-sm"
                                />
                            </div>

                            <Link href={`/dashboard/products/${product.id}`} className="flex-1 flex flex-col">
                                {/* Image Aspect Ratio 3:4 (Fashion Standard) */}
                                <div className="aspect-[3/4] bg-neutral-800 relative overflow-hidden">
                                    {product.images?.[0] ? (
                                        <img
                                            src={product.images[0]}
                                            alt={product.title}
                                            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <Package className="h-8 w-8 text-neutral-700" />
                                        </div>
                                    )}

                                    {/* Price Tag */}
                                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                                        ${product.price}
                                    </div>
                                </div>

                                <div className="p-3 flex-1 flex flex-col">
                                    <h3 className="font-medium text-white text-sm line-clamp-2 mb-1 group-hover:underline decoration-neutral-500 underline-offset-4">
                                        {product.title}
                                    </h3>

                                    <div className="mt-auto pt-2 flex items-center justify-between text-xs text-neutral-500 font-mono">
                                        <span>{product.category}</span>
                                        <span>{product.sku ? `SKU: ${product.sku}` : "NO SKU"}</span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
