"use client";

import { useState, useEffect } from "react";
import { Settings, Upload, CheckCircle, XCircle, Loader2, AlertTriangle, FlaskConical, ToggleLeft, ToggleRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

// ── Product Catalog Seed ────────────────────────────────────────────────────
// One set per brand. The seed function looks up the storeId by name first.
type ProductSeed = {
    title: string;
    brand: string;
    price: number;
    category: string;
    deliveryTime: string;
    description?: string;
    inStock: boolean;
    imageName: string;
};

const SEED_PRODUCTS: { storeName: string; products: ProductSeed[] }[] = [
    {
        storeName: "Apple SoHo",
        products: [
            { title: "iPhone 16 Pro", brand: "Apple", price: 999, category: "Electronics", deliveryTime: "35 Mins", description: "6.3-inch Super Retina XDR display, 48MP Fusion camera system.", inStock: true, imageName: "iphone" },
            { title: "AirPods Pro (2nd Gen)", brand: "Apple", price: 249, category: "Electronics", deliveryTime: "35 Mins", description: "Active Noise Cancellation, Adaptive Audio, USB-C.", inStock: true, imageName: "airpodspro" },
            { title: "MacBook Air M3", brand: "Apple", price: 1099, category: "Electronics", deliveryTime: "35 Mins", description: '13-inch Liquid Retina display, up to 18h battery.', inStock: true, imageName: "laptopcomputer" },
            { title: "Apple Watch Series 10", brand: "Apple", price: 399, category: "Electronics", deliveryTime: "35 Mins", description: "Thinnest Apple Watch ever. Advanced health sensors.", inStock: true, imageName: "applewatch" },
        ],
    },
    {
        storeName: "Zara SoHo",
        products: [
            { title: "Structured Blazer", brand: "Zara", price: 129, category: "Clothing", deliveryTime: "35 Mins", description: "Tailored fit single-button blazer in ecru.", inStock: true, imageName: "tshirt" },
            { title: "Wide Leg Trousers", brand: "Zara", price: 59, category: "Clothing", deliveryTime: "35 Mins", description: "High-waist wide-leg trousers in navy blue.", inStock: true, imageName: "tshirt" },
            { title: "Leather Crossbody Bag", brand: "Zara", price: 79, category: "Accessories", deliveryTime: "35 Mins", description: "Mini crossbody bag with chain strap in black.", inStock: true, imageName: "bag" },
            { title: "Oversized Trench Coat", brand: "Zara", price: 149, category: "Clothing", deliveryTime: "35 Mins", description: "Double-breasted trench in camel.", inStock: true, imageName: "tshirt" },
        ],
    },
    {
        storeName: "Louis Vuitton",
        products: [
            { title: "Neverfull MM", brand: "Louis Vuitton", price: 1700, category: "Accessories", deliveryTime: "35 Mins", description: "Iconic tote in Monogram canvas. Spacious and versatile.", inStock: true, imageName: "bag" },
            { title: "Card Holder", brand: "Louis Vuitton", price: 310, category: "Accessories", deliveryTime: "35 Mins", description: "6-slot card holder in Monogram canvas.", inStock: true, imageName: "creditcard" },
            { title: "Speedy Bandoulière 25", brand: "Louis Vuitton", price: 1560, category: "Accessories", deliveryTime: "35 Mins", description: "Classic Boston bag with detachable shoulder strap.", inStock: true, imageName: "bag" },
        ],
    },
    {
        storeName: "Nike",
        products: [
            { title: "Air Force 1 '07", brand: "Nike", price: 115, category: "Shoes", deliveryTime: "45 Mins", description: "The iconic low-top in white leather.", inStock: true, imageName: "shoe" },
            { title: "Air Max 90", brand: "Nike", price: 130, category: "Shoes", deliveryTime: "45 Mins", description: "Retro running heritage. MAX air unit heel.", inStock: true, imageName: "shoe" },
            { title: "Tech Fleece Hoodie", brand: "Nike", price: 110, category: "Clothing", deliveryTime: "45 Mins", description: "Lightweight warmth with a modern silhouette.", inStock: true, imageName: "tshirt" },
            { title: "Dri-FIT Training Shorts", brand: "Nike", price: 40, category: "Clothing", deliveryTime: "45 Mins", description: "Moisture-wicking 7-inch training shorts.", inStock: true, imageName: "tshirt" },
        ],
    },
    {
        storeName: "Aime Leon Dore",
        products: [
            { title: "New Balance 990v3 for ALD", brand: "ALD", price: 200, category: "Shoes", deliveryTime: "50 Mins", description: "ALD x New Balance collab in Forest Green.", inStock: true, imageName: "shoe" },
            { title: "Newport Short", brand: "ALD", price: 135, category: "Clothing", deliveryTime: "50 Mins", description: "Signature ALD short in heavyweight cotton.", inStock: true, imageName: "tshirt" },
            { title: "Suede Track Jacket", brand: "ALD", price: 495, category: "Clothing", deliveryTime: "50 Mins", description: "80s Italian-inspired track jacket in suede.", inStock: true, imageName: "tshirt" },
        ],
    },
    {
        storeName: "Kith",
        products: [
            { title: "Williams III Hoodie", brand: "Kith", price: 175, category: "Clothing", deliveryTime: "40 Mins", description: "Heavyweight French terry pullover hoodie.", inStock: true, imageName: "tshirt" },
            { title: "Classic Logo Tee", brand: "Kith", price: 65, category: "Clothing", deliveryTime: "40 Mins", description: "Cotton jersey tee with tonal Kith box logo.", inStock: true, imageName: "tshirt" },
            { title: "Kith x Adidas Forum Low", brand: "Kith", price: 160, category: "Shoes", deliveryTime: "40 Mins", description: "Kith collab on the classic Adidas Forum Low.", inStock: true, imageName: "shoe" },
        ],
    },
    {
        storeName: "Miu Miu",
        products: [
            { title: "Wander Matelassé Bag", brand: "Miu Miu", price: 1750, category: "Accessories", deliveryTime: "35 Mins", description: "Nappa leather bag with signature Miu Miu lettering.", inStock: true, imageName: "bag" },
            { title: "Mary Jane Ballet Flats", brand: "Miu Miu", price: 850, category: "Shoes", deliveryTime: "35 Mins", description: "Patent leather Mary Janes with chunky buckle.", inStock: true, imageName: "shoe" },
            { title: "Logo Mohair Cardigan", brand: "Miu Miu", price: 1290, category: "Clothing", deliveryTime: "35 Mins", description: "Cropped mohair-blend cardigan with logo lettering.", inStock: true, imageName: "tshirt" },
        ],
    },
    {
        storeName: "Jacquemus",
        products: [
            { title: "Le Chiquito Noeud", brand: "Jacquemus", price: 590, category: "Accessories", deliveryTime: "45 Mins", description: "Mini top-handle bag in leather with bow detail.", inStock: true, imageName: "bag" },
            { title: "Le T-shirt Camargue", brand: "Jacquemus", price: 130, category: "Clothing", deliveryTime: "45 Mins", description: "Oversized tee with embroidered logo.", inStock: true, imageName: "tshirt" },
            { title: "Le Raphia Hat", brand: "Jacquemus", price: 195, category: "Accessories", deliveryTime: "45 Mins", description: "Wide-brim woven raffia hat.", inStock: true, imageName: "hat" },
        ],
    },
    {
        storeName: "Bergdorf Goodman",
        products: [
            { title: "Bottega Veneta Pouch", brand: "Bottega Veneta", price: 2200, category: "Accessories", deliveryTime: "60 Mins", description: "Intrecciato leather clutch in dark brown.", inStock: true, imageName: "bag" },
            { title: "Loro Piana Cashmere Sweater", brand: "Loro Piana", price: 1450, category: "Clothing", deliveryTime: "60 Mins", description: "Baby cashmere crewneck in ivory.", inStock: true, imageName: "tshirt" },
            { title: "Amina Muaddi Heels", brand: "Amina Muaddi", price: 695, category: "Shoes", deliveryTime: "60 Mins", description: "Begum Glass crystal pumps in clear.", inStock: true, imageName: "shoe" },
        ],
    },
    {
        storeName: "Alo",
        products: [
            { title: "Warrior Compression Legging", brand: "Alo", price: 128, category: "Clothing", deliveryTime: "30 Mins", description: "High-waist compression performance legging.", inStock: true, imageName: "tshirt" },
            { title: "Alosoft Finesse Bra", brand: "Alo", price: 78, category: "Clothing", deliveryTime: "30 Mins", description: "Buttery soft medium-support bra.", inStock: true, imageName: "tshirt" },
            { title: "Chill Half-Zip Pullover", brand: "Alo", price: 118, category: "Clothing", deliveryTime: "30 Mins", description: "Cozy brushed half-zip in Espresso.", inStock: true, imageName: "tshirt" },
        ],
    },
    {
        storeName: "Cos",
        products: [
            { title: "Fluid Trench Coat", brand: "Cos", price: 295, category: "Clothing", deliveryTime: "40 Mins", description: "Relaxed-fit trench in fluid fabric.", inStock: true, imageName: "tshirt" },
            { title: "Wide-Leg Trouser", brand: "Cos", price: 115, category: "Clothing", deliveryTime: "40 Mins", description: "High-waist wide-leg trouser in beige.", inStock: true, imageName: "tshirt" },
            { title: "Structured Tote Bag", brand: "Cos", price: 89, category: "Accessories", deliveryTime: "40 Mins", description: "Minimal structured tote in natural canvas.", inStock: true, imageName: "bag" },
        ],
    },
    {
        storeName: "Aesop",
        products: [
            { title: "Parsley Seed Facial Serum", brand: "Aesop", price: 98, category: "Beauty & Skincare", deliveryTime: "60 Mins", description: "Intensely hydrating antioxidant serum for all skin types.", inStock: true, imageName: "drop" },
            { title: "Reverence Aromatique Hand Wash", brand: "Aesop", price: 42, category: "Hygiene", deliveryTime: "60 Mins", description: "Botanical hand wash with Vetiver and Sandalwood.", inStock: true, imageName: "drop" },
            { title: "Fabulous Face Cleanser", brand: "Aesop", price: 55, category: "Beauty & Skincare", deliveryTime: "60 Mins", description: "Gentle gel cleanser for all skin types.", inStock: true, imageName: "drop" },
        ],
    },
    {
        storeName: "Chanel",
        products: [
            { title: "N°5 Eau de Parfum", brand: "Chanel", price: 185, category: "Beauty & Skincare", deliveryTime: "55 Mins", description: "The iconic floral aldehyde fragrance. 50ml.", inStock: true, imageName: "flask" },
            { title: "Le Volume de Chanel Mascara", brand: "Chanel", price: 42, category: "Beauty & Skincare", deliveryTime: "55 Mins", description: "Volumizing mascara in Noir.", inStock: true, imageName: "pencil" },
            { title: "Coco Mademoiselle EDP", brand: "Chanel", price: 175, category: "Beauty & Skincare", deliveryTime: "55 Mins", description: "Fresh oriental fragrance. 50ml.", inStock: true, imageName: "flask" },
        ],
    },
    {
        storeName: "Skims",
        products: [
            { title: "Cotton Rib Bodysuit", brand: "Skims", price: 62, category: "Clothing", deliveryTime: "40 Mins", description: "Stretchy long-sleeve cotton rib bodysuit.", inStock: true, imageName: "tshirt" },
            { title: "Fits Everybody Slip Dress", brand: "Skims", price: 88, category: "Clothing", deliveryTime: "40 Mins", description: "Second-skin slip dress in ultra-stretch fabric.", inStock: true, imageName: "tshirt" },
            { title: "Soft Lounge Long Sleeve", brand: "Skims", price: 54, category: "Clothing", deliveryTime: "40 Mins", description: "Ultra-soft slim long-sleeve top.", inStock: true, imageName: "tshirt" },
        ],
    },
];

// Multi-location stores — each entry is a distinct physical location (separate Firestore doc)
const SEED_MULTI_LOCATION_STORES = [
    // ── Apple ────────────────────────────────────────────────────────────────
    {
        name: "Apple SoHo",
        description: "Apple retail store in SoHo — iPhone, Mac, iPad, and accessories.",
        category: "Electronics",
        categories: ["Electronics", "Accessories"],
        deliveryTime: "35 Mins",
        address: "103 Prince St, New York, NY 10012",
        latitude: 40.7254,
        longitude: -73.9971,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Apple Fifth Avenue",
        description: "Apple's iconic 24-hour glass cube store on Fifth Avenue.",
        category: "Electronics",
        categories: ["Electronics", "Accessories"],
        deliveryTime: "40 Mins",
        address: "767 5th Ave, New York, NY 10153",
        latitude: 40.7636,
        longitude: -73.9727,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Apple Upper West Side",
        description: "Apple retail store on the Upper West Side.",
        category: "Electronics",
        categories: ["Electronics", "Accessories"],
        deliveryTime: "40 Mins",
        address: "1981 Broadway, New York, NY 10023",
        latitude: 40.7676,
        longitude: -73.9820,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Apple Grand Central",
        description: "Apple retail store inside Grand Central Terminal.",
        category: "Electronics",
        categories: ["Electronics", "Accessories"],
        deliveryTime: "40 Mins",
        address: "45 Grand Central Terminal, New York, NY 10017",
        latitude: 40.7527,
        longitude: -73.9773,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    // ── Zara ─────────────────────────────────────────────────────────────────
    {
        name: "Zara SoHo",
        description: "Zara's flagship SoHo store — women's, men's, and kids' fashion.",
        category: "Fast Fashion",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "35 Mins",
        address: "580 Broadway, New York, NY 10012",
        latitude: 40.7239,
        longitude: -73.9982,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Zara Fifth Avenue",
        description: "Zara on Fifth Avenue — multi-floor fashion destination.",
        category: "Fast Fashion",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "666 5th Ave, New York, NY 10103",
        latitude: 40.7596,
        longitude: -73.9789,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Zara Columbus Circle",
        description: "Zara at the Time Warner Center, Columbus Circle.",
        category: "Fast Fashion",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "10 Columbus Circle, New York, NY 10019",
        latitude: 40.7683,
        longitude: -73.9836,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Zara Midtown East",
        description: "Zara on Lexington Avenue in Midtown East.",
        category: "Fast Fashion",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "750 Lexington Ave, New York, NY 10022",
        latitude: 40.7628,
        longitude: -73.9674,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    // ── Aesop (extra locations) ───────────────────────────────────────────────
    {
        name: "Aesop West Village",
        description: "Aesop skincare boutique in the West Village.",
        category: "Luxury Boutique",
        categories: ["Beauty & Skincare", "Hygiene"],
        deliveryTime: "45 Mins",
        address: "232 W 10th St, New York, NY 10014",
        latitude: 40.7327,
        longitude: -74.0058,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Aesop Upper East Side",
        description: "Aesop skincare boutique on Madison Avenue, UES.",
        category: "Luxury Boutique",
        categories: ["Beauty & Skincare", "Hygiene"],
        deliveryTime: "45 Mins",
        address: "870 Madison Ave, New York, NY 10021",
        latitude: 40.7710,
        longitude: -73.9643,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    // ── Alo ───────────────────────────────────────────────────────────────────
    {
        name: "Alo Upper East Side",
        description: "Alo Yoga flagship on the Upper East Side.",
        category: "Activewear",
        categories: ["Activewear", "Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "981 Madison Ave, New York, NY 10075",
        latitude: 40.7731,
        longitude: -73.9635,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Alo Flatiron",
        description: "Alo Yoga store in the Flatiron District.",
        category: "Activewear",
        categories: ["Activewear", "Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "156 5th Ave, New York, NY 10010",
        latitude: 40.7411,
        longitude: -73.9891,
        deliveryRadius: 5,
        externalId: "",
        logo: "",
        image: "",
    },
];

// All 12 stores from the Snatchd app — seeded into Firestore so the app shows real data
const SEED_STORES = [
    {
        name: "Louis Vuitton",
        description: "Iconic French luxury fashion house known for its monogram canvas goods, ready-to-wear, and accessories.",
        category: "Luxury Fashion",
        categories: ["Luxury Fashion", "Accessories", "Clothing"],
        deliveryTime: "35 Mins",
        address: "116 Greene St, New York, NY 10012",
        latitude: 40.7243,
        longitude: -74.0004,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Nike",
        description: "World's leading athletic footwear and apparel brand.",
        category: "Sportswear",
        categories: ["Sportswear", "Shoes", "Clothing"],
        deliveryTime: "45 Mins",
        address: "529 Broadway, New York, NY 10012",
        latitude: 40.7228,
        longitude: -73.9981,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Aime Leon Dore",
        description: "New York-based label blending sportswear, tailoring, and vintage references.",
        category: "Streetwear",
        categories: ["Streetwear", "Clothing", "Accessories"],
        deliveryTime: "50 Mins",
        address: "232 Mulberry St, New York, NY 10012",
        latitude: 40.7224,
        longitude: -73.9963,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Kith",
        description: "Lifestyle brand and retailer blending fashion, food, and culture.",
        category: "Streetwear",
        categories: ["Streetwear", "Clothing", "Shoes"],
        deliveryTime: "40 Mins",
        address: "337 Lafayette St, New York, NY 10012",
        latitude: 40.7256,
        longitude: -73.9962,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Miu Miu",
        description: "Prada's sister label — playfully intellectual, feminine, and eccentric.",
        category: "Luxury Fashion",
        categories: ["Luxury Fashion", "Clothing", "Accessories"],
        deliveryTime: "35 Mins",
        address: "100 Prince St, New York, NY 10012",
        latitude: 40.7254,
        longitude: -74.0002,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Jacquemus",
        description: "Provençal French brand known for its minimalist, sun-soaked aesthetic.",
        category: "Luxury Fashion",
        categories: ["Luxury Fashion", "Clothing", "Accessories"],
        deliveryTime: "45 Mins",
        address: "98 Prince St, New York, NY 10012",
        latitude: 40.7252,
        longitude: -73.9999,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Bergdorf Goodman",
        description: "New York's premier luxury department store on Fifth Avenue.",
        category: "Luxury Department Store",
        categories: ["Luxury Fashion", "Beauty & Skincare", "Fine Jewelry", "Clothing"],
        deliveryTime: "60 Mins",
        address: "754 5th Ave, New York, NY 10019",
        latitude: 40.7641,
        longitude: -73.9727,
        deliveryRadius: 10,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Alo",
        description: "Mindful movement brand for yoga, fitness, and beyond.",
        category: "Activewear",
        categories: ["Activewear", "Clothing", "Accessories"],
        deliveryTime: "30 Mins",
        address: "136 Prince St, New York, NY 10012",
        latitude: 40.7256,
        longitude: -74.0008,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Cos",
        description: "Modern, functional, and considered design for women and men.",
        category: "Modern Essentials",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "129 Spring St, New York, NY 10012",
        latitude: 40.7248,
        longitude: -74.0009,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Aesop",
        description: "Australian skincare brand formulated from plant-based and laboratory-made ingredients.",
        category: "Luxury Boutique",
        categories: ["Beauty & Skincare", "Hygiene"],
        deliveryTime: "60 Mins",
        address: "87 Greene St, New York, NY 10012",
        latitude: 40.7238,
        longitude: -74.0003,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Chanel",
        description: "Timeless French luxury house — fashion, fragrance, beauty, and fine jewelry.",
        category: "Beauty & Fragrance",
        categories: ["Beauty & Skincare", "Fine Jewelry", "Clothing", "Fragrance"],
        deliveryTime: "55 Mins",
        address: "15 E 57th St, New York, NY 10022",
        latitude: 40.7625,
        longitude: -73.9726,
        deliveryRadius: 10,
        externalId: "",
        logo: "",
        image: "",
    },
    {
        name: "Skims",
        description: "Solutions-oriented brand creating the next generation of basics by Kim Kardashian.",
        category: "Modern Basics",
        categories: ["Clothing", "Accessories"],
        deliveryTime: "40 Mins",
        address: "494 Broadway, New York, NY 10012",
        latitude: 40.7221,
        longitude: -73.9986,
        deliveryRadius: 8,
        externalId: "",
        logo: "",
        image: "",
    },
];

// ── Product Image URLs ────────────────────────────────────────────────────────
// Curated Unsplash photos for each seeded product.
// "Patch Product Images" writes these into products.images[0] in Firestore.
// Store images are managed separately via the Stores page — not touched here.
const U = "https://images.unsplash.com/photo-";
const Q = "?auto=format&fit=crop&w=800&q=80";

const PRODUCT_IMAGES: Record<string, string> = {
    // Apple
    "iPhone 16 Pro":                    `${U}1510557880182-3d4d3cba35a5${Q}`,
    "AirPods Pro (2nd Gen)":            `${U}1600294037681-c80b4cb5b434${Q}`,
    "MacBook Air M3":                   `${U}1517336714731-489689fd1ca8${Q}`,
    "Apple Watch Series 10":            `${U}1434493789847-2f02dc6ca35d${Q}`,
    // Zara
    "Structured Blazer":                `${U}1594938298603-c8148c4b984a${Q}`,
    "Wide Leg Trousers":                `${U}1583744946564-b52ac1c389c8${Q}`,
    "Leather Crossbody Bag":            `${U}1548036328-c9fa89d128fa${Q}`,
    "Oversized Trench Coat":            `${U}1434389677669-e08b4cac3105${Q}`,
    // Louis Vuitton
    "Neverfull MM":                     `${U}1547949003-9792a18a2601${Q}`,
    "Card Holder":                      `${U}1556742400-b5b7a508ef81${Q}`,
    "Speedy Bandoulière 25":            `${U}1548036328-c9fa89d128fa${Q}`,
    // Nike
    "Air Force 1 '07":                  `${U}1542291026-7eec264c27ff${Q}`,
    "Air Max 90":                       `${U}1542291026-7eec264c27ff${Q}`,
    "Tech Fleece Hoodie":               `${U}1556821840-3a63f15732ce${Q}`,
    "Dri-FIT Training Shorts":          `${U}1506629082955-511b1aa562c8${Q}`,
    // Aime Leon Dore
    "New Balance 990v3 for ALD":        `${U}1542291026-7eec264c27ff${Q}`,
    "Newport Short":                    `${U}1506629082955-511b1aa562c8${Q}`,
    "Suede Track Jacket":               `${U}1490481651871-ab68de25d43d${Q}`,
    // Kith
    "Williams III Hoodie":              `${U}1556821840-3a63f15732ce${Q}`,
    "Classic Logo Tee":                 `${U}1576566588405-a71e28c3a31e${Q}`,
    "Kith x Adidas Forum Low":          `${U}1542291026-7eec264c27ff${Q}`,
    // Miu Miu
    "Wander Matelassé Bag":             `${U}1548036328-c9fa89d128fa${Q}`,
    "Mary Jane Ballet Flats":           `${U}1551107696-a4b0c5a0d9a2${Q}`,
    "Logo Mohair Cardigan":             `${U}1594938298603-c8148c4b984a${Q}`,
    // Jacquemus
    "Le Chiquito Noeud":                `${U}1548036328-c9fa89d128fa${Q}`,
    "Le T-shirt Camargue":              `${U}1576566588405-a71e28c3a31e${Q}`,
    "Le Raphia Hat":                    `${U}1521369909029-2afed882baee${Q}`,
    // Bergdorf Goodman
    "Bottega Veneta Pouch":             `${U}1548036328-c9fa89d128fa${Q}`,
    "Loro Piana Cashmere Sweater":      `${U}1576566588405-a71e28c3a31e${Q}`,
    "Amina Muaddi Heels":               `${U}1551107696-a4b0c5a0d9a2${Q}`,
    // Alo
    "Warrior Compression Legging":      `${U}1506629082955-511b1aa562c8${Q}`,
    "Alosoft Finesse Bra":              `${U}1571019613454-1cb2f99b2d8b${Q}`,
    "Chill Half-Zip Pullover":          `${U}1556821840-3a63f15732ce${Q}`,
    // Cos
    "Fluid Trench Coat":                `${U}1434389677669-e08b4cac3105${Q}`,
    "Wide-Leg Trouser":                 `${U}1583744946564-b52ac1c389c8${Q}`,
    "Structured Tote Bag":              `${U}1548036328-c9fa89d128fa${Q}`,
    // Aesop
    "Parsley Seed Facial Serum":        `${U}1608248543803-ba4f8c70ae0b${Q}`,
    "Reverence Aromatique Hand Wash":   `${U}1608248543803-ba4f8c70ae0b${Q}`,
    "Fabulous Face Cleanser":           `${U}1608248543803-ba4f8c70ae0b${Q}`,
    // Chanel
    "N°5 Eau de Parfum":               `${U}1541099649105-f69ad21f3246${Q}`,
    "Le Volume de Chanel Mascara":      `${U}1522335789203-aabd1fc54bc9${Q}`,
    "Coco Mademoiselle EDP":            `${U}1541099649105-f69ad21f3246${Q}`,
    // Skims
    "Cotton Rib Bodysuit":              `${U}1515886657613-9f3515b0c78f${Q}`,
    "Fits Everybody Slip Dress":        `${U}1515886657613-9f3515b0c78f${Q}`,
    "Soft Lounge Long Sleeve":          `${U}1576566588405-a71e28c3a31e${Q}`,
};

type SeedStatus = "idle" | "running" | "done" | "error";
type StoreResult = { name: string; status: "added" | "skipped" | "error"; message?: string };

export default function SettingsPage() {
    const [seedStatus, setSeedStatus] = useState<SeedStatus>("idle");
    const [results, setResults] = useState<StoreResult[]>([]);
    const [progress, setProgress] = useState(0);

    // Multi-location seed state
    const [multiSeedStatus, setMultiSeedStatus] = useState<SeedStatus>("idle");
    const [multiResults, setMultiResults] = useState<StoreResult[]>([]);
    const [multiProgress, setMultiProgress] = useState(0);

    // Product seed state
    const [productSeedStatus, setProductSeedStatus] = useState<SeedStatus>("idle");
    const [productResults, setProductResults] = useState<StoreResult[]>([]);
    const [productProgress, setProductProgress] = useState(0);

    // Image seed state
    const [imageSeedStatus, setImageSeedStatus] = useState<SeedStatus>("idle");
    const [imageSeedResults, setImageSeedResults] = useState<StoreResult[]>([]);
    const [imageSeedProgress, setImageSeedProgress] = useState(0);

    // Revert store images state
    const [revertStatus, setRevertStatus] = useState<SeedStatus>("idle");
    const [revertResults, setRevertResults] = useState<StoreResult[]>([]);

    // Test mode state
    const [testMode, setTestMode] = useState<boolean>(false);
    const [testModeLoading, setTestModeLoading] = useState(false);
    const [testModeLoaded, setTestModeLoaded] = useState(false);

    // Load test mode from Firestore on mount
    useEffect(() => {
        getDoc(doc(db, "config", "app")).then((snap) => {
            if (snap.exists()) setTestMode(snap.data()?.testMode ?? false);
            setTestModeLoaded(true);
        });
    }, []);

    const handleSeedStores = async () => {
        setSeedStatus("running");
        setResults([]);
        setProgress(0);

        const newResults: StoreResult[] = [];

        for (let i = 0; i < SEED_STORES.length; i++) {
            const store = SEED_STORES[i];
            try {
                // Check if store already exists (avoid duplicates)
                const existing = await getDocs(
                    query(collection(db, "stores"), where("name", "==", store.name))
                );

                if (!existing.empty) {
                    newResults.push({ name: store.name, status: "skipped", message: "Already exists" });
                } else {
                    await addDoc(collection(db, "stores"), {
                        ...store,
                        rating: 5.0,
                        isActive: true,
                        createdAt: serverTimestamp(),
                    });
                    newResults.push({ name: store.name, status: "added" });
                }
            } catch (err: any) {
                newResults.push({ name: store.name, status: "error", message: err.message });
            }

            setProgress(Math.round(((i + 1) / SEED_STORES.length) * 100));
            setResults([...newResults]);
        }

        const hasError = newResults.some(r => r.status === "error");
        setSeedStatus(hasError ? "error" : "done");
    };

    const added = results.filter(r => r.status === "added").length;
    const skipped = results.filter(r => r.status === "skipped").length;
    const errors = results.filter(r => r.status === "error").length;

    const handleSeedMultiLocationStores = async () => {
        setMultiSeedStatus("running");
        setMultiResults([]);
        setMultiProgress(0);

        const newResults: StoreResult[] = [];

        for (let i = 0; i < SEED_MULTI_LOCATION_STORES.length; i++) {
            const store = SEED_MULTI_LOCATION_STORES[i];
            try {
                const existing = await getDocs(
                    query(collection(db, "stores"), where("name", "==", store.name))
                );

                if (!existing.empty) {
                    newResults.push({ name: store.name, status: "skipped", message: "Already exists" });
                } else {
                    await addDoc(collection(db, "stores"), {
                        ...store,
                        rating: 5.0,
                        isActive: true,
                        createdAt: serverTimestamp(),
                    });
                    newResults.push({ name: store.name, status: "added" });
                }
            } catch (err: any) {
                newResults.push({ name: store.name, status: "error", message: err.message });
            }

            setMultiProgress(Math.round(((i + 1) / SEED_MULTI_LOCATION_STORES.length) * 100));
            setMultiResults([...newResults]);
        }

        const hasError = newResults.some(r => r.status === "error");
        setMultiSeedStatus(hasError ? "error" : "done");
    };

    const multiAdded = multiResults.filter(r => r.status === "added").length;
    const multiSkipped = multiResults.filter(r => r.status === "skipped").length;
    const multiErrors = multiResults.filter(r => r.status === "error").length;

    // ── Product Seed Handler ────────────────────────────────────────────────
    const handleSeedProducts = async () => {
        setProductSeedStatus("running");
        setProductResults([]);
        setProductProgress(0);
        const newResults: StoreResult[] = [];
        const total = SEED_PRODUCTS.reduce((acc, s) => acc + s.products.length, 0);
        let done = 0;

        for (const storeSeed of SEED_PRODUCTS) {
            // Look up store by name to get its Firestore ID
            const storeSnap = await getDocs(query(collection(db, "stores"), where("name", "==", storeSeed.storeName)));
            if (storeSnap.empty) {
                storeSeed.products.forEach(p => newResults.push({ name: `${storeSeed.storeName} / ${p.title}`, status: "error", message: "Store not found — seed stores first" }));
                done += storeSeed.products.length;
                setProductProgress(Math.round((done / total) * 100));
                setProductResults([...newResults]);
                continue;
            }
            const storeId = storeSnap.docs[0].id;

            for (const product of storeSeed.products) {
                const key = `${storeSeed.storeName} / ${product.title}`;
                try {
                    // Skip if already exists
                    const existing = await getDocs(query(collection(db, "products"), where("storeId", "==", storeId), where("title", "==", product.title)));
                    if (!existing.empty) {
                        newResults.push({ name: key, status: "skipped", message: "Already exists" });
                    } else {
                        await addDoc(collection(db, "products"), {
                            storeId,
                            title: product.title,
                            brand: product.brand,
                            price: product.price,
                            category: product.category,
                            deliveryTime: product.deliveryTime,
                            description: product.description ?? "",
                            inStock: product.inStock,
                            imageName: product.imageName,
                            images: [],
                            createdAt: serverTimestamp(),
                        });
                        newResults.push({ name: key, status: "added" });
                    }
                } catch (err: any) {
                    newResults.push({ name: key, status: "error", message: err.message });
                }
                done++;
                setProductProgress(Math.round((done / total) * 100));
                setProductResults([...newResults]);
            }
        }
        setProductSeedStatus(newResults.some(r => r.status === "error") ? "error" : "done");
    };

    const productAdded = productResults.filter(r => r.status === "added").length;
    const productSkipped = productResults.filter(r => r.status === "skipped").length;
    const productErrors = productResults.filter(r => r.status === "error").length;

    // ── Image Patch Handler ─────────────────────────────────────────────────
    // Only patches products — store images are uploaded manually via Stores page.
    const handleSeedImages = async () => {
        setImageSeedStatus("running");
        setImageSeedResults([]);
        setImageSeedProgress(0);
        const newResults: StoreResult[] = [];

        const productTitles = Object.keys(PRODUCT_IMAGES);
        const total = productTitles.length;
        let done = 0;

        for (const title of productTitles) {
            const imageUrl = PRODUCT_IMAGES[title];
            try {
                const snap = await getDocs(query(collection(db, "products"), where("title", "==", title)));
                if (snap.empty) {
                    newResults.push({ name: title, status: "skipped", message: "Not found — seed products first" });
                } else {
                    for (const d of snap.docs) await updateDoc(doc(db, "products", d.id), { images: [imageUrl] });
                    newResults.push({ name: title, status: "added" });
                }
            } catch (err: any) {
                newResults.push({ name: title, status: "error", message: err.message });
            }
            done++;
            setImageSeedProgress(Math.round((done / total) * 100));
            setImageSeedResults([...newResults]);
        }

        setImageSeedStatus(newResults.some(r => r.status === "error") ? "error" : "done");
    };

    const imageSeedAdded = imageSeedResults.filter(r => r.status === "added").length;
    const imageSeedSkipped = imageSeedResults.filter(r => r.status === "skipped").length;
    const imageSeedErrors = imageSeedResults.filter(r => r.status === "error").length;

    // ── Revert Store Images Handler ─────────────────────────────────────────
    // Clears image + logo on every store so manually-uploaded images can be re-added.
    const handleRevertStoreImages = async () => {
        setRevertStatus("running");
        setRevertResults([]);
        const newResults: StoreResult[] = [];
        try {
            const snap = await getDocs(collection(db, "stores"));
            for (const d of snap.docs) {
                try {
                    await updateDoc(doc(db, "stores", d.id), { image: "", logo: "" });
                    newResults.push({ name: d.data().name ?? d.id, status: "added" });
                } catch (err: any) {
                    newResults.push({ name: d.data().name ?? d.id, status: "error", message: err.message });
                }
                setRevertResults([...newResults]);
            }
        } catch (err: any) {
            newResults.push({ name: "Fetch all stores", status: "error", message: err.message });
            setRevertResults([...newResults]);
        }
        setRevertStatus(newResults.some(r => r.status === "error") ? "error" : "done");
    };

    const revertDone = revertResults.filter(r => r.status === "added").length;
    const revertErrors = revertResults.filter(r => r.status === "error").length;

    // ── Test Mode Handler ───────────────────────────────────────────────────
    const toggleTestMode = async () => {
        setTestModeLoading(true);
        const next = !testMode;
        try {
            await setDoc(doc(db, "config", "app"), { testMode: next }, { merge: true });
            setTestMode(next);
        } catch (err) {
            console.error("Failed to toggle test mode", err);
        }
        setTestModeLoading(false);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-neutral-400">Data management and app configuration.</p>
            </div>

            {/* Seed Stores */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Upload className="h-5 w-5 text-blue-400" />
                            Seed All Stores to Firestore
                        </h3>
                        <p className="text-sm text-neutral-400 mt-1">
                            Pushes all 12 Snatchd stores (Louis Vuitton, Nike, ALD, Kith, Miu Miu, Jacquemus,
                            Bergdorf, Alo, Cos, Aesop, Chanel, Skims) into Firestore with their names,
                            descriptions, addresses, and coordinates. Skips any store that already exists.
                            After seeding, upload images via the Stores page.
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex gap-2 text-sm text-yellow-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>This is safe to run multiple times — it skips stores that already exist. Only runs <strong>adds</strong>, never deletes.</span>
                </div>

                {/* Progress Bar */}
                {seedStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Seeding stores...</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <div className="space-y-2">
                        {(seedStatus === "done" || seedStatus === "error") && (
                            <p className="text-sm font-medium text-neutral-300">
                                {added} added · {skipped} skipped · {errors} errors
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                            {results.map((r) => (
                                <div
                                    key={r.name}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                                        r.status === "added"
                                            ? "border-green-500/30 bg-green-500/10 text-green-300"
                                            : r.status === "skipped"
                                            ? "border-neutral-700 bg-neutral-800/50 text-neutral-400"
                                            : "border-red-500/30 bg-red-500/10 text-red-300"
                                    }`}
                                >
                                    {r.status === "added" ? (
                                        <CheckCircle className="h-4 w-4 shrink-0" />
                                    ) : r.status === "skipped" ? (
                                        <span className="h-4 w-4 shrink-0 text-center text-xs">—</span>
                                    ) : (
                                        <XCircle className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{r.name}</span>
                                    {r.message && <span className="text-xs opacity-70 truncate">({r.message})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSeedStores}
                    disabled={seedStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-neutral-200 transition disabled:opacity-50"
                >
                    {seedStatus === "running" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Seeding...</>
                    ) : seedStatus === "done" ? (
                        <><CheckCircle className="h-4 w-4" /> Seed Again</>
                    ) : (
                        <><Upload className="h-4 w-4" /> Seed All 12 Stores</>
                    )}
                </button>
            </div>

            {/* Seed Multi-Location Stores */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Upload className="h-5 w-5 text-purple-400" />
                            Seed Multi-Location Stores (Location Filtering)
                        </h3>
                        <p className="text-sm text-neutral-400 mt-1">
                            Seeds Apple (SoHo, 5th Ave, UWS, Grand Central), Zara (SoHo, 5th Ave, Columbus Circle,
                            Midtown East), Aesop (West Village, UES), and Alo (UES, Flatiron) — each as a separate
                            Firestore document with neighborhood-specific lat/lng. The iOS app uses GPS to show
                            only the stores near the user.
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 flex gap-2 text-sm text-purple-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Run this <strong>after</strong> the main seed above. Each location is its own Firestore document — add products to each separately via the Stores page.</span>
                </div>

                {multiSeedStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Seeding multi-location stores...</span>
                            <span>{multiProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${multiProgress}%` }} />
                        </div>
                    </div>
                )}

                {multiResults.length > 0 && (
                    <div className="space-y-2">
                        {(multiSeedStatus === "done" || multiSeedStatus === "error") && (
                            <p className="text-sm font-medium text-neutral-300">
                                {multiAdded} added · {multiSkipped} skipped · {multiErrors} errors
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                            {multiResults.map((r) => (
                                <div key={r.name} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                                    r.status === "added" ? "border-green-500/30 bg-green-500/10 text-green-300"
                                    : r.status === "skipped" ? "border-neutral-700 bg-neutral-800/50 text-neutral-400"
                                    : "border-red-500/30 bg-red-500/10 text-red-300"
                                }`}>
                                    {r.status === "added" ? <CheckCircle className="h-4 w-4 shrink-0" />
                                    : r.status === "skipped" ? <span className="h-4 w-4 shrink-0 text-center text-xs">—</span>
                                    : <XCircle className="h-4 w-4 shrink-0" />}
                                    <span className="font-medium truncate">{r.name}</span>
                                    {r.message && <span className="text-xs opacity-70 truncate">({r.message})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSeedMultiLocationStores}
                    disabled={multiSeedStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-500 transition disabled:opacity-50"
                >
                    {multiSeedStatus === "running" ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Seeding...</>
                    ) : multiSeedStatus === "done" ? (
                        <><CheckCircle className="h-4 w-4" /> Seed Again</>
                    ) : (
                        <><Upload className="h-4 w-4" /> Seed 12 Multi-Location Stores</>
                    )}
                </button>
            </div>

            {/* Seed Products */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload className="h-5 w-5 text-green-400" />
                        Seed Product Catalog
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Seeds 3–4 real products for each of the 14 brands (Apple, Zara, LV, Nike, ALD, Kith, Miu Miu,
                        Jacquemus, Bergdorf, Alo, Cos, Aesop, Chanel, Skims). Looks up each store by name to attach
                        the correct <code className="text-green-300">storeId</code>. Run the Store seeds first.
                    </p>
                </div>
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex gap-2 text-sm text-yellow-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Safe to re-run — skips products that already exist for that store.</span>
                </div>

                {productSeedStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Seeding products...</span><span>{productProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${productProgress}%` }} />
                        </div>
                    </div>
                )}

                {productResults.length > 0 && (
                    <div className="space-y-2">
                        {(productSeedStatus === "done" || productSeedStatus === "error") && (
                            <p className="text-sm font-medium text-neutral-300">{productAdded} added · {productSkipped} skipped · {productErrors} errors</p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                            {productResults.map((r, i) => (
                                <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs border ${
                                    r.status === "added" ? "border-green-500/30 bg-green-500/10 text-green-300"
                                    : r.status === "skipped" ? "border-neutral-700 bg-neutral-800/50 text-neutral-400"
                                    : "border-red-500/30 bg-red-500/10 text-red-300"
                                }`}>
                                    {r.status === "added" ? <CheckCircle className="h-3 w-3 shrink-0" />
                                    : r.status === "skipped" ? <span className="shrink-0">—</span>
                                    : <XCircle className="h-3 w-3 shrink-0" />}
                                    <span className="truncate">{r.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSeedProducts}
                    disabled={productSeedStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-500 transition disabled:opacity-50"
                >
                    {productSeedStatus === "running" ? <><Loader2 className="h-4 w-4 animate-spin" /> Seeding...</>
                    : productSeedStatus === "done" ? <><CheckCircle className="h-4 w-4" /> Seed Again</>
                    : <><Upload className="h-4 w-4" /> Seed All Products (~46 items)</>}
                </button>
            </div>

            {/* Revert Store Images */}
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-400" />
                        Revert Store Images
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Clears the <code className="text-red-300">image</code> and <code className="text-red-300">logo</code> fields
                        on every store back to empty — undoing any accidental overwrites.
                        After running this, go to the <strong className="text-white">Stores page</strong> and
                        re-upload your original images for each store.
                    </p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2 text-sm text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>This clears store image URLs for <strong>all</strong> stores. Re-upload via the Stores page after running.</span>
                </div>

                {revertResults.length > 0 && (
                    <div className="space-y-2">
                        {(revertStatus === "done" || revertStatus === "error") && (
                            <p className="text-sm font-medium text-neutral-300">{revertDone} cleared · {revertErrors} errors</p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {revertResults.map((r, i) => (
                                <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs border ${
                                    r.status === "added" ? "border-green-500/30 bg-green-500/10 text-green-300"
                                    : "border-red-500/30 bg-red-500/10 text-red-300"
                                }`}>
                                    {r.status === "added" ? <CheckCircle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
                                    <span className="truncate">{r.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleRevertStoreImages}
                    disabled={revertStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition disabled:opacity-50"
                >
                    {revertStatus === "running" ? <><Loader2 className="h-4 w-4 animate-spin" /> Clearing...</>
                    : revertStatus === "done" ? <><CheckCircle className="h-4 w-4" /> Done — Re-upload via Stores page</>
                    : <><XCircle className="h-4 w-4" /> Clear All Store Images</>}
                </button>
            </div>

            {/* Patch Product Images */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload className="h-5 w-5 text-pink-400" />
                        Patch Product Images
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Writes a product photo into each seeded product's <code className="text-pink-300">images</code> array
                        in Firestore — so the iOS app shows real product imagery. Store images are managed
                        separately via the Stores page and are not touched here.
                    </p>
                </div>
                <div className="rounded-lg border border-pink-500/30 bg-pink-500/10 p-3 flex gap-2 text-sm text-pink-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Run this <strong>after</strong> Seed Product Catalog. Products not yet in Firestore will be skipped.</span>
                </div>

                {imageSeedStatus === "running" && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-neutral-400">
                            <span>Patching images...</span><span>{imageSeedProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full transition-all duration-300" style={{ width: `${imageSeedProgress}%` }} />
                        </div>
                    </div>
                )}

                {imageSeedResults.length > 0 && (
                    <div className="space-y-2">
                        {(imageSeedStatus === "done" || imageSeedStatus === "error") && (
                            <p className="text-sm font-medium text-neutral-300">{imageSeedAdded} updated · {imageSeedSkipped} skipped · {imageSeedErrors} errors</p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                            {imageSeedResults.map((r, i) => (
                                <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs border ${
                                    r.status === "added" ? "border-green-500/30 bg-green-500/10 text-green-300"
                                    : r.status === "skipped" ? "border-neutral-700 bg-neutral-800/50 text-neutral-400"
                                    : "border-red-500/30 bg-red-500/10 text-red-300"
                                }`}>
                                    {r.status === "added" ? <CheckCircle className="h-3 w-3 shrink-0" />
                                    : r.status === "skipped" ? <span className="shrink-0">—</span>
                                    : <XCircle className="h-3 w-3 shrink-0" />}
                                    <span className="truncate">{r.name}</span>
                                    {r.message && <span className="text-xs opacity-60 truncate">({r.message})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSeedImages}
                    disabled={imageSeedStatus === "running"}
                    className="flex items-center gap-2 rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-500 transition disabled:opacity-50"
                >
                    {imageSeedStatus === "running" ? <><Loader2 className="h-4 w-4 animate-spin" /> Patching...</>
                    : imageSeedStatus === "done" ? <><CheckCircle className="h-4 w-4" /> Patch Again</>
                    : <><Upload className="h-4 w-4" /> Patch All Product Images (~46 items)</>}
                </button>
            </div>

            {/* Test Mode Toggle */}
            <div className={`rounded-xl border p-6 space-y-4 transition-colors ${testMode ? "border-yellow-500/40 bg-yellow-500/5" : "border-white/10 bg-neutral-900/50"}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${testMode ? "bg-yellow-500/20" : "bg-neutral-800"}`}>
                            <FlaskConical className={`h-5 w-5 ${testMode ? "text-yellow-400" : "text-neutral-400"}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Test Mode</h3>
                            <p className="text-sm text-neutral-400">
                                {testMode
                                    ? "ON — iOS app shows a yellow banner. Checkout completes instantly with no real charge."
                                    : "OFF — iOS app behaves normally (simulated checkout)."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTestMode}
                        disabled={testModeLoading || !testModeLoaded}
                        className="shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-50"
                        style={{ background: testMode ? "#eab308" : "#404040", color: testMode ? "#000" : "#fff" }}
                    >
                        {testModeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : testMode
                            ? <><ToggleRight className="h-4 w-4" /> Enabled</>
                            : <><ToggleLeft className="h-4 w-4" /> Disabled</>}
                    </button>
                </div>

                {testMode && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-1.5 text-sm text-yellow-300">
                        <p className="font-semibold">What happens in the iOS app right now:</p>
                        <ul className="space-y-1 text-yellow-200/80 list-disc list-inside text-xs">
                            <li>Yellow "TEST MODE — No real charges" banner appears at top of checkout</li>
                            <li>Payment section shows TEST badge on selected card</li>
                            <li>Stripe test cards pre-loaded (Visa 4242, Amex 5555)</li>
                            <li>Tapping "Place Order" succeeds instantly (0.5s) with no network call</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* How Real-Time Sync Works */}
            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-400" />
                    Real-Time App Sync
                </h3>
                <p className="text-sm text-neutral-400">
                    The iOS app uses live Firestore listeners. Any change you make in this portal — adding a store,
                    uploading a product, editing inventory — is reflected in the customer's app within seconds,
                    with no app restart required.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-1">
                    {[
                        { action: "Add a store", result: "Appears in app instantly" },
                        { action: "Add a product", result: "Shows in store immediately" },
                        { action: "Mark out of stock", result: "Shows SOLD OUT in app" },
                    ].map(item => (
                        <div key={item.action} className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                            <p className="text-xs font-semibold text-white">{item.action}</p>
                            <p className="text-xs text-green-400 mt-1">→ {item.result}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
