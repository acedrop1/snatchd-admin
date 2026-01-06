import SwiftUI
import Combine

struct CartItem: Identifiable {
    let id: UUID
    let product: Product
    var quantity: Int
    
    init(id: UUID = UUID(), product: Product, quantity: Int) {
        self.id = id
        self.product = product
        self.quantity = quantity
    }
}

// Codable representation for persistence
struct CartItemData: Codable {
    let id: UUID
    let productTitle: String
    let productBrand: String
    let productPrice: Double
    let productImageName: String
    let productImageURL: String?
    let productDeliveryTime: String
    let productCategory: String
    let productInStock: Bool
    let productZaraProductId: String?
    let quantity: Int
    
    init(from cartItem: CartItem) {
        self.id = cartItem.id
        self.productTitle = cartItem.product.title
        self.productBrand = cartItem.product.brand
        self.productPrice = cartItem.product.price
        self.productImageName = cartItem.product.imageName
        self.productImageURL = cartItem.product.imageURL
        self.productDeliveryTime = cartItem.product.deliveryTime
        self.productCategory = cartItem.product.category
        self.productInStock = cartItem.product.inStock
        self.productZaraProductId = cartItem.product.zaraProductId
        self.quantity = cartItem.quantity
    }
    
    func toCartItem() -> CartItem {
        let product = Product(
            id: UUID(), // New UUID for restored product (matching happens by properties)
            title: productTitle,
            brand: productBrand,
            price: productPrice,
            imageName: productImageName,
            imageURL: productImageURL,
            deliveryTime: productDeliveryTime,
            category: productCategory,
            inStock: productInStock,
            zaraProductId: productZaraProductId
        )
        return CartItem(id: id, product: product, quantity: quantity)
    }
}

class CartManager: ObservableObject {
    @Published var items: [CartItem] = [] {
        didSet {
            saveCart()
        }
    }
    
    private let cartKey = AppConfig.cartPersistenceKey
    
    var total: Double {
        items.reduce(0) { $0 + ($1.product.price * Double($1.quantity)) }
    }
    
    init() {
        loadCart()
    }
    
    func addToCart(product: Product) {
        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            items[index].quantity += 1
        } else {
            items.append(CartItem(product: product, quantity: 1))
        }
    }
    
    func removeFromCart(item: CartItem) {
        items.removeAll { $0.id == item.id }
    }
    
    func updateQuantity(item: CartItem, quantity: Int) {
        if let index = items.firstIndex(where: { $0.id == item.id }) {
            if quantity > 0 {
                items[index].quantity = quantity
            } else {
                removeFromCart(item: item)
            }
        }
    }
    
    func clearCart() {
        items.removeAll()
    }
    
    // MARK: - Persistence
    
    private func saveCart() {
        let cartData = items.map { CartItemData(from: $0) }
        if let encoded = try? JSONEncoder().encode(cartData) {
            UserDefaults.standard.set(encoded, forKey: cartKey)
        }
    }
    
    private func loadCart() {
        guard let data = UserDefaults.standard.data(forKey: cartKey),
              let decoded = try? JSONDecoder().decode([CartItemData].self, from: data) else {
            return
        }
        items = decoded.map { $0.toCartItem() }
    }
}
