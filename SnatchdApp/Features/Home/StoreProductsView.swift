import SwiftUI

struct StoreProductsView: View {
    let store: Store
    var initialProduct: Product? = nil
    @Binding var showTabBar: Bool
    @Binding var selectedTab: Tab
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var cartManager: CartManager
    @ObservedObject private var databaseService = DatabaseService.shared // Use shared instance

    @State private var selectedGender = "All"
    @State private var selectedCategory = "All"
    @State private var searchText = ""
    @State private var selectedProduct: Product? // For programmatic navigation
    @State private var cartScale: CGFloat = 1.0 // Animation state
    @Namespace private var genderNamespace
    @Namespace private var categoryNamespace

    // Always show Men / Women tabs when the store has products
    var genders: [String] {
        let hasProducts = databaseService.products.contains { $0.storeId == store.firestoreId }
        return hasProducts ? ["All", "Men", "Women"] : []
    }

    // Dynamically build category tabs — scoped to the selected gender
    // "Clothing" always appears first, then Bags, Shoes, Accessories, then rest alphabetically
    var categories: [String] {
        let storeProducts = databaseService.products.filter {
            $0.storeId == store.firestoreId && genderMatch(product: $0)
        }
        let unique = Array(Set(storeProducts.map { $0.category })).filter { !$0.isEmpty }
        // Brand-native categories ordered logically, generic fallbacks at end
        let preferredOrder = [
            // Jacquemus
            "Dresses", "Tops", "Skirts", "Jackets", "Pants", "Shorts", "Swimwear",
            // Skims
            "Bras & Bodysuits", "Underwear", "Shapewear", "Loungewear", "Activewear", "Maternity", "Men's",
            // Generic fallback
            "Clothing", "Bags", "Shoes", "Accessories"
        ]
        let sorted = unique.sorted { a, b in
            let ai = preferredOrder.firstIndex(of: a) ?? Int.max
            let bi = preferredOrder.firstIndex(of: b) ?? Int.max
            if ai != bi { return ai < bi }
            return a < b
        }
        return ["All"] + sorted
    }

