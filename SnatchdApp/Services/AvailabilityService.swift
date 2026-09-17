import Foundation

/// What the backend knows about one product right now. `state` is the overall
/// answer; `sizes` is per size. Anything "unknown" means a Snatcher confirms
/// in store before the card is captured — the app must say so, not hide it.
struct ProductAvailability: Decodable {
    struct StoreRef: Decodable {
        let id: String
        let name: String
        let address: String?
    }

    let productId: String
    let state: String              // "in_stock" | "out_of_stock" | "unknown"
    let sizes: [String: String]    // size → same three states
    let source: String             // "skims_online" | "courier" | "none"
    let checkedAt: String?
    let store: StoreRef?

    var checkedDate: Date? {
        guard let checkedAt else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: checkedAt) ?? ISO8601DateFormatter().date(from: checkedAt)
    }

    var unavailableSizes: Set<String> {
        Set(sizes.filter { $0.value == "out_of_stock" }.map { $0.key })
    }
}

final class AvailabilityService {
    static let shared = AvailabilityService()

    func check(productId: String) async throws -> ProductAvailability {
        guard let url = URL(string: AppConfig.availabilityServiceURL) else { throw URLError(.badURL) }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        request.httpBody = try JSONSerialization.data(withJSONObject: ["productId": productId])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(ProductAvailability.self, from: data)
    }
}
