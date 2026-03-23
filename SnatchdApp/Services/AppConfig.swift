import Foundation

struct AppConfig {
    // API Endpoints
    static let stockCheckServiceURL = "https://checkstock-jkfmw4mdua-uc.a.run.app"

    // ── Stripe ────────────────────────────────────────────────────────
    // Publishable key: safe to ship in the app (starts with pk_test_ or pk_live_)
    // Get yours at https://dashboard.stripe.com/apikeys
    static let stripePublishableKey = "pk_test_51TDoBWIDYhiU4pru0cV3nX24chLZU66MH3uMRFxbJIe9fKqXKn4byxw72SCohHd4KFwNSMs3Rjy9E2bITPJKW9eg00Lfl03714"

    // Cloud Function URL — copy from Firebase Console after deploying
    // e.g. https://createpaymentintent-jkfmw4mdua-uc.a.run.app
    static let createPaymentIntentURL = "https://createpaymentintent-jkfmw4mdua-uc.a.run.app"
    // ──────────────────────────────────────────────────────────────────

    // Default Location (NYC SoHo) - Used as fallback when location unavailable
    static let defaultLatitude: Double = 40.7580
    static let defaultLongitude: Double = -73.9855

    // Default Location Name
    static let defaultLocationName = "SoHo"

    // Cart Persistence Key
    static let cartPersistenceKey = "savedCart"

    // UserDefaults Keys
    static let authVerificationIDKey = "authVerificationID"
}
