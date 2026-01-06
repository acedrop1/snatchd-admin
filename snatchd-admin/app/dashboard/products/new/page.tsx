"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UploadCloud, X } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [stores, setStores] = useState<any[]>([]);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [sku, setSku] = useState(""); // Display reference (e.g., "1234/567")
    const [zaraProductId, setZaraProductId] = useState(""); // Numeric ID for stock API
    const [category, setCategory] = useState("Coats"); // Default
    const [selectedStoreId, setSelectedStoreId] = useState("");

    // Image State
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "stores"));
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setStores(data);
            } catch (error) {
                console.error("Error fetching stores:", error);
            }
        };
        fetchStores();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...filesArray]);

            // Create previews
            const newPreviews = filesArray.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStoreId) {
            alert("Please select a Brand.");
            return;
        }

        setLoading(true);

        try {
            const targetStore = stores.find(s => s.id === selectedStoreId);
            const brandName = targetStore?.name || "Unknown Brand";

            const imageUrls: string[] = [];

            // Upload all images
            for (const file of imageFiles) {
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                imageUrls.push(url);
            }

            // Save to Firestore 'products' (Master Catalog)
            await addDoc(collection(db, "products"), {
                title,
                description,
                price: parseFloat(price),
                sku, // Display reference
                zaraProductId: zaraProductId || null, // Numeric ID for stock API
                category,
                storeId: selectedStoreId,
                brand: brandName,
                images: imageUrls,
                createdAt: serverTimestamp(),
                isActive: true, // Default to visible in catalog
            });

            router.push("/dashboard/products");
        } catch (error) {
            console.error("Error creating product:", error);
            alert("Failed to create product.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/products" className="p-2 rounded-full hover:bg-neutral-900 text-white transition">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Add New Product</h2>
                    <p className="text-neutral-400">Add an item to the Master Catalog.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Core Product Details */}
                <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        Product Details
                    </h3>

                    {/* Brand Selection */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Brand</label>
                        <select
                            required
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                        >
                            <option value="">Select Brand...</option>
                            {stores.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Product Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                            placeholder="e.g. Oversized Wool Coat"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-neutral-300">Price ($)</label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                                placeholder="129.99"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-green-400">SKU (Important)</label>
                            <input
                                type="text"
                                required
                                value={sku}
                                onChange={e => setSku(e.target.value)}
                                className="w-full rounded-lg bg-black border border-green-500/50 px-4 py-2 text-white focus:border-green-500 focus:outline-none transition font-mono"
                                placeholder="e.g. 1234/567"
                            />
                        </div>
                    </div>

                    {/* Zara Product ID (for stock API) */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-blue-400">Zara Product ID (Optional)</label>
                        <input
                            type="text"
                            value={zaraProductId}
                            onChange={e => setZaraProductId(e.target.value)}
                            className="w-full rounded-lg bg-black border border-blue-500/50 px-4 py-2 text-white focus:border-blue-500 focus:outline-none transition font-mono"
                            placeholder="e.g. 504347744"
                        />
                        <p className="text-xs text-neutral-500">Numeric ID for real-time stock checks. Leave empty if not Zara.</p>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Description</label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                            placeholder="Details about material, fit, etc."
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                        >
                            <option>Coats</option>
                            <option>Jackets</option>
                            <option>Pants</option>
                            <option>Shoes</option>
                            <option>Accessories</option>
                            <option>Dresses</option>
                            <option>T-Shirts</option>
                        </select>
                    </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white">Product Images</h3>
                    <p className="text-xs text-neutral-500">First image will be the main thumbnail.</p>

                    <div className="grid grid-cols-3 gap-4">
                        {previews.map((src, idx) => (
                            <div key={idx} className="relative aspect-[3/4] bg-black rounded-lg border border-neutral-800 overflow-hidden group">
                                <img src={src} alt="preview" className="h-full w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}

                        {/* Upload Button */}
                        <div className="relative aspect-[3/4] flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-600 transition bg-black/50 hover:bg-black">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <UploadCloud className="h-6 w-6 text-neutral-500 mb-2" />
                            <span className="text-xs text-neutral-500 font-medium">Add Image</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                    <Link href="/dashboard/products" className="flex-1 py-3 items-center justify-center rounded-lg border border-neutral-800 bg-transparent text-white font-medium hover:bg-neutral-900 text-center transition">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] flex items-center justify-center rounded-lg bg-white py-3 text-black font-bold hover:bg-neutral-200 transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Product"}
                    </button>
                </div>

            </form>
        </div>
    );
}
