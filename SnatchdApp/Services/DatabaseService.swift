import Foundation
import Combine
import FirebaseFirestore

class DatabaseService: ObservableObject {
    static let shared = DatabaseService()
    private let db = Firestore.firestore()

    @Published var products: [Product] = []
    @Published var stores: [Store] = []
    @Published var zaraSohoProducts: [Product] = []
    @Published var justDroppedProducts: [Product] = []
    @Published var activeOrders: [Order] = []
    @Published var pastOrders: [Order] = []
    @Published var trackedOrder: Order? = nil
    /// Section order config: ["foryou": ["id1","id2"...], "trending": [...], "60min": [...]]
    @Published var storeOrderConfig: [String: [String]] = [:]
    /// true when the portal's Test Mode toggle is on — checkout skips real payment
    @Published var testMode: Bool = false
    @Published var standardDeliveryFee: Double = 6.00
    @Published var priorityDeliveryFee: Double = 6.99

    // Listener handles — kept so we can detach if needed
    private var storesListener: ListenerRegistration?
    private var productsListener: ListenerRegistration?
    private var zaraSohoListener: ListenerRegistration?
    private var configListener: ListenerRegistration?
    private var justDroppedListener: ListenerRegistration?
    private var storeOrderListener: ListenerRegistration?
    private var ordersListener: ListenerRegistration?
    private var trackedOrderListener: ListenerRegistration?

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
        listenToJustDropped()
        listenToStoreOrder()
        listenToFees()
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

    // MARK: - Delivery Fees Listener

    func listenToFees() {
        db.collection("config").document("fees")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self, error == nil else { return }
                let data = snapshot?.data() ?? [:]
                let standard = data["standardFee"] as? Double ?? 6.00
                let priority = data["priorityFee"] as? Double ?? 6.99
                DispatchQueue.main.async {
                    self.standardDeliveryFee = standard
                    self.priorityDeliveryFee = priority
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

                    // Skip stores hidden from the app by the admin portal
                    let isActive = data["isActive"] as? Bool ?? true
                    guard isActive else { return nil }

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
                    let tags = data["tags"] as? [String] ?? []
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
                        tags: tags,
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
                    // Price can come from Firestore as Int64 or Double — handle both
                    let price: Double
                    if let d = data["price"] as? Double { price = d }
                    else if let i = data["price"] as? Int { price = Double(i) }
                    else if let i = data["price"] as? Int64 { price = Double(i) }
                    else { price = 0.0 }
                    // Images: try [String] first, fall back to [Any] element cast
                    let images: [String]
                    if let direct = data["images"] as? [String] { images = direct }
                    else if let raw = data["images"] as? [Any] { images = raw.compactMap { $0 as? String } }
                    else { images = [] }
                    // imageURL: prefer images array, fall back to explicit imageURL field
                    let imageURL = images.first ?? (data["imageURL"] as? String)
                    let imageName = data["imageName"] as? String ?? "photo"
                    let deliveryTime = data["deliveryTime"] as? String ?? "45 Mins"
                    let category = data["category"] as? String ?? ""
                    let gender = data["gender"] as? String ?? ""
                    // Sizes: try [String] first, fall back to [Any] element cast
                    let sizes: [String]
                    if let direct = data["sizes"] as? [String] { sizes = direct }
                    else if let raw = data["sizes"] as? [Any] { sizes = raw.compactMap { $0 as? String } }
                    else { sizes = [] }
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

    // MARK: - Just Dropped Products Listener

    func listenToJustDropped() {
        guard justDroppedListener == nil else { return }

        justDroppedListener = db.collection("products")
            .whereField("isJustDropped", isEqualTo: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }

                if let error = error {
                    print("❌ Just Dropped listener error: \(error.localizedDescription)")
                    return
                }

                guard let documents = snapshot?.documents else { return }
                print("🔄 Just Dropped updated — \(documents.count) products")

                DispatchQueue.main.async {
                    self.justDroppedProducts = documents.compactMap { doc -> Product? in
                        let data = doc.data()
                        let storeId = data["storeId"] as? String ?? ""
                        let title = data["title"] as? String ?? ""
                        let brand = data["brand"] as? String ?? ""
                        let price: Double
                        if let d = data["price"] as? Double { price = d }
                        else if let i = data["price"] as? Int { price = Double(i) }
                        else if let i = data["price"] as? Int64 { price = Double(i) }
                        else { price = 0.0 }
                        let images: [String]
                        if let direct = data["images"] as? [String] { images = direct }
                        else if let raw = data["images"] as? [Any] { images = raw.compactMap { $0 as? String } }
                        else { images = [] }
                        let imageURL = images.first ?? (data["imageURL"] as? String)
                        let deliveryTime = data["deliveryTime"] as? String ?? "45 Mins"
                        let category = data["category"] as? String ?? ""
                        let gender = data["gender"] as? String ?? ""
                        let sizes: [String]
                        if let direct = data["sizes"] as? [String] { sizes = direct }
                        else if let raw = data["sizes"] as? [Any] { sizes = raw.compactMap { $0 as? String } }
                        else { sizes = [] }

                        return Product(
                            storeId: storeId,
                            title: title,
                            brand: brand,
                            price: price,
                            imageName: "photo",
                            imageURL: imageURL,
                            deliveryTime: deliveryTime,
                            category: category,
                            gender: gender,
                            sizes: sizes
                        )
                    }
                    print("✅ Just Dropped synced: \(self.justDroppedProducts.count)")
                }
            }
    }

    // MARK: - Store Order Config Listener

    func listenToStoreOrder() {
        guard storeOrderListener == nil else { return }

        storeOrderListener = db.collection("config").document("store-order")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                if let error = error {
                    print("❌ Store order listener error: \(error.localizedDescription)")
                    return
                }
                var config: [String: [String]] = [:]
                if let data = snapshot?.data() {
                    for key in ["foryou", "trending", "60min"] {
                        if let order = data[key] as? [String] { config[key] = order }
                    }
                }
                DispatchQueue.main.async {
                    self.storeOrderConfig = config
                    print("⚙️ Store order synced: \(config.keys.joined(separator: ", "))")
                }
            }
    }

