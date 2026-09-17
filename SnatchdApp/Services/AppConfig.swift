import Foundation

struct AppConfig {
    // Inventory — see functions/src/index.ts `checkAvailability`
    static let availabilityServiceURL = "https://us-central1-snatchd-app26.cloudfunctions.net/checkAvailability"

    // ── Stripe ────────────────────────────────────────────────────────
    // Publishable key: safe to ship in the app (starts with pk_test_ or pk_live_)
    // Get yours at https://dashboard.stripe.com/apikeys
    static let stripePublishableKey = "pk_test_51TDoBWIDYhiU4pru0cV3nX24chLZU66MH3uMRFxbJIe9fKqXKn4byxw72SCohHd4KFwNSMs3Rjy9E2bITPJKW9eg00Lfl03714"

    // Orders are priced and created server-side (functions/src/index.ts createOrder);
    // the app only ever sends product ids, sizes and quantities.
    static let functionsBaseURL = "https://us-central1-snatchd-app26.cloudfunctions.net"
    // ──────────────────────────────────────────────────────────────────

    // Default Location (NYC SoHo) - Used as fallback when location unavailable
    static let defaultLatitude: Double = 40.7580
    static let defaultLongitude: Double = -73.9855

    // Default Location Name
    static let defaultLocationName = "SoHo"

    // Cart Persistence Key
    static let cartPersistenceKey = "savedCart"

}
