"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UploadCloud } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function NewStorePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [categories, setCategories] = useState("");
    const [externalId, setExternalId] = useState(""); // STORE ID for Scraper

    // Image State
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let logoUrl = "";
            let bannerUrl = "";

            // 1. Upload Logo
            if (logoFile) {
                const logoRef = ref(storage, `stores/${Date.now()}_${logoFile.name}`);
                await uploadBytes(logoRef, logoFile);
                logoUrl = await getDownloadURL(logoRef);
            }

            // 2. Upload Banner
            if (bannerFile) {
                const bannerRef = ref(storage, `stores/${Date.now()}_${bannerFile.name}`);
                await uploadBytes(bannerRef, bannerFile);
                bannerUrl = await getDownloadURL(bannerRef);
            }

            // 3. Save to Firestore
            await addDoc(collection(db, "stores"), {
                name,
                description,
                externalId, // Saved here!
                logo: logoUrl,
                image: bannerUrl, // Using 'image' to match iOS app model
                categories: categories.split(",").map(c => c.trim()).filter(c => c.length > 0),
                createdAt: serverTimestamp(),
                rating: 5.0, // Default for new stores
                deliveryTime: "30-45 min" // Default
            });

            router.push("/dashboard/stores");
        } catch (error) {
            console.error("Error creating store:", error);
            alert("Failed to create store.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/stores" className="p-2 rounded-full hover:bg-neutral-900 text-white transition">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Add New Store</h2>
                    <p className="text-neutral-400">Onboard a new retail partner.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white">Basic Information</h3>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Store Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                            placeholder="e.g. Nike SoHo"
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Description</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                            placeholder="Short bio about the store..."
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">
                            External Store ID (For Inventory Sync)
                        </label>
                        <input
                            type="text"
                            value={externalId}
                            onChange={e => setExternalId(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition font-mono text-xs"
                            placeholder="e.g. 1105 (Found via Network Tab)"
                        />
                        <p className="text-xs text-neutral-500">
                            Required for the "Inventory Interrogator" to check stock at this specific location.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Categories (Comma separated)</label>
                        <input
                            type="text"
                            value={categories}
                            onChange={e => setCategories(e.target.value)}
                            className="w-full rounded-lg bg-black border border-neutral-800 px-4 py-2 text-white focus:border-white focus:outline-none transition"
                        />
                    </div>
                </div>

                {/* Branding */}
                <div className="space-y-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white">Branding Assets</h3>

                    {/* Logo Upload */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Store Logo (Square)</label>
                        <div className="relative flex items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-600 transition bg-black">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="text-center pointer-events-none">
                                {logoFile ? (
                                    <span className="text-green-500 font-medium">{logoFile.name}</span>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-neutral-500">
                                        <UploadCloud className="h-6 w-6" />
                                        <span className="text-xs">Click to upload logo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Banner Upload */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-neutral-300">Cover Image (Landscape)</label>
                        <div className="relative flex items-center justify-center w-full h-40 rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-600 transition bg-black">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setBannerFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="text-center pointer-events-none">
                                {bannerFile ? (
                                    <span className="text-green-500 font-medium">{bannerFile.name}</span>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-neutral-500">
                                        <UploadCloud className="h-6 w-6" />
                                        <span className="text-xs">Click to upload cover</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                    <Link href="/dashboard/stores" className="flex-1 py-3 items-center justify-center rounded-lg border border-neutral-800 bg-transparent text-white font-medium hover:bg-neutral-900 text-center transition">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] flex items-center justify-center rounded-lg bg-white py-3 text-black font-bold hover:bg-neutral-200 transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Store"}
                    </button>
                </div>

            </form>
        </div>
    );
}
