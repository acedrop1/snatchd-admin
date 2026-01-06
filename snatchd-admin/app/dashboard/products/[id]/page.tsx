"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, UploadCloud, Trash2, X } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [sku, setSku] = useState("");
    const [zaraProductId, setZaraProductId] = useState(""); // NEW
    const [category, setCategory] = useState("Coats");

    // Images
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);

    useEffect(() => {
        async function fetchProduct() {
            if (!productId) return;
            try {
                const docRef = doc(db, "products", productId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title || "");
                    setDescription(data.description || "");
                    setPrice(data.price?.toString() || "");
                    setSku(data.sku || "");
                    setZaraProductId(data.zaraProductId || ""); // NEW
                    setCategory(data.category || "Coats");
                    setExistingImages(data.images || []);
                } else {
                    // Handle case where user manually navigates to bad ID
                    if (productId !== "new") {
                        alert("Product not found");
                        router.push("/dashboard/products");
                    }
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProduct();
    }, [productId, router]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setNewImageFiles(prev => [...prev, ...filesArray]);

            const previews = filesArray.map(file => URL.createObjectURL(file));
            setNewPreviews(prev => [...prev, ...previews]);
        }
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index: number) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        setNewPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const finalImageUrls = [...existingImages];

            // Upload new images
            for (const file of newImageFiles) {
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                finalImageUrls.push(url);
            }

            const docRef = doc(db, "products", productId);
            await updateDoc(docRef, {
                title,
                description,
                price: parseFloat(price),
                sku,
                zaraProductId, // NEW
                category,
                images: finalImageUrls,
            });

            router.push("/dashboard/products");
        } catch (error) {
            console.error("Error updating product:", error);
            alert("Failed to update product.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, "products", productId));
            router.push("/dashboard/products");
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Failed to delete product.");
            setDeleting(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-white">Loading product...</div>;

    return (
        <div className="space-y-8 max-w-2xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/products" className="p-2 rounded-full hover:bg-neutral-900 text-white transition">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">Edit Product</h2>
                        <p className="text-neutral-400">Manage item details and images.</p>
                    </div>
                </div>

                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-md text-sm font-medium hover:bg-red-500/20 transition"
                >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? "Deleting..." : "Delete Product"}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Core Product Details */}
                <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        Product Details
                    </h3>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Product Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
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
                            />
                        </div>
                    </div>

                    {/* NEW ZARA ID FIELD */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-blue-400">Zara Product ID (Real-Time Stock)</label>
                        <input
                            type="text"
                            value={zaraProductId}
                            onChange={e => setZaraProductId(e.target.value)}
                            placeholder="e.g. 504347744"
                            className="w-full rounded-lg bg-black border border-blue-500/50 px-4 py-2 text-white focus:border-blue-500 focus:outline-none transition font-mono"
                        />
                        <p className="text-[10px] text-neutral-500">Required for real-time inventory checks against Zara's API.</p>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Description</label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
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

                    <div className="grid grid-cols-3 gap-4">
                        {/* Existing Images */}
                        {existingImages.map((src, idx) => (
                            <div key={`existing-${idx}`} className="relative aspect-[3/4] bg-black rounded-lg border border-neutral-800 overflow-hidden group">
                                <img src={src} alt="existing" className="h-full w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeExistingImage(idx)}
                                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}

                        {/* New Previews */}
                        {newPreviews.map((src, idx) => (
                            <div key={`new-${idx}`} className="relative aspect-[3/4] bg-black rounded-lg border border-neutral-800 overflow-hidden group">
                                <img src={src} alt="new-preview" className="h-full w-full object-cover opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">New</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeNewImage(idx)}
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
                        disabled={saving}
                        className="flex-[2] flex items-center justify-center rounded-lg bg-white py-3 text-black font-bold hover:bg-neutral-200 transition disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                    </button>
                </div>

            </form>
        </div>
    );
}
