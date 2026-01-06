import SwiftUI
import Combine

// MARK: - Size Category Enum
enum SizeCategory: String, CaseIterable, Codable {
    case tops = "Tops"
    case bottoms = "Bottoms"
    case shoes = "Shoes"
    case outerwear = "Outerwear"
    case dresses = "Dresses"
    
    var icon: String {
        switch self {
        case .tops: return "tshirt"
        case .bottoms: return "figure.walk"
        case .shoes: return "shoe"
        case .outerwear: return "jacket"
        case .dresses: return "figure.dress"
        }
    }
    
    var options: [String] {
        switch self {
        case .tops, .outerwear, .dresses:
            return ["XS", "S", "M", "L", "XL", "XXL"]
        case .bottoms:
            return ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40"]
        case .shoes:
            return ["6", "7", "8", "9", "10", "11", "12", "13"]
        }
    }
}

// MARK: - User Size Manager
class UserSizeManager: ObservableObject {
    @Published var sizes: [SizeCategory: String] = [:]
    
    private let userDefaultsKey = "userSizes"
    
    init() {
        loadSizes()
    }
    
    func updateSize(for category: SizeCategory, size: String) {
        sizes[category] = size
        saveSizes()
    }
    
    func getSize(for category: SizeCategory) -> String {
        return sizes[category] ?? "Select Size"
    }
    
    private func saveSizes() {
        // Convert dictionary keys to String for Codable
        let rawSizes = Dictionary(uniqueKeysWithValues: sizes.map { ($0.key.rawValue, $0.value) })
        
        if let encoded = try? JSONEncoder().encode(rawSizes) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
    }
    
    private func loadSizes() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([String: String].self, from: data) {
            // Convert back to [SizeCategory: String]
            self.sizes = Dictionary(uniqueKeysWithValues: decoded.compactMap { key, value in
                guard let category = SizeCategory(rawValue: key) else { return nil }
                return (category, value)
            })
        }
    }
}
