import SwiftUI

extension Notification.Name { static let searchInStore = Notification.Name("searchInStore") }
/// True while a store page is on screen, so the tab bar's search button searches that store.
enum StoreScreen { static var isOpen = false }

struct StoreProductsView: View {
    let store: Store
    var initialProduct: Product? = nil
    @Binding var showTabBar: Bool
    @Binding var selectedTab: AppTab
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var cartManager: CartManager
    @ObservedObject private var databaseService = DatabaseService.shared

    @Namespace private var genderGlass
    @State private var selectedGender = "All"
    @State private var selectedCategory = "All"
    @State private var selectedProduct: Product?
    @State private var showProductDetail = false
    @State private var cartScale: CGFloat = 1.0
    @State private var showFilters = false

    // Search (opened from the tab bar's search button)
    @State private var isSearching = false
    @State private var searchQuery = ""
    @FocusState private var searchFocused: Bool

    // Filter sheet state
    @State private var filterGender = "All"
    @State private var filterSortBy = "Featured"
    @State private var filterMinPrice: Double = 0
    @State private var filterMaxPrice: Double = 2000

    // Applied filters (committed when user taps Apply)
    // Gender is remembered across stores: pick Men once and every store opens on Men.
    @AppStorage("preferredGender") private var appliedGender = "Women"
    @State private var appliedSortBy = "Featured"
    @State private var appliedMinPrice: Double = 0
    @State private var appliedMaxPrice: Double = 2000

    /// The store's own section when it gives one (Skims: its DoorDash menu), else the brand's product type.
    func shelf(_ p: Product) -> String {
        guard let s = p.storeCategory, !s.isEmpty else { return p.category.capitalized }
        // The Women | Men bar already says whose it is
        for prefix in ["Women's ", "Men's "] where s.hasPrefix(prefix) { return String(s.dropFirst(prefix.count)) }
        return s
    }

    /// Sections for the selected gender, in the store's own order (A–Z when it gives none).
    var categories: [String] {
        var first: [String: Int] = [:]
        for p in databaseService.products where p.storeId == store.firestoreId && genderMatch(product: p, gender: appliedGender) {
            let s = shelf(p)
            if !s.isEmpty { first[s] = min(first[s] ?? .max, p.storeRank ?? .max) }
        }
        return ["All"] + first.keys.sorted { (first[$0]!, $0) < (first[$1]!, $1) }
    }

    /// Genders this store actually carries, in display order. The switch only
    /// appears when there are at least two — Skims never shows it, Zara always does.
    var storeGenders: [String] {
        let present = Set(databaseService.products.filter { $0.storeId == store.firestoreId }.map { $0.gender })
        return ["Women", "Men", "Kids"].filter { present.contains($0) }
    }

