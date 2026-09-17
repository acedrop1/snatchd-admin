export type SizeState = 'in_stock' | 'out_of_stock' | 'unknown';
export type SourceKind = 'shopify' | 'skims' | 'manual';

export interface SourceVariant {
    id: string;
    sku: string;
    size: string;
    availableForSale: boolean;
    price: number;
    compareAtPrice: number | null;
}

/** One product as every source normalises it. Written to products/{kind}_{externalId}_{storeId}. */
export interface SourceProduct {
    externalId: string;
    handle: string;
    title: string;
    brand: string;
    price: number;
    compareAtPrice: number | null;
    description: string;
    productType: string;
    tags: string[];
    category: string;
    gender: string;
    images: string[];
    sizes: string[];
    styles: string[];
    variants: SourceVariant[];
    availability: Record<string, SizeState>;
    productUrl: string;
}

/** The fields on a store doc that say where its inventory comes from. */
export interface StoreSource {
    id: string;
    name: string;
    brand: string;
    inventorySource: SourceKind;
    sourceDomain?: string;      // shopify: "kith.com"
    sourceCollection?: string;  // skims: collection handle, default best-sellers
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
