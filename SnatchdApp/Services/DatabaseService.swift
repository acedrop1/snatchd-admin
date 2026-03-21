import Foundation
import Combine
import FirebaseFirestore

class DatabaseService: ObservableObject {
    static let shared = DatabaseService()
    private let db = Firestore.firestore()

    @Published var products: [Product] = []
    @Published var stores: [Store] = []
    @Published var zaraSohoProducts: [Product] = []
    /// true when the portal's Test Mode toggle is on — checkout skips real payment
    @Published var testMode: Bool = false

    // Listener handles — kept so we can detach if needed
    private var storesListener: ListenerRegistration?
    private var productsListener: ListenerRegistration?
    private var zaraSohoListener: ListenerRegistration?
    private var configListener: ListenerRegistration?

    private init() {
        // Start all real-time listeners immediately on first access
        startListening()
    }

    // MARK: - Start All Listeners

    func startListening() {
        listenToStores()
        listenToProducts()
        listenToZaraSohoProducts()
        listenToConfig()
    }

    // MARK: - App Config Listener (test mode, feature flags)

    func listenToConfig() {
        guard configListener == nil else { return }
        configListener = db.collection("config").document("app")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                if let error = error {
                    print("❌ Config listener error: \(error.localizedDescription)")
                    return
                }
                let isTestMode = snapshot?.data()?["testMode"] as? Bool ?? false
                DispatchQueue.main.async {
                    self.testMode = isTestMode
                    print("⚙️ Test mode: \(isTestMode)")
                }
            }
    }

    // MARK: - Real-Time Stores Listener
    // Any store added, edited, or deleted in the portal instantly updates the app.

    func listenToStores() {
        guard storesListener == nil else { return } // Already listening

        storesListener = db.collection("stores").addSnapshotListener { [weak self] snapshot, error in
            guard let self = self else { return }

            if let error = error {
                print("❌ Stores listener error: \(error.localizedDescription)")
                return
            }

            guard let documents = snapshot?.documents else {
                print("⚠️ No store documents found")
                return
            }

            print("🔄 Stores updated — \(documents.count) stores")

            DispatchQueue.main.async {
                self.stores = documents.compactMap { doc -> Store? in
                    let data = doc.data()
                    let firestoreId = doc.documentID
                    let name = data["name"] as? String ?? ""
                    let category = (data["categories"] as? [String])?.first ?? data["category"] as? String ?? ""

                    // Image URL priority: banner image > logo > images array
                    var imageURL: String? = nil
                    if let bannerImage = data["image"] as? String, !bannerImage.isEmpty {
                        imageURL = bannerImage
                    } else if let logoImage = data["logo"] as? String, !logoImage.isEmpty {
                        imageURL = logoImage
                    } else if let images = data["images"] as? [String], let first = images.first {
                        imageURL = first
                    }

                    let logoURL = data["logo"] as? String
                    let imageName = data["imageName"] as? String ?? "storefront"
                    let address = data["address"] as? String
                    let latitude = data["latitude"] as? Double
                    let longitude = data["longitude"] as? Double
                    let deliveryRadius = data["deliveryRadius"] as? Double
                    let deliveryTime = data["deliveryTime"] as? String ?? "45 Mins"
                    let isSystemImage = imageURL == nil && logoURL == nil

                    return Store(
                        firestoreId: firestoreId,
                        name: name,
                        category: category,
                        imageName: imageName,
                        imageURL: imageURL ?? logoURL,
                        address: address,
                        latitude: latitude,
                        longitude: longitude,
                        deliveryRadius: deliveryRadius,
                        deliveryTime: deliveryTime,
                        isSystemImage: isSystemImage
                    )
                }

                print("✅ Stores synced: \(self.stores.count)")
            }
        }
    }

    // MARK: - Real-Time Products Listener
    // Any product added, edited, or deleted in the portal instantly updates the app.

    func listenToProducts() {
        guard productsListener == nil else { return }

        productsListener = db.collection("products").addSnapshotListener { [weak self] snapshot, error in
            guard let self = self else { return }

            if let error = error {
                print("❌ Products listener error: \(error.localizedDescription)")
                return
            }

            guard let documents = snapshot?.documents else { return }

            print("🔄 Products updated — \(documents.count) products")

            DispatchQueue.main.async {
                self.products = documents.compactMap { doc -> Product? in
                    let data = doc.data()
                    let storeId = data["storeId"] as? String ?? ""
                    let title = data["title"] as? String ?? ""
                    let brand = data["brand"] as? String ?? ""
                    let price = data["price"] as? Double ?? 0.0
                    let images = data["images"] as? [String] ?? []
                    let imageURL = images.first
                    let imageName = data["imageName"] as? String ?? "photo"
                    let deliveryTime = data["deliveryTime"] as? String ?? "45 Mins"
                    let category = data["category"] as? String ?? ""
                    let gender = data["gender"] as? String ?? ""
                    let sizes = data["sizes"] as? [String] ?? []
                    let description = data["description"] as? String ?? ""
                    let inStock = data["inStock"] as? Bool ?? true
                    let zaraProductId = data["zaraProductId"] as? String

                    return Product(
                        storeId: storeId,
                        title: title,
                        brand: brand,
                        price: price,
                        imageName: imageName,
                        imageURL: imageURL,
                        deliveryTime: deliveryTime,
                        category: category,
                        gender: gender,
                        sizes: sizes,
                        description: description,
                        inStock: inStock,
                        zaraProductId: zaraProductId
                    )
                }

                print("✅ Products synced: \(self.products.count)")
            }
        }
    }

    // MARK: - Real-Time Zara SoHo Products Listener

    func listenToZaraSohoProducts() {
        guard zaraSohoListener == nil else { return }

        zaraSohoListener = db.collection("products")
            .whereField("brand", isEqualTo: "Zara")
            .whereField("in_stock_soho", isEqualTo: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }

                if let error = error {
                    print("❌ Zara SoHo listener error: \(error.localizedDescription)")
                    return
                }

                guard let documents = snapshot?.documents else { return }

                print("🔄 Zara SoHo products updated — \(documents.count) in stock")

                DispatchQueue.main.async {
                    self.zaraSohoProducts = documents.compactMap { doc -> Product? in
                        let data = doc.data()
                        let storeId = data["storeId"] as? String ?? ""
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

                        return Product(
                            storeId: storeId,
                            title: title,
                            brand: brand,
                            price: price,
                            imageName: imageName,
                            imageURL: imageURL,
                            deliveryTime: deliveryTime,
                            category: category,
                            inStock: inStock,
                            zaraProductId: zaraProductId
                        )
                    }

                    print("✅ Zara SoHo products synced: \(self.zaraSohoProducts.count)")
                }
            }
    }

    // MARK: - Legacy Fetch Methods (now just ensure listeners are running)
    // These are kept so existing .onAppear { databaseService.fetchStores() } calls still compile.

    func fetchStores() {
        listenToStores()
    }

    func fetchProducts() {
        listenToProducts()
    }

    func fetchZaraSohoProducts() {
        listenToZaraSohoProducts()
    }

    // MARK: - Stop Listening (call on logout / deinit if needed)

    func stopListening() {
        storesListener?.remove()
        productsListener?.remove()
        zaraSohoListener?.remove()
        storesListener = nil
        productsListener = nil
        zaraSohoListener = nil
    }
}