    // MARK: - Orders

    /// Start listening to the current user's orders in real time
    func listenToOrders(userId: String) {
        ordersListener?.remove()
        ordersListener = nil

        ordersListener = db.collection("orders")
            .whereField("userId", isEqualTo: userId)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                if let error = error {
                    print("❌ Orders listener error: \(error.localizedDescription)")
                    return
                }
                guard let documents = snapshot?.documents else { return }
                print("🔄 Orders updated — \(documents.count) orders")

                let orders: [Order] = documents.compactMap { doc -> Order? in
                    let data = doc.data()
                    guard let userId = data["userId"] as? String,
                          let subtotal = data["subtotal"] as? Double,
                          let deliveryFee = data["deliveryFee"] as? Double,
                          let tax = data["tax"] as? Double,
                          let total = data["total"] as? Double,
                          let deliveryAddress = data["deliveryAddress"] as? String,
                          let deliveryOption = data["deliveryOption"] as? String,
                          let status = data["status"] as? String,
                          let orderNumber = data["orderNumber"] as? String
                    else { return nil }

                    let createdAt: Date
                    if let ts = data["createdAt"] as? Timestamp {
                        createdAt = ts.dateValue()
                    } else {
                        createdAt = Date()
                    }

                    let rawItems = data["items"] as? [[String: Any]] ?? []
                    let items: [OrderItem] = rawItems.compactMap { itemData -> OrderItem? in
                        guard let productTitle = itemData["productTitle"] as? String,
                              let productBrand = itemData["productBrand"] as? String,
                              let productPrice = itemData["productPrice"] as? Double,
                              let storeId = itemData["storeId"] as? String,
                              let storeName = itemData["storeName"] as? String,
                              let quantity = itemData["quantity"] as? Int
                        else { return nil }
                        return OrderItem(
                            id: itemData["id"] as? String ?? UUID().uuidString,
                            productId: itemData["productId"] as? String ?? "",
                            productTitle: productTitle,
                            productBrand: productBrand,
                            productPrice: productPrice,
                            productImageURL: itemData["productImageURL"] as? String,
                            storeId: storeId,
                            storeName: storeName,
                            quantity: quantity,
                            selectedSize: itemData["selectedSize"] as? String ?? ""
                        )
                    }

                    return Order(
                        id: doc.documentID,
                        userId: userId,
                        items: items,
                        subtotal: subtotal,
                        deliveryFee: deliveryFee,
                        tax: tax,
                        total: total,
                        deliveryAddress: deliveryAddress,
                        deliveryOption: deliveryOption,
                        status: status,
                        createdAt: createdAt,
                        orderNumber: orderNumber,
                        driverName: data["driverName"] as? String,
                        driverPhone: data["driverPhone"] as? String,
                        trackingStatus: data["trackingStatus"] as? String ?? ""
                    )
                }

                DispatchQueue.main.async {
                    self.activeOrders = orders.filter { $0.isActive }
                    self.pastOrders   = orders.filter { !$0.isActive }
                    print("✅ Orders synced — \(self.activeOrders.count) active, \(self.pastOrders.count) past")
                }
            }
    }

    /// Listen to a single order document in real time (for TrackingView).
    func listenToOrder(orderId: String) {
        trackedOrderListener?.remove()
        trackedOrder = nil

        trackedOrderListener = db.collection("orders").document(orderId)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self, let data = snapshot?.data() else { return }

                let createdAt: Date
                if let ts = data["createdAt"] as? Timestamp { createdAt = ts.dateValue() }
                else { createdAt = Date() }

                let rawItems = data["items"] as? [[String: Any]] ?? []
                let items: [OrderItem] = rawItems.compactMap { itemData in
                    guard let productTitle = itemData["productTitle"] as? String,
                          let productBrand  = itemData["productBrand"] as? String,
                          let productPrice  = itemData["productPrice"] as? Double,
                          let storeId       = itemData["storeId"] as? String,
                          let storeName     = itemData["storeName"] as? String,
                          let quantity      = itemData["quantity"] as? Int
                    else { return nil }
                    return OrderItem(
                        id: itemData["id"] as? String ?? UUID().uuidString,
                        productId: itemData["productId"] as? String ?? "",
                        productTitle: productTitle, productBrand: productBrand,
                        productPrice: productPrice,
                        productImageURL: itemData["productImageURL"] as? String,
                        storeId: storeId, storeName: storeName,
                        quantity: quantity,
                        selectedSize: itemData["selectedSize"] as? String ?? ""
                    )
                }

                let order = Order(
                    id: orderId,
                    userId: data["userId"] as? String ?? "",
                    items: items,
                    subtotal: data["subtotal"] as? Double ?? 0,
                    deliveryFee: data["deliveryFee"] as? Double ?? 0,
                    tax: data["tax"] as? Double ?? 0,
                    total: data["total"] as? Double ?? 0,
                    deliveryAddress: data["deliveryAddress"] as? String ?? "",
                    deliveryOption: data["deliveryOption"] as? String ?? "",
                    status: data["status"] as? String ?? "placed",
                    createdAt: createdAt,
                    orderNumber: data["orderNumber"] as? String ?? "",
                    driverName: data["driverName"] as? String,
                    driverPhone: data["driverPhone"] as? String,
                    trackingStatus: data["trackingStatus"] as? String ?? ""
                )
                DispatchQueue.main.async { self.trackedOrder = order }
            }
    }

    func stopTrackingOrder() {
        trackedOrderListener?.remove()
        trackedOrderListener = nil
        trackedOrder = nil
    }

    /// Write a new order to Firestore. Returns the new order's document ID via completion.
    func createOrder(
        userId: String,
        cartItems: [CartItem],
        stores: [Store],
        subtotal: Double,
        deliveryFee: Double,
        tax: Double,
        total: Double,
        deliveryAddress: String,
        deliveryOption: String,
        completion: @escaping (String?) -> Void
    ) {
        // Build a sequential order number from timestamp
        let orderNumber = "SNT-\(Int(Date().timeIntervalSince1970) % 100000)"

        let itemsData: [[String: Any]] = cartItems.map { cartItem in
            let storeName = stores.first { $0.firestoreId == cartItem.product.storeId }?.name ?? "Snatchd"
            return [
                "id": cartItem.id.uuidString,
                "productId": cartItem.product.id.uuidString,
                "productTitle": cartItem.product.title,
                "productBrand": cartItem.product.brand,
                "productPrice": cartItem.product.price,
                "productImageURL": cartItem.product.imageURL ?? "",
                "storeId": cartItem.product.storeId,
                "storeName": storeName,
                "quantity": cartItem.quantity,
                "selectedSize": ""
            ]
        }

        let orderData: [String: Any] = [
            "userId": userId,
            "items": itemsData,
            "subtotal": subtotal,
            "deliveryFee": deliveryFee,
            "tax": tax,
            "total": total,
            "deliveryAddress": deliveryAddress,
            "deliveryOption": deliveryOption,
            "status": "placed",
            "trackingStatus": "",
            "driverName": "",
            "driverPhone": "",
            "orderNumber": orderNumber,
            "createdAt": FieldValue.serverTimestamp()
        ]

        var ref: DocumentReference?
        ref = db.collection("orders").addDocument(data: orderData) { error in
            if let error = error {
                print("❌ Failed to create order: \(error.localizedDescription)")
                completion(nil)
            } else {
                print("✅ Order created: \(ref?.documentID ?? "unknown")")
                completion(ref?.documentID)
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
        justDroppedListener?.remove()
        storeOrderListener?.remove()
        ordersListener?.remove()
        storesListener = nil
        productsListener = nil
        zaraSohoListener = nil
        justDroppedListener = nil
        storeOrderListener = nil
        ordersListener = nil
        activeOrders = []
        pastOrders = []
    }
}
