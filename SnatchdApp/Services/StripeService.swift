import SwiftUI
import Combine
import FirebaseAuth
import StripePaymentSheet

// MARK: - StripeService

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

    struct PlacedOrder { let orderId: String; let orderNumber: String; let total: Double; let sheet: PaymentSheet }
    struct OrderLine: Encodable { let productId: String; let size: String; let quantity: Int }

    /// Creates the order on the server (which prices it) and returns a PaymentSheet for
    /// exactly that amount. The card is only authorised here; it is charged when the
    /// Snatcher confirms the item in hand.
    func placeOrder(lines: [OrderLine], deliveryAddress: String, deliveryOption: String) async throws -> PlacedOrder {
        isLoading = true; errorMessage = nil
        defer { isLoading = false }
        let json = try await call("createOrder", body: [
            "items": lines.map { ["productId": $0.productId, "size": $0.size, "quantity": $0.quantity] },
            "deliveryAddress": deliveryAddress, "deliveryOption": deliveryOption,
        ])
        guard let orderId = json["orderId"] as? String, let clientSecret = json["clientSecret"] as? String else {
            throw StripeServiceError.missingClientSecret
        }
        var config = PaymentSheet.Configuration()
        config.merchantDisplayName = "Snatchd"
        config.allowsDelayedPaymentMethods = false
        config.returnURL = "snatchd://stripe-redirect"
        var appearance = PaymentSheet.Appearance()
        appearance.colors.background = UIColor(white: 0.08, alpha: 1)
        appearance.colors.componentBackground = UIColor(white: 0.15, alpha: 1)
        appearance.colors.componentBorder = UIColor(white: 0.3, alpha: 1)
        appearance.colors.componentText = .white
        appearance.colors.text = .white
        appearance.colors.textSecondary = UIColor(white: 0.7, alpha: 1)
        appearance.colors.primary = .white
        appearance.primaryButton.backgroundColor = .white
        appearance.primaryButton.textColor = .black
        appearance.cornerRadius = 12
        config.appearance = appearance
        return PlacedOrder(orderId: orderId, orderNumber: json["orderNumber"] as? String ?? "",
                           total: json["total"] as? Double ?? 0,
                           sheet: PaymentSheet(paymentIntentClientSecret: clientSecret, configuration: config))
    }

    /// After PaymentSheet completes: the server asks Stripe and records the hold.
    func paymentAuthorized(orderId: String) async {
        _ = try? await call("paymentAuthorized", body: ["orderId": orderId])
    }

    /// Customer dismissed the sheet: drop the pending order and its hold.
    func abandonOrder(orderId: String) async {
        _ = try? await call("abandonOrder", body: ["orderId": orderId])
    }

    /// POST to a Cloud Function with the signed-in user's ID token.
    private func call(_ fn: String, body: [String: Any]) async throws -> [String: Any] {
        guard let user = Auth.auth().currentUser else { throw StripeServiceError.serverError("Please sign in to place an order.") }
        let token = try await user.getIDToken()
        guard let url = URL(string: "\(AppConfig.functionsBaseURL)/\(fn)") else { throw StripeServiceError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch let e as URLError where e.code == .timedOut {
            throw StripeServiceError.serverError("Payment server timed out. Please try again.")
        } catch let e as URLError where e.code == .notConnectedToInternet || e.code == .networkConnectionLost {
            throw StripeServiceError.serverError("No internet connection. Please check your network and try again.")
        }
        let json = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw StripeServiceError.serverError(json["error"] as? String ?? "Payment setup failed (HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0))")
        }
        return json
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
