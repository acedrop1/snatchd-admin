import Foundation

struct Product: Identifiable {
    let id: UUID
    let title: String
    let brand: String
    let price: Double
    let imageName: String // Local asset name (fallback)
    let imageURL: String? // Remote image URL from admin
    let deliveryTime: String
    let category: String
    var inStock: Bool = true
    var zaraProductId: String? = nil
    
    init(id: UUID = UUID(), title: String, brand: String, price: Double, imageName: String, imageURL: String? = nil, deliveryTime: String, category: String, inStock: Bool = true, zaraProductId: String? = nil) {
        self.id = id
        self.title = title
        self.brand = brand
        self.price = price
        self.imageName = imageName
        self.imageURL = imageURL
        self.deliveryTime = deliveryTime
        self.category = category
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
    let name: String
    let category: String
    let imageName: String // Local asset name (fallback)
    let imageURL: String? // Remote image URL from admin
    let address: String? // Store address from admin
    let latitude: Double? // Store latitude for location filtering
    let longitude: Double? // Store longitude for location filtering
    let deliveryRadius: Double? // Delivery radius in kilometers (default: 5km)
    let deliveryTime: String
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
        let radius = deliveryRadius ?? 5.0 // Default 5km
        let distance = calculateDistance(lat1: userLatitude, lon1: userLongitude, lat2: lat, lon2: lon)
        return distance <= radius
    }
    
    // Haversine formula to calculate distance between two coordinates
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
        Store(name: "Louis Vuitton", category: "Luxury Fashion", imageName: "lvstore", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "35 Mins", isSystemImage: false),
        Store(name: "Nike", category: "Sportswear", imageName: "nike", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "45 Mins", isSystemImage: false),
        Store(name: "Aime Leon Dore", category: "Streetwear", imageName: "ald", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "50 Mins", isSystemImage: false),
        Store(name: "Kith", category: "Streetwear", imageName: "kith", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "40 Mins", isSystemImage: false),
        Store(name: "Miu Miu", category: "Luxury Fashion", imageName: "miumiu", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "35 Mins", isSystemImage: false),
        Store(name: "Jacquemus", category: "Luxury Fashion", imageName: "jacquemus", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "45 Mins", isSystemImage: false),
        Store(name: "Bergdorf Goodman", category: "Luxury Department Store", imageName: "bergdorf", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "60 Mins", isSystemImage: false),
        Store(name: "Alo", category: "Activewear", imageName: "alo", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "30 Mins", isSystemImage: false),
        Store(name: "Cos", category: "Modern Essentials", imageName: "cos", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "40 Mins", isSystemImage: false),
        Store(name: "Aesop", category: "Luxury Boutique", imageName: "leaf.fill", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "60 Mins"),
        Store(name: "Chanel", category: "Beauty & Fragrance", imageName: "star.fill", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "55 Mins"),
        Store(name: "Skims", category: "Modern Basics", imageName: "heart.fill", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "40 Mins")
    ]
}
