import SwiftUI

struct CartView: View {
    @Binding var selectedTab: Tab
    var isPresentedModally: Bool = false
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var cartManager: CartManager
    @State private var showCheckout = false
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack {
                // Header
                HStack {
                    Button(action: {
                        if isPresentedModally {
                            presentationMode.wrappedValue.dismiss()
                        } else {
                            selectedTab = .stores
                        }
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.white)
                    }
                    Spacer()
                    Text("My Cart")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding()
                
                if cartManager.items.isEmpty {
                    Spacer()
                    VStack(spacing: 20) {
                        Image("cart")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 80, height: 80)
                            .foregroundColor(.white)
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("Your cart is empty")
                            .font(.title3)
                            .foregroundColor(.white)
                        Text("Start snatching some items!")
                            .foregroundColor(.gray)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 15) {
                            ForEach(cartManager.items) { item in
                                CartItemRow(item: item)
                            }
                        }
                        .padding()
                    }
                    
                    // Footer with Liquid Glass
                    VStack(spacing: 20) {
                        HStack {
                            Text("Apply Promo Code")
                                .foregroundColor(.white)
                            Spacer()
                            Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                        }
                        .padding(.vertical)
                        
                        Divider().background(Color.gray)
                        
                        HStack {
                            Text("Total Due")
                                .foregroundColor(.gray)
                            Image(systemName: "info.circle")
                                .foregroundColor(.gray)
                            Spacer()
                            Text("$\(Int(cartManager.total)).00")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        }
                        
                        Button(action: {
                            showCheckout = true
                        }) {
                            Text("Proceed to Checkout")
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.white.opacity(0.1))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 25)
                                        .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                )
                                .cornerRadius(25)
                        }
                    }
                    .padding()
                    .background(
                        VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                    )
                    .background(Color.black.opacity(0.8))
                    .cornerRadius(30, corners: [.topLeft, .topRight])
                }
            }
        }

        .fullScreenCover(isPresented: $showCheckout) {
            CheckoutView()
        }
        .navigationBarHidden(true)
    }
}

struct CartItemRow: View {
    let item: CartItem
    @EnvironmentObject var cartManager: CartManager
    
    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            // Product Image
            Image(item.product.imageName)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    Text(item.product.title)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .lineLimit(2)
                    Spacer()
                    Button(action: {
                        cartManager.removeFromCart(item: item)
                    }) {
                        Text("REMOVE")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.gray)
                    }
                }
                
                Text(item.product.brand)
                    .font(.subheadline)
                    .foregroundColor(.gray)
                
                HStack {
                    Text("$\(Int(item.product.price)).00")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    HStack(spacing: 15) {
                        Button(action: {
                            cartManager.updateQuantity(item: item, quantity: item.quantity - 1)
                        }) {
                            Image(systemName: "minus")
                                .foregroundColor(.gray)
                                .padding(8)
                                .background(Color.white.opacity(0.1))
                                .clipShape(Circle())
                        }
                        
                        Text("\(item.quantity)")
                            .foregroundColor(.white)
                            .fontWeight(.bold)
                        
                        Button(action: {
                            cartManager.updateQuantity(item: item, quantity: item.quantity + 1)
                        }) {
                            Image(systemName: "plus")
                                .foregroundColor(.gray)
                                .padding(8)
                                .background(Color.white.opacity(0.1))
                                .clipShape(Circle())
                        }
                    }
                }
            }
        }
        .padding()
        .background(
            ZStack {
                VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                Color.white.opacity(0.03)
            }
        )
        .cornerRadius(15)
        .overlay(
            RoundedRectangle(cornerRadius: 15)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

#Preview {
    let mockManager = CartManager()
    mockManager.addToCart(product: MockDataService.shared.trendingProducts[0])
    return CartView(selectedTab: .constant(.cart), isPresentedModally: false)
        .environmentObject(mockManager)
        .preferredColorScheme(.dark)
}
