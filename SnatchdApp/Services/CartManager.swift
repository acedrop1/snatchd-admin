import SwiftUI
import Combine

struct CartItem: Identifiable {
    let id: UUID
    let product: Product
    var quantity: Int
    var selectedSize: String

    init(id: UUID = UUID(), product: Product, quantity: Int, selectedSize: String = "") {
        self.id = id
        self.product = product
        self.quantity = quantity
        self.selectedSize = selectedSize
    }
}

// Codable representation for persistence. New fields are optional so carts
// saved by older builds still decode.
struct CartItemData: Codable {
    let id: UUID
    let productId: String?
    let storeId: String?
    let productTitle: String
    let productBrand: String
    let productPrice: Double
    let productImageName: String
    let productImageURL: String?
    let productImages: [String]?
    let productDeliveryTime: String
    let productCategory: String
    let productSizes: [String]?
    let productInStock: Bool
    let quantity: Int
    let selectedSize: String?

    init(from cartItem: CartItem) {
        self.id = cartItem.id
        self.productId = cartItem.product.id
        self.storeId = cartItem.product.storeId
        self.productTitle = cartItem.product.title
        self.productBrand = cartItem.product.brand
        self.productPrice = cartItem.product.price
        self.productImageName = cartItem.product.imageName
        self.productImageURL = cartItem.product.imageURL
        self.productImages = cartItem.product.images
        self.productDeliveryTime = cartItem.product.deliveryTime
        self.productCategory = cartItem.product.category
        self.productSizes = cartItem.product.sizes
        self.productInStock = cartItem.product.inStock
        self.quantity = cartItem.quantity
        self.selectedSize = cartItem.selectedSize
    }

    func toCartItem() -> CartItem {
        let product = Product(
            id: productId ?? UUID().uuidString,
            storeId: storeId ?? "",
            title: productTitle,
            brand: productBrand,
            price: productPrice,
            imageName: productImageName,
            imageURL: productImageURL,
            images: productImages ?? [],
            deliveryTime: productDeliveryTime,
            category: productCategory,
            sizes: productSizes ?? [],
            inStock: productInStock
        )
        return CartItem(id: id, product: product, quantity: quantity, selectedSize: selectedSize ?? "")
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

    /// Same product in a different size is a separate line — the Snatcher buys each one.
    func addToCart(product: Product, size: String = "") {
        if let index = items.firstIndex(where: { $0.product.id == product.id && $0.selectedSize == size }) {
            items[index].quantity += 1
        } else {
            items.append(CartItem(product: product, quantity: 1, selectedSize: size))
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
