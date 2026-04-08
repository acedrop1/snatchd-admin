import Foundation

struct Product: Identifiable {
    let id: UUID
    let storeId: String      // Firestore document ID of the owning store
    let title: String
    let brand: String
    let price: Double
    let imageName: String // Local asset name (fallback)
    let imageURL: String? // Remote image URL from admin
    let deliveryTime: String
    let category: String
    let gender: String       // "Men" | "Women" | "Kids" | "Unisex" | ""
    var sizes: [String]      // e.g. ["32","34","36"] or ["XS","S","M","L"] or ["OS"]
    var styles: [String]     // e.g. ["Black", "White", "Navy"] — available colour/style options
    var description: String  // Product description from the brand website
    var inStock: Bool = true
    var zaraProductId: String? = nil

    init(id: UUID = UUID(), storeId: String = "", title: String, brand: String, price: Double, imageName: String, imageURL: String? = nil, deliveryTime: String, category: String, gender: String = "", sizes: [String] = [], styles: [String] = [], description: String = "", inStock: Bool = true, zaraProductId: String? = nil) {
        self.id = id
        self.storeId = storeId
        self.title = title
        self.brand = brand
        self.price = price
        self.imageName = imageName
        self.imageURL = imageURL
        self.deliveryTime = deliveryTime
        self.category = category
        self.gender = gender
        self.sizes = sizes
        self.styles = styles
        self.description = description
        self.inStock = inStock
        self.zaraProductId = zaraProductId
    }
    
    // Computed property to determine which image to use
    var displayImageName: String {
        // If we have a remote URL, return it; otherwise use local asset
        return imageURL ?? imageName
    }
    
    var isRemoteImage: Bool {
        return imageURL != nil && !imageURL!.isEmpty
    }
}

struct Store: Identifiable {
    let id = UUID()
    let firestoreId: String  // Firestore document ID — used to match products.storeId
    let name: String
    let category: String
    let imageName: String // Local asset name (fallback)
    let imageURL: String? // Remote image URL from admin
    let address: String? // Store address from admin
    let latitude: Double? // Store latitude for location filtering
    let longitude: Double? // Store longitude for location filtering
    let deliveryRadius: Double? // Delivery radius in miles (default: 10 miles). Stored in Firestore as miles.
    let deliveryTime: String
    var tags: [String] = []       // e.g. ["foryou", "trending", "60min"]
    var isSystemImage: Bool = true

    // Computed property to determine which image to use
    var displayImageName: String {
        return imageURL ?? imageName
    }
    
    var isRemoteImage: Bool {
        return imageURL != nil && !imageURL!.isEmpty
    }
    
    // Helper to check if store is within delivery range of a location
    func isWithinDeliveryRange(of userLatitude: Double, userLongitude: Double) -> Bool {
        guard let lat = latitude, let lon = longitude else { return false }
        let radiusMiles = deliveryRadius ?? 10.0          // Default 10 miles
        let radiusKm    = radiusMiles * 1.60934           // Convert to km for Haversine
        let distance    = calculateDistance(lat1: userLatitude, lon1: userLongitude, lat2: lat, lon2: lon)
        return distance <= radiusKm
    }

    // Haversine formula — returns distance in km
    private func calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
        let earthRadius = 6371.0 // km
        let dLat = (lat2 - lat1) * .pi / 180
        let dLon = (lon2 - lon1) * .pi / 180
        let a = sin(dLat/2) * sin(dLat/2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
                sin(dLon/2) * sin(dLon/2)
        let c = 2 * atan2(sqrt(a), sqrt(1-a))
        return earthRadius * c
    }
}

// MARK: - Order Models

struct OrderItem: Identifiable {
    let id: String
    let productId: String
    let productTitle: String
    let productBrand: String
    let productPrice: Double
    let productImageURL: String?
    let storeId: String
    let storeName: String
    var quantity: Int
    var selectedSize: String
}

struct Order: Identifiable {
    let id: String           // Firestore document ID
    let userId: String
    var items: [OrderItem]
    let subtotal: Double
    let deliveryFee: Double
    let tax: Double
    let total: Double
    let deliveryAddress: String
    let deliveryOption: String
    var status: String       // "placed" | "confirmed" | "in_transit" | "delivered"
    let createdAt: Date
    var orderNumber: String  // e.g. "SNT-0042"
    // Driver & live tracking — set by admin
    var driverName: String?
    var driverPhone: String?
    var trackingStatus: String  // "headed_to_store" | "shopping" | "checking_out" | "on_the_way" | "almost_there" | "delivered"

