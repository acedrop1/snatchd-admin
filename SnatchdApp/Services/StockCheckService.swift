import Foundation

struct StoreAvailability: Codable, Identifiable {
    let storeId: String
    let storeName: String
    let storeAddress: String?
    let inStock: Bool
    let distance: Double?
    let lastChecked: String
    
    var id: String { storeId }
    
    // Computation property for UI
    var address: String { storeAddress ?? "" }
}

struct StockResponse: Codable {
    let success: Bool
    let cached: Bool
    let stores: [StoreAvailability]
}

class StockCheckService {
    static let shared = StockCheckService()
    
    private let functionUrl = AppConfig.stockCheckServiceURL
    
    func checkStock(productId: String, zaraProductId: String, latitude: Double, longitude: Double) async throws -> [StoreAvailability] {
        guard let url = URL(string: functionUrl) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "productId": productId,
            "zaraProductId": zaraProductId,
            "latitude": latitude,
            "longitude": longitude
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
             // Debugging text if fails
            if let str = String(data: data, encoding: .utf8) {
                print("Stock Check Error: \(str)")
            }
            throw URLError(.badServerResponse)
        }
        
        let stockResponse = try JSONDecoder().decode(StockResponse.self, from: data)
        return stockResponse.stores
    }
}