    func genderMatch(product: Product, gender: String) -> Bool {
        if gender == "All" { return true }
        // Single-gender store: the remembered choice doesn't apply here
        if storeGenders.count < 2 { return true }
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
            let categoryMatch = selectedCategory == "All" || shelf(product) == selectedCategory
            let genderMatch = genderMatch(product: product, gender: appliedGender)
            let priceMatch = product.price >= appliedMinPrice && product.price <= appliedMaxPrice
            let searchMatch = searchQuery.isEmpty ||
                product.title.localizedCaseInsensitiveContains(searchQuery) ||
                product.brand.localizedCaseInsensitiveContains(searchQuery) ||
                shelf(product).localizedCaseInsensitiveContains(searchQuery)
            return storeMatch && categoryMatch && genderMatch && priceMatch && searchMatch
        }
        switch appliedSortBy {
        case "Low to High":
            results.sort { $0.price < $1.price }
        case "High to Low":
            results.sort { $0.price > $1.price }
        default:
            // Featured: the store's own order (stable, so ties keep their place)
            results = results.enumerated()
                .sorted { ($0.element.storeRank ?? .max, $0.offset) < ($1.element.storeRank ?? .max, $1.offset) }
                .map(\.element)
        }
        return results
    }

    // Whether any non-default filter is active
    var filtersActive: Bool {
        appliedSortBy != "Featured" || appliedMinPrice > 0 || appliedMaxPrice < 2000
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
                                .glassEffect(in: .capsule)

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
                                .glassEffect(in: .capsule)
                            }
                            .padding(.top, 5)
                        }
                        .padding(.bottom, 20)
                    }
                    .frame(height: 300)

                    // ── Women | Men, then the store's sections as glass pills ──
                    VStack(spacing: 12) {
                        // Only when the store has both. One glass bar, like the native
                        // tab bar: a clear lens slides to the selection.
                        if storeGenders.count >= 2 {
                            GlassEffectContainer {
                                HStack(spacing: 0) {
                                    ForEach(storeGenders, id: \.self) { g in
                                        let on = appliedGender == g
                                        Button {
                                            withAnimation(.snappy(duration: 0.28)) { appliedGender = g; selectedCategory = "All" }
                                        } label: {
                                            Text(g.uppercased())
                                                .font(.custom(on ? "Montserrat-Bold" : "Montserrat-SemiBold", size: 12))
                                                .foregroundStyle(on ? .white : .white.opacity(0.6))
                                                .padding(.horizontal, 22)
                                                .padding(.vertical, 10)
                                                .background {
                                                    if on {
                                                        Color.clear
                                                            .glassEffect(.regular.tint(.white.opacity(0.22)), in: .capsule)
                                                            .matchedGeometryEffect(id: "gender-highlight", in: genderGlass)
                                                    }
                                                }
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(4)
                                .glassEffect(.regular.interactive(), in: .capsule)
                            }
                            .frame(maxWidth: .infinity)
                        }

                        HStack(spacing: 8) {
                            ScrollView(.horizontal, showsIndicators: false) {
                                GlassEffectContainer(spacing: 8) {
                                    HStack(spacing: 8) {
                                        ForEach(categories, id: \.self) { category in
                                            let on = selectedCategory == category
                                            Button {
                                                withAnimation(.snappy(duration: 0.25)) { selectedCategory = category }
                                            } label: {
                                                Text(category.uppercased())
                                                    .font(.custom(on ? "Montserrat-Bold" : "Montserrat-SemiBold", size: 11))
                                                    .foregroundStyle(on ? .white : .white.opacity(0.65))
                                                    .fixedSize()
                                                    .padding(.horizontal, 16)
                                                    .padding(.vertical, 10)
                                                    .glassEffect(on ? .regular.tint(.white.opacity(0.22)).interactive() : .regular.interactive(), in: .capsule)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                    .padding(.vertical, 4)
                                    .padding(.leading, 16)
                                }
                            }

                            // Filters: sort and price
                            Button {
                                filterGender = appliedGender
                                filterSortBy = appliedSortBy
                                filterMinPrice = appliedMinPrice
                                filterMaxPrice = appliedMaxPrice
                                showFilters = true
                            } label: {
                                Image(systemName: "line.3.horizontal.decrease")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .frame(width: 38, height: 38)
                                    .glassEffect(filtersActive ? .regular.tint(.white.opacity(0.22)).interactive() : .regular.interactive(), in: .circle)
                                    .overlay(alignment: .topTrailing) {
                                        if filtersActive { Circle().fill(.white).frame(width: 7, height: 7).offset(x: -2, y: 2) }
                                    }
                            }
                            .buttonStyle(.plain)
                            .padding(.trailing, 16)
                        }
                    }
                    .padding(.top, 14)
                    .padding(.bottom, 16)

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
                                            showProductDetail = true
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
                                    showProductDetail = true
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 100)
                }
            }
            .edgesIgnoringSafeArea(.top)

            // Back Button (Top Left)
            Button(action: {
                presentationMode.wrappedValue.dismiss()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
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
                        .glassEffect(.regular.interactive(), in: .circle)

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
        // In-store search: the tab bar's search button opens this field instead of the app-wide search
        .safeAreaInset(edge: .bottom) {
            if isSearching {
                HStack(spacing: 10) {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.7))
                        TextField("Search \(store.name)", text: $searchQuery)
                            .font(.custom("Montserrat-Regular", size: 14))
                            .foregroundStyle(.white)
                            .focused($searchFocused)
                            .submitLabel(.search)
                            .autocorrectionDisabled()
                        if !searchQuery.isEmpty {
                            Button { searchQuery = "" } label: {
                                Image(systemName: "xmark.circle.fill").foregroundStyle(.white.opacity(0.5))
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .frame(height: 48)
                    .glassEffect(.regular.interactive(), in: .capsule)

                    Button {
                        withAnimation(.snappy) { searchQuery = ""; isSearching = false; searchFocused = false }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 48, height: 48)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .searchInStore)) { _ in
            withAnimation(.snappy) { isSearching = true }
            searchFocused = true
        }
        .onAppear { StoreScreen.isOpen = true }
        .onDisappear { StoreScreen.isOpen = false }
        .navigationBarHidden(true)
        .enableSwipeBack()
        // navigationDestination is lazy — ProductDetailView is only created when showProductDetail = true
        .navigationDestination(isPresented: $showProductDetail) {
            if let product = selectedProduct {
                ProductDetailView(
                    product: product,
                    showTabBar: $showTabBar,
                    selectedTab: $selectedTab,
                    onDismiss: {}
                )
            }
        }
        .onAppear {
            if let product = initialProduct {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    selectedProduct = product
                    showProductDetail = true
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
                    filterSortBy = "Featured"
                    filterMinPrice = 0
                    filterMaxPrice = 2000
                    appliedSortBy = "Featured"
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

    let sortOptions = ["Featured", "Low to High", "High to Low"]
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
