import Foundation
import Combine
import FirebaseFirestore

class DatabaseService: ObservableObject {
    static let shared = DatabaseService()
    private let db = Firestore.firestore()
    
    @Published var products: [Product] = []
    @Published var stores: [Store] = []
    @Published var zaraSohoProducts: [Product] = []
    
    // Fetch Products from Firestore
    func fetchProducts() {
        db.collection("products").getDocuments { snapshot, error in
            if let error = error {
                print("Error fetching products: \(error)")
                return
            }
            
            guard let documents = snapshot?.documents else { return }
            
            self.products = documents.compactMap { doc -> Product? in
                let data = doc.data()
                let title = data["title"] as? String ?? ""
                let brand = data["brand"] as? String ?? ""
                let price = data["price"] as? Double ?? 0.0
                
                // Get image URL from images array (admin stores as array)
                let images = data["images"] as? [String] ?? []
                let imageURL = images.first // Use first image from array
                
                // Fallback to imageName if no remote URL
                let imageName = data["imageName"] as? String ?? "photo"
                
                let deliveryTime = data["deliveryTime"] as? String ?? "45 Mins"
                let category = data["category"] as? String ?? ""
                let inStock = data["inStock"] as? Bool ?? true
                let zaraProductId = data["zaraProductId"] as? String
                
                return Product(title: title, brand: brand, price: price, imageName: imageName, imageURL: imageURL, deliveryTime: deliveryTime, category: category, inStock: inStock, zaraProductId: zaraProductId)
            }
        }
    }
    
    // Fetch Stores from Firestore
    func fetchStores() {
        db.collection("stores").getDocuments { snapshot, error in
            if let error = error {
                print("❌ Error fetching stores: \(error)")
                return
            }
            
            guard let documents = snapshot?.documents else {
                print("⚠️ No store documents found")
                return
            }
            
            print("📦 Fetched \(documents.count) stores from Firestore")
            
            self.stores = documents.compactMap { doc -> Store? in
                let data = doc.data()
                let name = data["name"] as? String ?? ""
                let category = data["category"] as? String ?? ""
                
                // Get image URL - check multiple possible fields
                // Admin stores: logo (store logo), image (banner), images (array)
                var imageURL: String? = nil
                
                // Priority 1: Check 'images' array (for products/future stores)
                if let images = data["images"] as? [String], let first = images.first {
                    imageURL = first
                }
                // Priority 2: Check 'image' field (banner/cover image)
                else if let bannerImage = data["image"] as? String, !bannerImage.isEmpty {
                    imageURL = bannerImage
                }
                // Priority 3: Check 'logo' field (store logo)
                else if let logoImage = data["logo"] as? String, !logoImage.isEmpty {
                    imageURL = logoImage
                }
                
                // Debug logging
                print("🏪 Store: \(name)")
                print("   - logo field: \(data["logo"] as? String ?? "nil")")
                print("   - image field: \(data["image"] as? String ?? "nil")")
                print("   - images array: \(data["images"] as? [String] ?? [])")
                print("   - Final imageURL: \(imageURL ?? "nil")")
                
                // Fallback to imageName
                let imageName = data["imageName"] as? String ?? "storefront"
                
                let address = data["address"] as? String
                let latitude = data["latitude"] as? Double
                let longitude = data["longitude"] as? Double
                let deliveryRadius = data["deliveryRadius"] as? Double
                let deliveryTime = data["deliveryTime"] as? String ?? "45 Mins"
                let isSystemImage = data["isSystemImage"] as? Bool ?? (imageURL == nil)
                
                return Store(name: name, category: category, imageName: imageName, imageURL: imageURL, address: address, latitude: latitude, longitude: longitude, deliveryRadius: deliveryRadius, deliveryTime: deliveryTime, isSystemImage: isSystemImage)
            }
            
            print("✅ Successfully mapped \(self.stores.count) stores")
        }
    }
    
    // Fetch Zara SoHo Products (Only items confirmed in stock)
    func fetchZaraSohoProducts() {
        db.collection("products")
            .whereField("brand", isEqualTo: "Zara")
            .whereField("in_stock_soho", isEqualTo: true)
            .getDocuments { snapshot, error in
                if let error = error {
                    print("❌ Error fetching Zara SoHo products: \(error)")
                    return
                }
                
                guard let documents = snapshot?.documents else {
                    print("⚠️ No Zara SoHo products found")
                    return
                }
                
                print("📦 Fetched \(documents.count) Zara SoHo products")
                
                self.zaraSohoProducts = documents.compactMap { doc -> Product? in
                    let data = doc.data()
                    let title = data["title"] as? String ?? ""
                    let brand = data["brand"] as? String ?? ""
                    let price = data["price"] as? Double ?? 0.0
                    
                    let images = data["images"] as? [String] ?? []
                    let imageURL = images.first
                    let imageName = data["imageName"] as? String ?? "photo"
                    let deliveryTime = data["deliveryTime"] as? String ?? "45 Mins"
                    let category = data["category"] as? String ?? ""
                    let inStock = data["in_stock_soho"] as? Bool ?? true
                    let zaraProductId = data["zaraProductId"] as? String
                    
                    return Product(title: title, brand: brand, price: price, imageName: imageName, imageURL: imageURL, deliveryTime: deliveryTime, category: category, inStock: inStock, zaraProductId: zaraProductId)
                }
                
                print("✅ Successfully mapped \(self.zaraSohoProducts.count) Zara SoHo products")
            }
    }
}
