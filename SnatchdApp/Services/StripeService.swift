import SwiftUI
import Combine
import StripePaymentSheet

// MARK: - StripeService
// To activate Stripe payments:
// 1. In Xcode → File → Add Package Dependencies
//    URL: https://github.com/stripe/stripe-ios
//    Add product: StripePaymentSheet
// 2. Replace AppConfig.stripePublishableKey with your pk_test_... key
// 3. Deploy Cloud Functions: cd functions && firebase deploy --only functions
//    Then set your secret key: firebase secrets:set STRIPE_SECRET_KEY
// 4. Replace AppConfig.createPaymentIntentURL with the deployed function URL

@MainActor
class StripeService: ObservableObject {
    @Published var paymentSheet: PaymentSheet?
    @Published var isLoading = false
    @Published var errorMessage: String?

    static let shared = StripeService()

    private init() {
        // Configure Stripe with your publishable key on startup
        StripeAPI.defaultPublishableKey = AppConfig.stripePublishableKey
    }

    /// Call this before presenting PaymentSheet.
    /// Creates a PaymentIntent on your Cloud Function, then configures PaymentSheet.
    func preparePaymentSheet(amount: Double, orderId: String) async throws -> PaymentSheet {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        // 1. Call Cloud Function to create a PaymentIntent
        let clientSecret = try await createPaymentIntent(amount: amount, orderId: orderId)

        // 2. Configure PaymentSheet
        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = "Snatchd"
        config.allowsDelayedPaymentMethods = false
        config.returnURL = "snatchd://stripe-redirect"

        // Apply a dark appearance to match app theme
        var appearance = PaymentSheet.Appearance()
        appearance.colors.background = UIColor(white: 0.08, alpha: 1)
        appearance.colors.componentBackground = UIColor(white: 0.15, alpha: 1)
        appearance.colors.componentBorder = UIColor(white: 0.3, alpha: 1)
        appearance.cornerRadius = 12
        config.appearance = appearance

        let sheet = PaymentSheet(paymentIntentClientSecret: clientSecret, configuration: config)
        self.paymentSheet = sheet
        return sheet
    }

    /// Calls the Firebase Cloud Function and returns a Stripe client_secret.
    private func createPaymentIntent(amount: Double, orderId: String) async throws -> String {
        guard let url = URL(string: AppConfig.createPaymentIntentURL) else {
            throw StripeServiceError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30   // fail fast instead of hanging for 60s

        let body: [String: Any] = [
            "amount": amount,
            "orderId": orderId,
            "currency": "usd"
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch let urlError as URLError where urlError.code == .timedOut {
            throw StripeServiceError.serverError("Payment server timed out. Please try again.")
        } catch let urlError as URLError where urlError.code == .notConnectedToInternet || urlError.code == .networkConnectionLost {
            throw StripeServiceError.serverError("No internet connection. Please check your network and try again.")
        }

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            // Try to extract error message from JSON; fall back to raw string; last resort generic message
            let rawString = String(data: data, encoding: .utf8) ?? ""
            let msg: String
            if let decoded = try? JSONDecoder().decode([String: String].self, from: data),
               let errMsg = decoded["error"] {
                msg = errMsg
            } else if !rawString.isEmpty && rawString.count < 300 {
                msg = rawString
            } else {
                msg = "Payment setup failed (HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0))"
            }
            throw StripeServiceError.serverError(msg)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let clientSecret = json["clientSecret"] as? String else {
            throw StripeServiceError.missingClientSecret
        }

        return clientSecret
    }
}

enum StripeServiceError: LocalizedError {
    case invalidURL
    case serverError(String)
    case missingClientSecret

    var errorDescription: String? {
        switch self {
        case .invalidURL:           return "Payment service URL is not configured."
        case .serverError(let msg): return msg
        case .missingClientSecret:  return "Invalid response from payment server."
        }
    }
}