    /// Unique store names in this order, for display
    var storeNames: [String] {
        Array(Set(items.map { $0.storeName })).sorted()
    }

    /// Human-readable store summary: "Nike, Zara + 1 other"
    var storeSummary: String {
        let names = storeNames
        switch names.count {
        case 0: return "Snatchd Order"
        case 1: return names[0]
        case 2: return "\(names[0]), \(names[1])"
        default: return "\(names[0]), \(names[1]) +\(names.count - 2) other\(names.count - 2 > 1 ? "s" : "")"
        }
    }

    var statusLabel: String {
        switch status {
        case "placed":      return "Order Placed"
        case "confirmed":   return "Confirmed"
        case "in_transit":  return "On the Way"
        case "delivered":   return "Delivered"
        default:            return status.capitalized
        }
    }

    var trackingLabel: String {
        switch trackingStatus {
        case "headed_to_store": return "Headed to Store"
        case "shopping":        return "Shopping"
        case "checking_out":    return "Checking Out"
        case "on_the_way":      return "On the Way"
        case "almost_there":    return "Almost There!"
        case "delivered":       return "Delivered"
        default:                return "Order Placed"
        }
    }

    /// Index of current tracking step (0-5) for progress display
    var trackingStep: Int {
        let steps = ["headed_to_store","shopping","checking_out","on_the_way","almost_there","delivered"]
        return steps.firstIndex(of: trackingStatus) ?? -1
    }

    var isActive: Bool {
        status != "delivered" && status != "cancelled"
    }
}

class MockDataService {
    static let shared = MockDataService()
    
    let trendingProducts: [Product] = [
        Product(title: "Eleos Hand Balm", brand: "Aesop", price: 120.0, imageName: "product1", imageURL: nil, deliveryTime: "45 Mins", category: "Beauty & Skincare", zaraProductId: "504347744"),
        Product(title: "Air Force 1 '07", brand: "Nike", price: 110.0, imageName: "product2", imageURL: nil, deliveryTime: "45 Mins", category: "Clothing"),
        Product(title: "Keepall Bandouliere", brand: "Louis Vuitton", price: 2450.0, imageName: "product3", imageURL: nil, deliveryTime: "35 Mins", category: "Clothing"),
        Product(title: "Silk Pajamas", brand: "Skims", price: 250.0, imageName: "product4", imageURL: nil, deliveryTime: "40 Mins", category: "Clothing"),
        Product(title: "Regular Fit T-Shirt", brand: "Cos", price: 45.0, imageName: "product5", imageURL: nil, deliveryTime: "40 Mins", category: "Clothing"),
        Product(title: "Logo Hoodie", brand: "Aime Leon Dore", price: 185.0, imageName: "product6", imageURL: nil, deliveryTime: "50 Mins", category: "Clothing"),
        Product(title: "Box Logo Tee", brand: "Kith", price: 65.0, imageName: "product7", imageURL: nil, deliveryTime: "40 Mins", category: "Clothing"),
        Product(title: "Wander Matelassé", brand: "Miu Miu", price: 2850.0, imageName: "product8", imageURL: nil, deliveryTime: "35 Mins", category: "Clothing")
    ]
    
    let stores: [Store] = [
        Store(firestoreId: "", name: "Louis Vuitton", category: "Luxury Fashion", imageName: "lvstore", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "35 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Nike", category: "Sportswear", imageName: "nike", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "45 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Aime Leon Dore", category: "Streetwear", imageName: "ald", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "50 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Kith", category: "Streetwear", imageName: "kith", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "40 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Miu Miu", category: "Luxury Fashion", imageName: "miumiu", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "35 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Jacquemus", category: "Luxury Fashion", imageName: "jacquemus", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "45 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Bergdorf Goodman", category: "Luxury Department Store", imageName: "bergdorf", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "60 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Alo", category: "Activewear", imageName: "alo", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "30 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Cos", category: "Modern Essentials", imageName: "cos", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "40 Mins", isSystemImage: false),
        Store(firestoreId: "", name: "Aesop", category: "Luxury Boutique", imageName: "leaf.fill", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "60 Mins"),
        Store(firestoreId: "", name: "Chanel", category: "Beauty & Fragrance", imageName: "star.fill", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "55 Mins"),
        Store(firestoreId: "", name: "Skims", category: "Modern Basics", imageName: "heart.fill", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "40 Mins")
    ]
}