    // Unisex products appear under both Men and Women tabs
    func genderMatch(product: Product) -> Bool {
        if selectedGender == "All" { return true }
        if product.gender == "Unisex" || product.gender.isEmpty { return true }
        return product.gender == selectedGender
    }

    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]
    
    var filteredProducts: [Product] {
        return databaseService.products.filter { product in
            let storeMatch = product.storeId == store.firestoreId
            // When searching, ignore the active category so results span all categories
            let categoryMatch = !searchText.isEmpty || selectedCategory == "All" || product.category == selectedCategory
            let searchMatch = searchText.isEmpty || product.title.localizedCaseInsensitiveContains(searchText) || product.brand.localizedCaseInsensitiveContains(searchText) || product.category.localizedCaseInsensitiveContains(searchText)
            return storeMatch && genderMatch(product: product) && categoryMatch && searchMatch
        }
    }
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.edgesIgnoringSafeArea(.all)
            
            ScrollView {
                VStack(spacing: 0) {
                    // Header Image & Info Overlay
                    ZStack(alignment: .bottom) {
                        GeometryReader { geometry in
                            Group {
                                // Remote or Local Image
                                if store.isRemoteImage, let urlString = store.imageURL, let url = URL(string: urlString) {
                                    CachedAsyncImage(url: url) { image in
                                        image.resizable()
                                    } placeholder: {
                                        ProgressView()
                                    }
                                } else if store.isSystemImage {
                                    Image(systemName: store.imageName)
                                        .resizable()
                                } else {
                                    Image(store.imageName)
                                        .resizable()
                                }
                            }
                            .aspectRatio(contentMode: .fill)
                            .frame(width: geometry.size.width, height: 300)
                            .clipped()
                            .overlay(
                                LinearGradient(gradient: Gradient(colors: [.clear, .black.opacity(0.8)]), startPoint: .center, endPoint: .bottom)
                            )
                        }
                        .frame(height: 300)
                        
                        // Store Info Overlay
                        VStack(alignment: .center, spacing: 5) {
                            Text(store.name)
                                .font(.custom("Montserrat-Bold", size: 24))
                                .foregroundColor(.white)
                                .shadow(radius: 5)

                            if let address = store.address, !address.isEmpty {
                                Text(address)
                                    .font(.custom("Montserrat-Regular", size: 12))
                                    .foregroundColor(.white.opacity(0.8))
                                    .shadow(radius: 5)
                            }

                            HStack(spacing: 10) {
                                HStack(spacing: 4) {
                                    Image(systemName: "bolt.fill")
                                        .font(.caption2)
                                        .foregroundColor(.cyan)
                                    Text("Snatchd in \(store.deliveryTime)")
                                        .font(.custom("Montserrat-SemiBold", size: 10))
                                        .foregroundColor(.white)
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark))
                                .cornerRadius(15)
                                .overlay(RoundedRectangle(cornerRadius: 15).stroke(Color.white.opacity(0.2), lineWidth: 0.5))
                                
                                HStack(spacing: 4) {
                                    Image(systemName: "clock")
                                        .font(.caption2)
                                        .foregroundColor(.green)
                                    Text("Open until 9 PM")
                                        .font(.custom("Montserrat-SemiBold", size: 10))
                                        .foregroundColor(.white)
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark))
                                .cornerRadius(15)
                                .overlay(RoundedRectangle(cornerRadius: 15).stroke(Color.white.opacity(0.2), lineWidth: 0.5))
                            }
                            .padding(.top, 5)
                        }
                        .padding(.bottom, 20)
                    }
                    .frame(height: 300)
                    
                    // Gender Filter — compact liquid glass pill, centered
                    if !genders.isEmpty {
                        HStack(spacing: 2) {
                            ForEach(genders, id: \.self) { gender in
                                Button(action: {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        selectedGender = gender
                                        selectedCategory = "All"
                                    }
                                }) {
                                    Text(gender)
                                        .font(.custom("Montserrat-SemiBold", size: 12))
                                        .foregroundColor(selectedGender == gender ? .white : .white.opacity(0.5))
                                        .padding(.vertical, 6)
                                        .padding(.horizontal, 16)
                                        .background(
                                            ZStack {
                                                if selectedGender == gender {
                                                    LiquidGlassBubble()
                                                        .matchedGeometryEffect(id: "genderBubble", in: genderNamespace)
                                                }
                                            }
                                        )
                                }
                            }
                        }
                        .liquidGlassBackground()
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, 10)
                    }

                    // Category Filter Bar
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(categories, id: \.self) { category in
                                Button(action: {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        selectedCategory = category
                                    }
                                }) {
                                    Text(category)
                                        .font(.custom("Montserrat-Medium", size: 13))
                                        .foregroundColor(selectedCategory == category ? .white : .white.opacity(0.6))
                                        .padding(.vertical, 6)
                                        .padding(.horizontal, 20)
                                        .background(
                                            ZStack {
                                                if selectedCategory == category {
                                                    LiquidGlassBubble()
                                                        .matchedGeometryEffect(id: "bubble", in: categoryNamespace)
                                                }
                                            }
                                        )
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    .liquidGlassBackground()
                    .padding(.horizontal)
                    .padding(.bottom, 10)
                    
                    // Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search store", text: $searchText)
                            .font(.custom("Montserrat-Regular", size: 14))
                            .foregroundColor(.white)
                            .accentColor(.white)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(.vertical, 16)
                    .padding(.horizontal, 12)
                    .background(
                        ZStack {
                            VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                            RoundedRectangle(cornerRadius: 20)
                                .strokeBorder(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.white.opacity(0.5),
                                            Color.white.opacity(0.2),
                                            Color.white.opacity(0.1),
                                            Color.white.opacity(0.3)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 1.5
                                )
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                    )
                    .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)
                    .padding(.horizontal)
                    .padding(.bottom, 10)
                    
                    // Products Grid
                    LazyVGrid(columns: columns, spacing: 15) {
                        ForEach(filteredProducts) { product in
                            VStack(alignment: .leading, spacing: 8) {
                                // Image Container
                                ZStack(alignment: .bottomTrailing) {
                                    // Product Image (Tap to Navigate)
                                    Rectangle()
                                        .fill(Color.white.opacity(0.05)) // Subtle card background
                                        .aspectRatio(0.8, contentMode: .fit)
                                        .overlay(
                                            Group {
                                                // Remote or Local Image
                                                if product.isRemoteImage, let urlString = product.imageURL, let url = URL(string: urlString) {
                                                    CachedAsyncImage(url: url) { image in
                                                        image
                                                            .resizable()
                                                            .aspectRatio(contentMode: .fill)
                                                            .clipped()
                                                    } placeholder: {
                                                        ProgressView()
                                                    }
                                                } else if product.imageName.contains(".fill") || product.imageName == "tshirt" || product.imageName == "bag" {
                                                    Image(systemName: product.imageName)
                                                        .resizable()
                                                        .aspectRatio(contentMode: .fit)
                                                        .padding(20)
                                                        .foregroundColor(.white.opacity(0.8))
                                                } else {
                                                    Image(product.imageName)
                                                        .resizable()
                                                        .aspectRatio(contentMode: .fill)
                                                        .clipped()
                                                }
                                            }
                                        )
                                        .overlay(
                                            // Sold Out Overlay
                                            Group {
                                                if !product.inStock {
                                                    ZStack {
                                                        Color.black.opacity(0.6)
                                                        Text("SOLD OUT")
                                                            .font(.custom("Montserrat-Bold", size: 10))
                                                            .foregroundColor(.white)
                                                            .padding(.horizontal, 8)
                                                            .padding(.vertical, 4)
                                                            .background(Color.red.opacity(0.8))
                                                            .cornerRadius(4)
                                                    }
                                                }
                                            }
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                        .contentShape(Rectangle())
                                        .onTapGesture {
                                            print("DEBUG: Tapped product image: \(product.title)")
                                            selectedProduct = product
                                        }
                                    
                                }
                                
                                // Info (Tap to Navigate)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(product.brand)
                                        .font(.custom("Montserrat-Regular", size: 10))
                                        .foregroundColor(.gray)
                                    
                                    Text(product.title)
                                        .font(.custom("Montserrat-Bold", size: 12))
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                    
                                    Text("$\(Int(product.price)).00")
                                        .font(.custom("Montserrat-SemiBold", size: 10))
                                        .foregroundColor(.white.opacity(0.7))
                                        .padding(.top, 2)
                                }
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    print("DEBUG: Tapped product: \(product.title)")
                                    selectedProduct = product
                                    print("DEBUG: selectedProduct set to: \(String(describing: selectedProduct?.title))")
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 100)
                }
            }
            .edgesIgnoringSafeArea(.top)
            .fullScreenCover(item: $selectedProduct) { product in
                ProductDetailView(product: product, showTabBar: $showTabBar, selectedTab: $selectedTab)
            }
            
            // Back Button (Top Left) - Fixed
            Button(action: {
                presentationMode.wrappedValue.dismiss()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(12)
                    .background(Circle().fill(Color.black.opacity(0.5)))
            }
            .padding(.top, 54)
            .padding(.leading, 16)

            // Cart Button (Top Right) - Fixed, same line as back button
            Button(action: {
                presentationMode.wrappedValue.dismiss()
                selectedTab = .cart
                showTabBar = true
            }) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bag")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(Circle().fill(Color.black.opacity(0.5)))

                    if cartManager.items.reduce(0, { $0 + $1.quantity }) > 0 {
                        Text("\(cartManager.items.reduce(0) { $0 + $1.quantity })")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 15, height: 15)
                            .background(Color.white.opacity(0.9))
                            .foregroundColor(.black)
                            .clipShape(Circle())
                            .offset(x: 2, y: -2)
                            .scaleEffect(cartScale)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.top, 54)
            .padding(.trailing, 16)
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
        .onAppear {
            if let product = initialProduct {
                // Small delay so the view is fully rendered before presenting the cover
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    selectedProduct = product
                }
            }
        }
    }
}

#Preview {
    StoreProductsView(store: Store(firestoreId: "", name: "Louis Vuitton", category: "Luxury", imageName: "bag.fill", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "35 min"), showTabBar: .constant(true), selectedTab: .constant(.stores))
}
