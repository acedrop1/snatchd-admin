import Foundation

struct Product: Identifiable {
    let id: String           // Firestore document ID — the key everything else (cart, orders, availability) uses
    let storeId: String      // Firestore document ID of the owning store
    let title: String
    let brand: String
    let price: Double
    let imageName: String    // Local asset name (fallback)
    let imageURL: String?    // Primary remote image URL (first of images array)
    var images: [String]     // All remote image URLs — used for gallery/carousel
    let deliveryTime: String
    let category: String
    let gender: String       // "Men" | "Women" | "Kids" | "Unisex" | ""
    var sizes: [String]      // e.g. ["32","34","36"] or ["XS","S","M","L"] or ["OS"]
    var styles: [String]     // e.g. ["Black", "White", "Navy"] — available colour/style options
    var description: String  // Product description from the brand website
    var inStock: Bool = true

    // Per-size availability written by the backend (see functions/src/index.ts):
    //   availability["M"] == "in_stock" | "out_of_stock" | "unknown"
    //   availabilitySource == "skims_online" | "courier" | "none"
    var availability: [String: String] = [:]
    var availabilitySource: String = "none"
    var availabilityCheckedAt: Date? = nil
    var createdAt: Date? = nil

    init(id: String = UUID().uuidString, storeId: String = "", title: String, brand: String, price: Double, imageName: String, imageURL: String? = nil, images: [String] = [], deliveryTime: String, category: String, gender: String = "", sizes: [String] = [], styles: [String] = [], description: String = "", inStock: Bool = true, availability: [String: String] = [:], availabilitySource: String = "none", availabilityCheckedAt: Date? = nil, createdAt: Date? = nil) {
        self.id = id
        self.storeId = storeId
        self.title = title
        self.brand = brand
        self.price = price
        self.imageName = imageName
        // Reconcile imageURL and images: always keep them in sync
        let allImages = images.isEmpty ? (imageURL.map { [$0] } ?? []) : images
        self.images = allImages
        self.imageURL = allImages.first ?? imageURL
        self.deliveryTime = deliveryTime
        self.category = category
        self.gender = gender
        self.sizes = sizes
        self.styles = styles
        self.description = description
        self.inStock = inStock
        self.availability = availability
        self.availabilitySource = availabilitySource
        self.availabilityCheckedAt = availabilityCheckedAt
        self.createdAt = createdAt
    }

    // Computed property to determine which image to use (for single-image contexts)
    var displayImageName: String {
        return imageURL ?? imageName
    }

    var isRemoteImage: Bool {
        return imageURL != nil && !imageURL!.isEmpty
    }

    /// Sizes the backend says are out of stock — the size picker greys these out.
    var unavailableSizes: Set<String> {
        Set(availability.filter { $0.value == "out_of_stock" }.map { $0.key })
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
    var logoURL: String? = nil    // Square logo for avatars/circles; imageURL is the banner
    var categories: [String] = [] // All categories from the portal; `category` is the first

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
    var status: String       // "placed" | "confirmed" | "in_transit" | "delivered" | "cancelled"
    var paymentStatus: String = "paid"   // authorized (held) | paid | released | refunded | failed
    var platformFee: Double = 0
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
        case "cancelled":   return "Cancelled"
        default:            return status.capitalized
        }
    }

    /// What happened to the customer's money — always true, never implied.
    var paymentLabel: String {
        switch paymentStatus {
        case "authorized": return "Card held · charged once your Snatcher confirms the item"
        case "paid":       return "Charged $\(String(format: "%.2f", total))"
        case "released":   return "Not charged · hold released"
        case "refunded":   return "Refunded $\(String(format: "%.2f", total))"
        case "failed":     return "Payment failed · not charged"
        default:           return ""
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
