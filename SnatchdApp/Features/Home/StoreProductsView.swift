import SwiftUI

struct StoreProductsView: View {
    let store: Store
    var initialProduct: Product? = nil
    @Binding var showTabBar: Bool
    @Binding var selectedTab: Tab
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var cartManager: CartManager
    @ObservedObject private var databaseService = DatabaseService.shared

    @State private var selectedGender = "All"
    @State private var selectedCategory = "All"
    @State private var selectedProduct: Product?
    @State private var cartScale: CGFloat = 1.0
    @State private var showFilters = false

    // Search
    @State private var isSearching = false
    @State private var searchQuery = ""

    // Filter sheet state
    @State private var filterGender = "All"
    @State private var filterSortBy = "New"
    @State private var filterMinPrice: Double = 0
    @State private var filterMaxPrice: Double = 2000

    // Applied filters (committed when user taps Apply)
    @State private var appliedGender = "All"
    @State private var appliedSortBy = "New"
    @State private var appliedMinPrice: Double = 0
    @State private var appliedMaxPrice: Double = 2000

    // Dynamically build category tabs — scoped to the selected gender
    var categories: [String] {
        let storeProducts = databaseService.products.filter {
            $0.storeId == store.firestoreId && genderMatch(product: $0, gender: appliedGender)
        }
        let unique = Array(Set(storeProducts.map { $0.category })).filter { !$0.isEmpty }
        let preferredOrder = [
            "Dresses", "Tops", "Skirts", "Jackets", "Pants", "Shorts", "Swimwear",
            "Bras & Bodysuits", "Underwear", "Shapewear", "Loungewear", "Activewear", "Maternity", "Men's",
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

    func genderMatch(product: Product, gender: String) -> Bool {
        if gender == "All" { return true }
        if product.gender == "Unisex" || product.gender.isEmpty { return true }
        return product.gender == gender
    }

    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var filteredProducts: [Product] {
        var results = databaseService.products.filter { product in
            let storeMatch = product.storeId == store.firestoreId
            let categoryMatch = selectedCategory == "All" || product.category == selectedCategory
            let genderMatch = genderMatch(product: product, gender: appliedGender)
            let priceMatch = product.price >= appliedMinPrice && product.price <= appliedMaxPrice
            let searchMatch = searchQuery.isEmpty ||
                product.title.localizedCaseInsensitiveContains(searchQuery) ||
                product.brand.localizedCaseInsensitiveContains(searchQuery) ||
                product.category.localizedCaseInsensitiveContains(searchQuery)
            return storeMatch && categoryMatch && genderMatch && priceMatch && searchMatch
        }
        switch appliedSortBy {
        case "Low to High":
            results.sort { $0.price < $1.price }
        case "High to Low":
            results.sort { $0.price > $1.price }
        default:
            break // "New" — keep original order
        }
        return results
    }

    // Whether any non-default filter is active
    var filtersActive: Bool {
        appliedGender != "All" || appliedSortBy != "New" || appliedMinPrice > 0 || appliedMaxPrice < 2000
    }

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 0) {
                    // Header Image & Info Overlay
                    ZStack(alignment: .bottom) {
                        GeometryReader { geometry in
                            Group {
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

                    // ── Filter Bar ──────────────────────────────────────────────
                    VStack(spacing: 0) {
                        if isSearching {
                            // Search mode: full-width text field
                            HStack(spacing: 10) {
                                Image("search")
                                    .resizable()
                                    .renderingMode(.template)
                                    .foregroundColor(.white.opacity(0.6))
                                    .frame(width: 14, height: 14)

                                TextField("", text: $searchQuery)
                                    .font(.custom("Montserrat-Regular", size: 13))
                                    .foregroundColor(.white)
                                    .placeholder(when: searchQuery.isEmpty) {
                                        Text("Search \(store.name)...")
                                            .font(.custom("Montserrat-Regular", size: 13))
                                            .foregroundColor(.white.opacity(0.35))
                                    }
                                    .autocorrectionDisabled()
                                    .frame(maxWidth: .infinity)

                                Button(action: {
                                    searchQuery = ""
                                    isSearching = false
                                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                }) {
                                    Text("Cancel")
                                        .font(.custom("Montserrat-Regular", size: 12))
                                        .foregroundColor(.white.opacity(0.5))
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)

                        } else {
                            // Normal mode: categories + search icon + filters
                            HStack(alignment: .center, spacing: 0) {
                                // Horizontal scrolling category text tabs
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 20) {
                                        ForEach(categories, id: \.self) { category in
                                            Button(action: {
                                                selectedCategory = category
                                            }) {
                                                Text(category.uppercased())
                                                    .font(selectedCategory == category
                                                          ? .custom("Montserrat-Bold", size: 12)
                                                          : .custom("Montserrat-Regular", size: 12))
                                                    .foregroundColor(selectedCategory == category ? .white : .white.opacity(0.45))
                                                    .fixedSize()
                                            }
                                        }
                                    }
                                    .padding(.leading, 16)
                                    .padding(.trailing, 8)
                                }

                                // Divider
                                Rectangle()
                                    .fill(Color.white.opacity(0.2))
                                    .frame(width: 1, height: 18)

                                // Search icon button
                                Button(action: {
                                    isSearching = true
                                }) {
                                    Image("search")
                                        .resizable()
                                        .renderingMode(.template)
                                        .foregroundColor(.white.opacity(0.65))
                                        .frame(width: 15, height: 15)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 12)
                                }

                                // Divider
                                Rectangle()
                                    .fill(Color.white.opacity(0.2))
                                    .frame(width: 1, height: 18)

                                // Filters text button
                                Button(action: {
                                    filterGender = appliedGender
                                    filterSortBy = appliedSortBy
                                    filterMinPrice = appliedMinPrice
                                    filterMaxPrice = appliedMaxPrice
                                    showFilters = true
                                }) {
                                    HStack(spacing: 4) {
                                        Text("FILTERS")
                                            .font(.custom("Montserrat-SemiBold", size: 11))
                                            .foregroundColor(filtersActive ? .white : .white.opacity(0.65))
                                        if filtersActive {
                                            Circle()
                                                .fill(Color.white)
                                                .frame(width: 5, height: 5)
                                        }
                                    }
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 12)
                                }
                            }
                        }
                    }
                    .background(Color.black)

                    // Thin separator line
                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 0.5)
                        .padding(.bottom, 14)

                    // Products Grid
                    LazyVGrid(columns: columns, spacing: 15) {
                        ForEach(filteredProducts) { product in
                            VStack(alignment: .leading, spacing: 8) {
                                // Image Container
                                ZStack(alignment: .bottomTrailing) {
                                    Rectangle()
                                        .fill(Color.white.opacity(0.05))
                                        .aspectRatio(0.8, contentMode: .fit)
                                        .overlay(
                                            Group {
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
                                            selectedProduct = product
                                        }
                                }

                                // Info
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
                                    selectedProduct = product
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

            // Back Button (Top Left)
            Button(action: {
                presentationMode.wrappedValue.dismiss()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular, in: Circle())
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 20)
            .padding(.leading, 16)

            // Cart Button (Top Right)
            Button(action: {
                presentationMode.wrappedValue.dismiss()
                selectedTab = .cart
                showTabBar = true
            }) {
                ZStack(alignment: .topTrailing) {
                    Image("cart")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 22, height: 22)
                        .frame(width: 44, height: 44)
                        .glassEffect(.regular, in: Circle())

                    if cartManager.items.reduce(0, { $0 + $1.quantity }) > 0 {
                        Text("\(cartManager.items.reduce(0) { $0 + $1.quantity })")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.black)
                            .frame(width: 16, height: 16)
                            .background(Color.white)
                            .clipShape(Circle())
                            .offset(x: 3, y: -3)
                            .scaleEffect(cartScale)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.top, 20)
            .padding(.trailing, 16)
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
        .onAppear {
            if let product = initialProduct {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    selectedProduct = product
                }
            }
        }
        .sheet(isPresented: $showFilters) {
            FiltersSheet(
                selectedGender: $filterGender,
                selectedSortBy: $filterSortBy,
                minPrice: $filterMinPrice,
                maxPrice: $filterMaxPrice,
                onApply: {
                    appliedGender = filterGender
                    appliedSortBy = filterSortBy
                    appliedMinPrice = filterMinPrice
                    appliedMaxPrice = filterMaxPrice
                    // Reset category if gender changes
                    selectedCategory = "All"
                    showFilters = false
                },
                onClear: {
                    filterGender = "All"
                    filterSortBy = "New"
                    filterMinPrice = 0
                    filterMaxPrice = 2000
                    appliedGender = "All"
                    appliedSortBy = "New"
                    appliedMinPrice = 0
                    appliedMaxPrice = 2000
                    selectedCategory = "All"
                    showFilters = false
                }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            .presentationBackground(.black)
        }
    }
}

// MARK: - Filters Sheet

struct FiltersSheet: View {
    @Binding var selectedGender: String
    @Binding var selectedSortBy: String
    @Binding var minPrice: Double
    @Binding var maxPrice: Double
    let onApply: () -> Void
    let onClear: () -> Void

    let sortOptions = ["New", "Low to High", "High to Low"]
    let genderOptions = ["All", "Men", "Women"]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Handle + header
            HStack {
                Text("FILTERS")
                    .font(.custom("Montserrat-Bold", size: 16))
                    .foregroundColor(.white)
                    .kerning(1.5)
                Spacer()
                Button(action: onClear) {
                    Text("Clear all")
                        .font(.custom("Montserrat-Regular", size: 13))
                        .foregroundColor(.white.opacity(0.5))
                        .underline()
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 24)

            Divider().background(Color.white.opacity(0.1))

            ScrollView {
                VStack(alignment: .leading, spacing: 32) {

                    // SORT BY
                    FilterSection(title: "SORT BY") {
                        VStack(spacing: 0) {
                            ForEach(sortOptions, id: \.self) { option in
                                Button(action: { selectedSortBy = option }) {
                                    HStack {
                                        Text(option)
                                            .font(selectedSortBy == option
                                                  ? .custom("Montserrat-SemiBold", size: 14)
                                                  : .custom("Montserrat-Regular", size: 14))
                                            .foregroundColor(selectedSortBy == option ? .white : .white.opacity(0.5))
                                        Spacer()
                                        if selectedSortBy == option {
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundColor(.white)
                                        }
                                    }
                                    .padding(.vertical, 14)
                                }
                                if option != sortOptions.last {
                                    Divider().background(Color.white.opacity(0.06))
                                }
                            }
                        }
                    }

                    Divider().background(Color.white.opacity(0.1))

                    // GENDER
                    FilterSection(title: "GENDER") {
                        HStack(spacing: 10) {
                            ForEach(genderOptions, id: \.self) { option in
                                Button(action: { selectedGender = option }) {
                                    Text(option)
                                        .font(selectedGender == option
                                              ? .custom("Montserrat-SemiBold", size: 13)
                                              : .custom("Montserrat-Regular", size: 13))
                                        .foregroundColor(selectedGender == option ? .black : .white.opacity(0.7))
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 10)
                                        .background(selectedGender == option ? Color.white : Color.white.opacity(0.08))
                                        .cornerRadius(4)
                                }
                            }
                        }
                    }

                    Divider().background(Color.white.opacity(0.1))

                    // PRICE
                    FilterSection(title: "PRICE") {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("$\(Int(minPrice))")
                                    .font(.custom("Montserrat-Regular", size: 13))
                                    .foregroundColor(.white.opacity(0.6))
                                Spacer()
                                Text("$\(Int(maxPrice))\(maxPrice >= 2000 ? "+" : "")")
                                    .font(.custom("Montserrat-Regular", size: 13))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                            // Min price slider
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Min")
                                    .font(.custom("Montserrat-Regular", size: 11))
                                    .foregroundColor(.white.opacity(0.35))
                                Slider(value: $minPrice, in: 0...maxPrice, step: 10)
                                    .accentColor(.white)
                            }
                            // Max price slider
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Max")
                                    .font(.custom("Montserrat-Regular", size: 11))
                                    .foregroundColor(.white.opacity(0.35))
                                Slider(value: $maxPrice, in: minPrice...2000, step: 10)
                                    .accentColor(.white)
                            }
                        }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 24)
                .padding(.bottom, 40)
            }

            // Apply Button
            Button(action: onApply) {
                Text("APPLY")
                    .font(.custom("Montserrat-Bold", size: 14))
                    .kerning(1.5)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.white)
                    .cornerRadius(4)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 36)
        }
    }
}

// MARK: - Filter Section Helper

struct FilterSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.custom("Montserrat-Bold", size: 11))
                .foregroundColor(.white.opacity(0.4))
                .kerning(1.5)
            content
        }
    }
}

// MARK: - Placeholder helper

extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: .leading) {
            if shouldShow { placeholder() }
            self
        }
    }
}

#Preview {
    StoreProductsView(store: Store(firestoreId: "", name: "Louis Vuitton", category: "Luxury", imageName: "bag.fill", imageURL: nil, address: nil, latitude: nil, longitude: nil, deliveryRadius: nil, deliveryTime: "35 min"), showTabBar: .constant(true), selectedTab: .constant(.stores))
}
