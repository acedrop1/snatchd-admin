# Snatchd – App Launch Checklist
> Generated: March 7, 2026 | Audited by Claude

---

## 🔴 CRITICAL – Launch Blockers (Must Fix Before Submission)

These issues will either cause App Store rejection or leave users/data unprotected.

### Security
- [ ] **Rotate Apify API token** – Token exposed in `snatchd-admin/.env.local`. Go to apify.com → Settings → API Tokens and regenerate immediately.
- [ ] **Remove `.env.local` from git** – Add to `.gitignore` if not already. Never commit `.env.local` files.
- [ ] **Add Firebase Security Rules** – No `firestore.rules` or `storage.rules` exist. Without these, your Firestore data is unprotected. Add proper read/write rules for all collections (`users`, `products`, `stores`, `orders`).

### Payments
- [ ] **Integrate real payment processor** – Currently, checkout is simulated with a 2-second fake delay. No money can actually be charged. Integrate **Stripe** (recommended) or Square. File: `SnatchdApp/Views/CheckoutView.swift`
- [ ] **Remove hardcoded test card data** – Cards ending in `4242` and `5555` are hardcoded in `PaymentManager.swift`. Remove all test data.
- [ ] **Fix expired test card year** – Expiration year `2025` is already expired. Remove all fake cards.

### Apple Sign-In
- [ ] **Fix or remove Apple Sign-In** – Commented out in `AuthManager.swift` due to SDK conflict. Apple requires Sign in with Apple if any other social login is offered. Either fix the SDK conflict or remove all social logins (Google + Apple) and use only phone/email auth.

### Push Notifications
- [ ] **Set up Firebase Cloud Messaging (FCM)** – No push notification infrastructure exists. `AppDelegate.swift` registers APN tokens but never forwards them to FCM for messaging. Required for order status updates.
- [ ] **Add Push Notification entitlement** in Xcode → Signing & Capabilities → Push Notifications.

### App Store Requirements
- [ ] **Add privacy usage descriptions to Info.plist:**
  - `NSLocationWhenInUseUsageDescription` – Required for location features
  - `NSUserNotificationsUsageDescription` – Required for notifications
- [ ] **Create and host a Privacy Policy** – Required for App Store submission. Must describe data collection (Firebase, phone numbers, location, payment info). Host at a public URL.
- [ ] **Create and host Terms of Service** – Strongly recommended for a commerce app.

---

## 🟠 IMPORTANT – Functional Gaps (Major Features Not Working)

### Order System
- [ ] **Implement order persistence to Firestore** – Orders are not saved to the backend. After checkout, nothing is written to the `orders` collection. File: `CheckoutView.swift` (line ~126)
- [ ] **Replace mock order data** – `OrdersView.swift` shows hardcoded order `#0126` for `$424.98`. This needs to load real orders from Firestore for the logged-in user.
- [ ] **Implement real order tracking** – `TrackingView.swift` shows hardcoded courier "Jane Doe" at NYC center coordinates `40.7128, -74.0060`. Needs real delivery status from backend.

### Admin Portal (`snatchd-admin/`)
- [ ] **Build out Orders page** – Currently shows "Coming Soon". Needs to display and manage real orders from Firestore.
- [ ] **Build out Customers page** – Currently shows "Coming Soon". Should show user list and order history.
- [ ] **Build out Settings page** – Currently shows "Coming Soon". At minimum, should allow store config updates.

### Notifications & Communication
- [ ] **Set up order status notifications** – Users should receive push notifications when: order is confirmed, out for delivery, delivered.
- [ ] **Set up email confirmations** – Consider Firebase Extensions (Trigger Email) or SendGrid for order confirmation emails.

---

## 🟡 POLISH – Should Fix Before Launch

### Code Quality
- [ ] **Remove debug print statements** – Multiple `print("DEBUG: ...")` calls left in `StoreProductsView.swift` and other files. Remove before shipping.
- [ ] **Remove all hardcoded test values** – Courier phone `"5551234567"`, fake order numbers, fake prices throughout the codebase.
- [ ] **Fix hardcoded delivery fee and tax** – `$6.00` delivery fee and `8.875%` tax rate are hardcoded in `CheckoutView.swift`. Should be configurable or dynamic.

### iOS App Polish
- [ ] **Review launch screen** – App uses SwiftUI `SplashScreenView` instead of a static LaunchScreen. Verify it meets App Store guidelines.
- [ ] **Test app icon on all device sizes** – 1024x1024 icon exists, confirm it looks correct at all rendered sizes.
- [ ] **Add StoreKit review prompt** – Prompt users for an App Store rating after a successful order delivery.

### Admin Portal
- [ ] **Move Zara SoHo store ID out of hardcode** – Store ID `11719` is hardcoded in `dashboard/page.tsx`. Should be configurable.
- [ ] **Add `.env.example` with all required keys** – Current `.env.example` has empty `NEXT_PUBLIC_FIREBASE_APP_ID`. Fill in a template for future deployments.

---

## 🟢 COMPLETE – Working Features

These are fully implemented and ready:

- ✅ **Phone number authentication** (SMS OTP via Firebase)
- ✅ **Email/password authentication**
- ✅ **Google Sign-In**
- ✅ **User profile creation & management**
- ✅ **Product browsing by category** (Clothing, Hygiene, Beauty, Jewelry)
- ✅ **Location-based store display** (SoHo, NYC)
- ✅ **Real-time Zara stock checking** via Cloud Functions
- ✅ **Product search**
- ✅ **Cart management** (add/remove/quantities, persisted via UserDefaults)
- ✅ **Card validation** (Luhn algorithm, card type detection)
- ✅ **App icon** (1024x1024, light/dark/tinted)
- ✅ **Zara stock Cloud Function** (`checkStock`, `updateZaraSohoStock`)
- ✅ **Admin portal login + product management**
- ✅ **Admin portal store management**
- ✅ **Admin CSV import for bulk products**

---

## 📋 Pre-Submission Checklist (App Store)

- [ ] App tested on physical iPhone (not just simulator)
- [ ] App tested on oldest supported iOS version
- [ ] All screens reviewed on small screen (iPhone SE) and large screen (Pro Max)
- [ ] No crashes on cold launch
- [ ] App Store Connect listing created (name, description, screenshots, keywords)
- [ ] At least 3 screenshots per device size (required)
- [ ] Age rating selected
- [ ] Privacy policy URL entered in App Store Connect
- [ ] Bundle ID matches provisioning profile
- [ ] TestFlight beta test completed

---

## 🗓 Suggested Launch Phases

**Phase 1 – Critical Fixes (1–2 weeks)**
Focus: Security + payments + Apple Sign-In

**Phase 2 – Feature Completion (2–3 weeks)**
Focus: Real orders + tracking + push notifications

**Phase 3 – Polish & Submit (1 week)**
Focus: Debug cleanup, App Store assets, TestFlight beta

---

*Generated from a full codebase audit. For questions or help fixing any item, ask Claude.*
