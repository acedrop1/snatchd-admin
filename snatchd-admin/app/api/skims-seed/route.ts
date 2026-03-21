import { NextResponse } from "next/server";

// Size arrays
const BRA   = ["32A","32B","32C","32D","34A","34B","34C","34D","36B","36C","36D","38B","38C"];
const CLO   = ["XXS","XS","S","M","L","XL","2X","3X"];
const UND   = ["XXS","XS","S","M","L","XL","2X","3X","4X"];
const SHAPE = ["XXS/XS","S/M","L/XL","2X/3X","4X/5X"];
const SWIM  = ["XS","S","M","L","XL"];
const SHOE  = ["6","7","8","9","10","11"];
const SOCK  = ["S/M","L/XL"];

interface SkimsProduct {
  handle: string;
  title: string;
  price: number;
  category: string;
  sizes: string[];
  gender: string;
  imageURL: string;
}

// ── Static best-sellers scraped from skims.com/collections/best-sellers ──────
// Pages 1–3, March 2026 — 89 products
const SKIMS_PRODUCTS: SkimsProduct[] = [
  // ── Bras & Bodysuits ─────────────────────────────────────────────────────
  { handle: "fits-everybody-t-shirt-bra-onyx", title: "Fits Everybody T-Shirt Bra", price: 28, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims-sanity.imgix.net/images/hfqi0zm0/production/3e4956f4a281c88bb7f68859ab27ae7e7663f93c-1188x1485.webp?auto=format&w=600" },
  { handle: "skims-ultimate-teardrop-push-up-bra-onyx", title: "Ultimate Teardrop Push-Up Bra", price: 62, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims-sanity.imgix.net/images/hfqi0zm0/production/bf33a7d0378e060dcca0558fe60eb80c63071e34-1188x1485.jpg?auto=format&w=600" },
  { handle: "everyday-cotton-ultimate-teardrop-push-up-bra-onyx", title: "Everyday Cotton Ultimate Teardrop Push-Up Bra", price: 42, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BR-PUS-10645W-ONX-BG-SKIMS-PANTY_26760-SD.webp?auto=format&w=600" },
  { handle: "everyday-cotton-t-shirt-bra-onyx", title: "Everyday Cotton T-Shirt Bra", price: 32, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BR-LIG-10644W-ONX-BG-SKIMS-BRA_6708-SD_02f22ae2-61e8-49b8-a8f9-21208c6f4d1b.jpg?auto=format&w=600" },
  { handle: "everyday-cotton-unlined-demi-bra-onyx", title: "Everyday Cotton Unlined Demi Bra", price: 32, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BR-UNL-10812W-ONX-BG-SKIMS-BRA_6281-SD.webp?auto=format&w=600" },
  { handle: "wireless-form-super-push-up-bra-clay", title: "Wireless Form Super Push-Up Bra", price: 54, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-BRA-BR-PLG-2632-CLY_grande.jpg?auto=format&w=600" },
  { handle: "wireless-form-push-up-plunge-bra-clay", title: "Wireless Form Push-Up Plunge Bra", price: 48, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-BRA-BR-WRL-1891-CLY_grande.jpg?auto=format&w=600" },
  { handle: "wireless-form-t-shirt-demi-bra-clay", title: "Wireless Form T-Shirt Demi Bra", price: 48, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-BRA-BR-WRL-1889-CLY_grande.jpg?auto=format&w=600" },
  { handle: "skims-ultimate-balconette-push-up-bra-clay", title: "Ultimate Balconette Push-Up Bra", price: 58, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BA-BAL-5486W-CLY-CB-SKIMS-BRA_0036-SD_1697202f-cc66-4ac1-b3f9-e962fbe247ab.jpg?auto=format&w=600" },
  { handle: "skims-ultimate-strapless-push-up-bra-sienna", title: "Ultimate Strapless Push-Up Bra", price: 58, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-BRA-BA-BAN-3208-SIE_1_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-push-up-bra-onyx", title: "Fits Everybody Push-Up Bra", price: 42, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BA-DEM-2295-ONX-GD-SKIMS-BRA_0039-SD.jpg?auto=format&w=600" },
  { handle: "fits-everybody-lace-unlined-scoop-bra-bubble-gum-tonal", title: "Fits Everybody Lace Unlined Scoop Bra", price: 42, category: "Bras & Bodysuits", sizes: BRA, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-BA-DEM-9062-BGT-FLT_grande.jpg?auto=format&w=600" },
  { handle: "cotton-jersey-scoop-bralette-soot", title: "Cotton Jersey Scoop Bralette", price: 32, category: "Bras & Bodysuits", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-BRAS-BR-SCP-9178-SOT-FLT_grande.jpg?auto=format&w=600" },
  { handle: "everyday-cotton-scoop-bralette-onyx", title: "Everyday Cotton Scoop Bralette", price: 28, category: "Bras & Bodysuits", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-BRA-BR-BRL-10643W-ONX-FLT_37e4de5d-b2ec-4e7f-b02e-2bfc6ff34142_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-triangle-bralette-onyx", title: "Fits Everybody Triangle Bralette", price: 34, category: "Bras & Bodysuits", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/BR-TRI-0024-ONX-FL_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-lace-scoop-bralette-onyx", title: "Fits Everybody Lace Scoop Bralette", price: 38, category: "Bras & Bodysuits", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-BRA-BR-SCP-2690-ONX_219d1370-2212-40d1-a169-928b12961a2b_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-square-neck-bodysuit-onyx", title: "Fits Everybody Square Neck Bodysuit", price: 48, category: "Bras & Bodysuits", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-BODYSUIT-BS-SCN-0294-ONX-FL_824c09f6-9876-4bb4-a738-dbb8089db60b_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-cami-bodysuit-onyx", title: "Fits Everybody Cami Bodysuit", price: 54, category: "Bras & Bodysuits", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-BODYSUIT-BS-BST-066-AO-ONX_FR_6ad82a40-e68e-414b-9eb4-4b65f102b93a.jpg?auto=format&w=600" },
  { handle: "nikeskims-matte-double-strap-scoop-bra-obsidian", title: "NikeSkims Double Strap Scoop Bra", price: 62, category: "Activewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-BRA-BR-SPT-6022W-OBD-FLT_b5e3baaf-20ba-4ab6-86bf-1aa1f3932ab4_grande.jpg?auto=format&w=600" },

  // ── Underwear ─────────────────────────────────────────────────────────────
  { handle: "everyday-cotton-thong-onyx", title: "Everyday Cotton Thong", price: 14, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/UN-THG-10647W-ONX-BG-SKIMS-PANTY_26099-SD.webp?auto=format&w=600" },
  { handle: "everyday-cotton-string-thong-onyx", title: "Everyday Cotton String Thong", price: 14, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/UN-THG-10646W-ONX-BG-SKIMS-PANTY_26749-SD.webp?auto=format&w=600" },
  { handle: "everyday-cotton-bikini-onyx", title: "Everyday Cotton Bikini", price: 16, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/UN-BIK-10648W-ONX-BG-SKIMS-PANTY_26498-SD.webp?auto=format&w=600" },
  { handle: "cotton-jersey-dipped-thong-soot", title: "Cotton Jersey Dipped Thong", price: 18, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-PN-DTH-0271-SOT-FLT_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-boy-short-onyx", title: "Fits Everybody Boy Short", price: 24, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/PN-BYS-0030-ONX-FL_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-lace-dipped-thong-bubble-gum-tonal", title: "Fits Everybody Lace Dipped Thong", price: 22, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-PN-THG-9371-BGT-FLT_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-full-brief-onyx", title: "Fits Everybody Full Brief", price: 22, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-PANTIES-PN-BRF-0233-ONX-FL_2542df0f-c95a-4245-9e55-e7cffa550a62_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-brief-onyx", title: "Fits Everybody Brief", price: 22, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-PANTY-PN-BRF-0806-ONX-FL_grande.jpg?auto=format&w=600" },
  { handle: "fits-everybody-lace-boy-short-onyx", title: "Fits Everybody Lace Boy Short", price: 28, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-PN-BOY-4128-ONX_653c4bcb-66f8-4e2c-9ba5-9bca767dbac4_grande.jpg?auto=format&w=600" },
  { handle: "lightweight-cotton-pointelle-lace-string-thong-soot-tonal", title: "Lightweight Cotton Pointelle Lace String Thong", price: 18, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-UN-THG-11112W-SOT_grande.jpg?auto=format&w=600" },
  { handle: "lightweight-cotton-pointelle-lace-brief-soot-tonal", title: "Lightweight Cotton Pointelle Lace Brief", price: 18, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-BR-BRF-8499W-SOT_grande.jpg?auto=format&w=600" },
  { handle: "lightweight-cotton-pointelle-lace-thong-soot-tonal", title: "Lightweight Cotton Pointelle Lace Thong", price: 18, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-TH-THG-8495W-SOT-SW_9cc648f9-29eb-47aa-973a-c2b37bd2990c_grande.jpg?auto=format&w=600" },
  { handle: "lightweight-cotton-logo-picot-string-bikini-snow", title: "Lightweight Cotton Logo Picot String Bikini", price: 16, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-BK-BIK-5960W-SNO_grande.jpg?auto=format&w=600" },
  { handle: "lightweight-cotton-logo-picot-thong-soot", title: "Lightweight Cotton Logo Picot Thong", price: 16, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-TH-THG-5958W-STT-FLT_grande.jpg?auto=format&w=600" },
  { handle: "lightweight-cotton-logo-picot-hipster-snow", title: "Lightweight Cotton Logo Picot Hipster", price: 18, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-HP-HIP-5977W-SNO_grande.jpg?auto=format&w=600" },
  { handle: "lightweight-cotton-string-thong-soot-tonal", title: "Lightweight Cotton String Thong", price: 16, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-TH-THG-8779W-STT-FLT_grande.jpg?auto=format&w=600" },
  { handle: "lightweight-cotton-string-thong-10-pack-heather-soot-multi", title: "Lightweight Cotton String Thong 10-Pack", price: 78, category: "Underwear", sizes: UND, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-UN-THG-11113W-LHG_FLT_grande.jpg?auto=format&w=600" },
  { handle: "cotton-rib-boxer-light-heather-grey", title: "Cotton Rib Boxer", price: 26, category: "Underwear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-UNDERWEAR-PN-HWB-0042-HEG-FL_grande.jpg?auto=format&w=600" },

  // ── Tops ──────────────────────────────────────────────────────────────────
  { handle: "cotton-jersey-t-shirt-cherry-blossom", title: "Cotton Jersey T-Shirt", price: 38, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/AP-TSH-0638-CBM-KC-SKIMS-LOUNGEWEAR_20330-FR.webp?auto=format&w=600" },
  { handle: "cotton-rib-tank-cherry-blossom", title: "Cotton Rib Tank", price: 28, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/AP-TNK-0038-CBM-JC-SKIMS-LOUNGEWEAR_1726-FR.webp?auto=format&w=600" },
  { handle: "cotton-jersey-scoop-neck-t-shirt-cherry-blossom", title: "Cotton Jersey Scoop Neck T-Shirt", price: 38, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SS-STT-8025W-CBM-GD-SKIMS-LOUNGEWEAR_0017-SD_8de4a56d-b9fc-4ff9-9e6a-ee5be9b42664.webp?auto=format&w=600" },
  { handle: "cotton-jersey-scoop-neck-cami-water", title: "Cotton Jersey Scoop Neck Cami", price: 34, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/TP-TNK-10901W-WTR-GD-SKIMS-LOUNGEWEAR_0077-FR.webp?auto=format&w=600" },
  { handle: "cotton-rib-t-shirt-light-heather-grey", title: "Cotton Rib T-Shirt", price: 28, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-AP-TSH-0815-RB-LHG_0006_FR_1.jpg?auto=format&w=600" },
  { handle: "cotton-jersey-long-sleeve-t-shirt-light-heather-grey", title: "Cotton Jersey Long Sleeve T-Shirt", price: 44, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/AP-TSH-0647-LHG_4360-FR.jpg?auto=format&w=600" },
  { handle: "worn-in-jersey-t-shirt-washed-onyx", title: "Worn In Jersey T-Shirt", price: 42, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-TP-SSL-12063W-WON-FLT_grande.jpg?auto=format&w=600" },
  { handle: "cotton-jersey-long-sleeve-boatneck-top-cherry-blossom", title: "Cotton Jersey Long Sleeve Boatneck Top", price: 44, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-LS-LSL-1209W-CMB-FLT_grande.jpg?auto=format&w=600" },
  { handle: "cotton-jersey-long-sleeve-plunge-top-soot", title: "Cotton Jersey Long Sleeve Plunge Top", price: 44, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-LS-LST-11208W-SOT-FLT_grande.jpg?auto=format&w=600" },
  { handle: "sheer-modal-long-sleeve-boatneck-top-onyx", title: "Sheer Modal Long Sleeve Boatneck Top", price: 48, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-LS-LST-6143W-ONX-FLT_6ad70c83-e744-40d8-bb78-e2aedfdc2057_grande.jpg?auto=format&w=600" },
  { handle: "soft-lounge-tank-onyx", title: "Soft Lounge Tank", price: 38, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/AP-TNK-0282-ONX-GC-SKIMS-LOUNGEWEAR-2276-FR.jpg?auto=format&w=600" },
  { handle: "worn-in-jersey-heart-baby-tee-baby-pink", title: "Worn In Jersey Heart Baby Tee", price: 44, category: "Tops", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/TP-SSL-11132W-BAP_grande.jpg?auto=format&w=600" },

  // ── Loungewear / Sets / Pants ─────────────────────────────────────────────
  { handle: "cotton-poplin-oversized-sleep-set-marble-cherub-print", title: "Cotton Poplin Oversized Sleep Set", price: 118, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-ST-LON-11860W-MAC-FLT_281_29_grande.jpg?auto=format&w=600" },
  { handle: "skims-sleep-long-sleeve-button-up-set-onyx", title: "Sleep Long Sleeve Button-Up Set", price: 128, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-ST-PNS-4086-ONX-FLT_grande.jpg?auto=format&w=600" },
  { handle: "soft-lounge-sleep-set-onyx", title: "Soft Lounge Sleep Set", price: 98, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-AP-SET-0600-ONX-COMPOSITE_grande.jpg?auto=format&w=600" },
  { handle: "logo-pointelle-baby-tee-and-micro-short-set-snow-lace-hearts", title: "Logo Pointelle Baby Tee & Micro Short Set", price: 78, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-ST-SST-11292W-SLH-T_composite-FLT_grande.jpg?auto=format&w=600" },
  { handle: "boyfriend-long-sleeve-t-shirt-and-short-boxer-set-marble-heart-banner", title: "Long Sleeve T-Shirt & Short Boxer Set", price: 78, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/ST-SET-7909W-MBH_1_f3eb61f1-39bc-4c07-acd4-d49b22fd2ab7_grande.jpg?auto=format&w=600" },
  { handle: "cotton-fleece-classic-straight-leg-pant-light-heather-grey", title: "Cotton Fleece Classic Straight Leg Pant", price: 88, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/ST-PNT-8385W-LHG-MB-SKIMS-LOUNGEWEAR_0002-FR_3025faae-c8e6-4850-931f-ffa503c38bbe.jpg?auto=format&w=600" },
  { handle: "cotton-jersey-straight-leg-pant-light-heather-grey", title: "Cotton Jersey Straight Leg Pant", price: 68, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-AP-PNT-1384-LHG_grande.jpg?auto=format&w=600" },
  { handle: "worn-in-jersey-heart-straight-leg-pant-baby-pink", title: "Worn In Jersey Heart Straight Leg Pant", price: 68, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-BT-PNT-11865W-BBP-BOTTOM_grande.jpg?auto=format&w=600" },
  { handle: "cotton-jersey-foldover-pant-soot", title: "Cotton Jersey Foldover Pant", price: 58, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/FRONT_FACING_PDP_MDY_051.webp?auto=format&w=600" },
  { handle: "cotton-fleece-classic-jogger-oatmeal-heather", title: "Cotton Fleece Classic Jogger", price: 78, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/JO-JOG-8364W-OAH-VF-SKIMS-LOUNGEWEAR_0043-FR.jpg?auto=format&w=600" },
  { handle: "cotton-fleece-classic-hoodie-oatmeal-heather", title: "Cotton Fleece Classic Hoodie", price: 98, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/PL-PLO-8365W-OAH-VC-SKIMS-LOUNGEWEAR_0009-FR.jpg?auto=format&w=600" },
  { handle: "cotton-fleece-classic-zip-up-hoodie-light-heather-grey", title: "Cotton Fleece Classic Zip Up Hoodie", price: 108, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/ZU-ZUP-8366W-LHG-MB-SKIMS-LOUNGEWEAR_0004-BK-2.jpg?auto=format&w=600" },
  { handle: "cotton-fleece-classic-crewneck-halite", title: "Cotton Fleece Classic Crewneck", price: 88, category: "Loungewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/PL-PLO-8367W-HLT-KD-SKIMS-LOUNGEWEAR_0872-FR.webp?auto=format&w=600" },

  // ── Dresses ───────────────────────────────────────────────────────────────
  { handle: "soft-lounge-petite-long-slip-dress-cherry", title: "Soft Lounge Petite Long Slip Dress", price: 68, category: "Dresses", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-AP-DRS-0596-CHY-FLT_9290f608-321e-4b22-b197-d9069d624e6b_grande.jpg?auto=format&w=600" },
  { handle: "soft-lounge-long-slip-dress-onyx", title: "Soft Lounge Long Slip Dress", price: 78, category: "Dresses", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/AP-DRS-0596-ONX-SKIMS-LOUNGEWEAR_0001-FR.jpg?auto=format&w=600" },
  { handle: "cotton-jersey-mini-tube-dress-soot", title: "Cotton Jersey Mini Tube Dress", price: 48, category: "Dresses", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-OP-DRS-11884W-SOT-FLT_grande.jpg?auto=format&w=600" },
  { handle: "smooth-layers-cut-out-long-dress-obsidian", title: "Smooth Layers Cut Out Long Dress", price: 88, category: "Dresses", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-OP-DRS-11867W-OBS_grande.jpg?auto=format&w=600" },

  // ── Shapewear ─────────────────────────────────────────────────────────────
  { handle: "seamless-sculpt-butt-lifting-short-onyx", title: "Seamless Sculpt Butt Lifting Short", price: 62, category: "Shapewear", sizes: SHAPE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-SHAPEWEAR-SH-SHO-2023-ONX-F_grande.jpg?auto=format&w=600" },
  { handle: "seamless-sculpt-strapless-thong-bodysuit-clay", title: "Seamless Sculpt Strapless Thong Bodysuit", price: 88, category: "Shapewear", sizes: SHAPE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-SHAPEWEAR-BD-THG-2913-CLY_grande.jpg?auto=format&w=600" },
  { handle: "seamless-sculpt-strapless-shortie-bodysuit-sienna", title: "Seamless Sculpt Strapless Shortie Bodysuit", price: 78, category: "Shapewear", sizes: SHAPE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-SHAPEWEAR-BD-MDT-2914-SIENNAcopy_grande.jpg?auto=format&w=600" },
  { handle: "seamless-sculpt-mid-thigh-bodysuit-onyx", title: "Seamless Sculpt Mid Thigh Bodysuit", price: 88, category: "Shapewear", sizes: SHAPE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-SHAPEWEAR-BD-MDT-3372-ONXcopy_grande.jpg?auto=format&w=600" },
  { handle: "seamless-sculpt-brief-bodysuit-onyx", title: "Seamless Sculpt Brief Bodysuit", price: 88, category: "Shapewear", sizes: SHAPE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-SHAPEWEAR-BD-BRF-3370-ONX_grande.jpg?auto=format&w=600" },
  { handle: "sheer-sculpt-low-back-short-sienna", title: "Sheer Sculpt Low Back Short", price: 48, category: "Shapewear", sizes: SHAPE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/products/SKIMS-SHORT-SH-SHO-0299-SIE-FL-FRONT_grande.jpg?auto=format&w=600" },
  { handle: "skims-ultimate-body-push-up-thong-bodysuit-onyx", title: "Ultimate Body Push-Up Thong Bodysuit", price: 98, category: "Shapewear", sizes: SHAPE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-SHAPEWEAR-SL-THG-8044W-ONX_grande.jpg?auto=format&w=600" },
  { handle: "skims-body-core-sculpt-butt-lifting-brief-clay", title: "Core Sculpt Butt Lifting Brief", price: 68, category: "Shapewear", sizes: SHAPE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-PANTY-PN-BRF-8527W-CLY-FLT_grande.jpg?auto=format&w=600" },

  // ── Swimwear ──────────────────────────────────────────────────────────────
  { handle: "signature-swim-plunge-bikini-top-onyx", title: "Signature Swim Plunge Bikini Top", price: 48, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BT-PLG-7500W-ONX-FC-SKIMS-SWIM_0292-FR.webp?auto=format&w=600" },
  { handle: "signature-swim-halter-bikini-top-onyx", title: "Signature Swim Halter Bikini Top", price: 48, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BT-BAN-7486W-ONX-FA-SKIMS-SWIM_0002-FR.webp?auto=format&w=600" },
  { handle: "signature-swim-triangle-bikini-top-onyx", title: "Signature Swim Triangle Bikini Top", price: 48, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BT-TRI-8466W-ONX-FA-SKIMS-SWIM_0001-FR.webp?auto=format&w=600" },
  { handle: "signature-swim-string-bikini-bottom-onyx", title: "Signature Swim String Bikini Bottom", price: 42, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BB-BRF-8473W-ONX-FC-SKIMS-SWIM_0352-FR.webp?auto=format&w=600" },
  { handle: "signature-swim-tanga-bikini-bottom-onyx", title: "Signature Swim Tanga Bikini Bottom", price: 42, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BB-TNG-8472W-ONX-FA-SKIMS-SWIM_0020-FR.webp?auto=format&w=600" },
  { handle: "signature-swim-dipped-tie-bikini-bottom-onyx", title: "Signature Swim Dipped Tie Bikini Bottom", price: 42, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BB-BRF-8468W-ONX-FA-SKIMS-SWIM_0131-FR.webp?auto=format&w=600" },
  { handle: "signature-swim-thong-bikini-bottom-onyx", title: "Signature Swim Thong Bikini Bottom", price: 38, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/BB-THG-8471W-ONX-FA-SKIMS-SWIM_0010-FR.webp?auto=format&w=600" },
  { handle: "signature-swim-scoop-neck-one-piece-onyx", title: "Signature Swim Scoop Neck One Piece", price: 98, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/OP-BRF-8477W-ONX-FA-SKIMS-SWIM_0010-FR.webp?auto=format&w=600" },
  { handle: "signature-swim-plunge-one-piece-cerulean", title: "Signature Swim Plunge One Piece", price: 98, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-SWIM-OS-ONE-10696W-CRL_grande.jpg?auto=format&w=600" },
  { handle: "signature-swim-plunge-monokini-cerulean", title: "Signature Swim Plunge Monokini", price: 72, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-SWIM-OS-ONE-1698W-CRL_grande.jpg?auto=format&w=600" },
  { handle: "signature-swim-halter-bikini-top-aqua-ombre-snake", title: "Signature Swim Halter Bikini Top (Aqua)", price: 48, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-SWIM-BT-BAN-7486W-AOS_grande.jpg?auto=format&w=600" },
  { handle: "signature-swim-tanga-bikini-bottom-aqua-ombre-snake", title: "Signature Swim Tanga Bikini Bottom (Aqua)", price: 42, category: "Swimwear", sizes: SWIM, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-BB-TNG-8472W-AQU_grande.jpg?auto=format&w=600" },

  // ── Activewear (NikeSkims) ────────────────────────────────────────────────
  { handle: "nikeskims-matte-26-inch-legging-obsidian", title: "NikeSkims Matte 26\" Legging", price: 98, category: "Activewear", sizes: CLO, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-LOUNGEWEAR-BO-LEG-7005W-OBD-FLT_grande.jpg?auto=format&w=600" },
  { handle: "nikeskims-footwear-rift-mesh-black", title: "NikeSkims Rift Mesh Sandal", price: 158, category: "Shoes", sizes: SHOE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/NIKESKIMS-RIFT-IO7694-OBD-FLT-1_grande.jpg?auto=format&w=600" },
  { handle: "jelly-shoe-clay", title: "Jelly Shoe", price: 88, category: "Shoes", sizes: SHOE, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-ACCESSORIES-FW-FTW-8652W-CLY-SW-ALT_grande.jpg?auto=format&w=600" },
  { handle: "nikeskims-accessories-dri-fit-crew-sock-3-pack-himalayan-multi", title: "NikeSkims Dri-Fit Crew Sock 3-Pack", price: 28, category: "Accessories", sizes: SOCK, gender: "Women", imageURL: "https://skims.imgix.net/s/files/1/0259/5448/4284/files/SKIMS-NIKE-ACCESSORIES-IQ8104-907-HeatherMulti_3d5545f7-d433-48ea-a5a1-95b08baa9d80_grande.jpg?auto=format&w=600" },
];

export async function GET() {
  const products = SKIMS_PRODUCTS.map((p) => ({
    externalId: p.handle,
    title: p.title,
    brand: "Skims",
    price: p.price,
    category: p.category,
    gender: p.gender,
    sizes: p.sizes,
    description: "",
    deliveryTime: "40 Mins",
    inStock: true,
    imageURL: p.imageURL,
    images: [p.imageURL],
    isRemoteImage: true,
  }));

  return NextResponse.json({ products, count: products.length });
}
