import SwiftUI

/// Search opens with the field already focused so the keyboard slides in with
/// nothing else moving. Back returns to the tab it was opened from.
struct SearchView: View {
    @Binding var searchText: String
    @Binding var selectedTab: AppTab
    var returnTo: AppTab = .stores

    @FocusState private var searchFocused: Bool
    @State private var selectedProduct: Product?
    @State private var selectedStore: Store?
    @State private var recents: [String] = SearchRecents.load()
    @ObservedObject private var databaseService = DatabaseService.shared

    private let grid = [GridItem(.flexible(), spacing: 15), GridItem(.flexible(), spacing: 15)]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                searchBar
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 16)

                ScrollView {
                    if searchText.isEmpty { discovery } else { results }
                }
                .scrollDismissesKeyboard(.interactively)
            }

            // Product detail overlay — parent stays rendered so it shows through during swipe
            if let product = selectedProduct {
                ProductDetailView(
                    product: product,
                    showTabBar: .constant(false),
                    selectedTab: .constant(.stores),
                    onDismiss: { selectedProduct = nil }
                )
                .zIndex(10)
                .transition(.identity)
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .onAppear { focusSoon() }
        .onChange(of: selectedTab) { _, tab in if tab == .search { focusSoon() } }
        .fullScreenCover(item: $selectedStore) { store in
            StoreProductsView(store: store, showTabBar: .constant(false), selectedTab: .constant(.stores))
        }
    }

    // MARK: - Top bar

    private var searchBar: some View {
        HStack(spacing: 12) {
            Button(action: goBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }

            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                TextField("Search stores, brands, products", text: $searchText)
                    .font(.custom("Montserrat-Regular", size: 16))
                    .foregroundColor(.white)
                    .focused($searchFocused)
                    .submitLabel(.search)
                    .autocorrectionDisabled()
                    .onSubmit { remember("q:" + searchText.trimmingCharacters(in: .whitespaces)) }
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding(.horizontal, 16)
            .frame(height: 44)
            .glassEffect(.regular.interactive(), in: .capsule)
        }
    }

    private func focusSoon() {
        // The field has to exist before it can take focus — one runloop turn.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { searchFocused = true }
    }

    private func goBack() {
        searchFocused = false
        searchText = ""
        selectedTab = returnTo
    }

    // MARK: - Discovery (empty field)

    private var discovery: some View {
        VStack(alignment: .leading, spacing: 28) {
            if !recentStores.isEmpty || !recentQueries.isEmpty {
                section("Recently searched", trailing: "Clear", action: clearRecents) {
                    if !recentStores.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 18) {
                                ForEach(recentStores) { store in
                                    StoreCircle(store: store) { open(store) }
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                    if !recentQueries.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(recentQueries, id: \.self) { q in
                                    Button(action: { searchText = q }) {
                                        Label(q, systemImage: "clock.arrow.circlepath")
                                            .font(.custom("Montserrat-Medium", size: 13))
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 14)
                                            .frame(height: 36)
                                            .glassEffect(.regular.interactive(), in: .capsule)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                }
            }

            section("Trending stores") {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 18) {
                        ForEach(suggestedStores) { store in
                            StoreCircle(store: store) { open(store) }
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }

            if !topCategories.isEmpty {
                section("Shop by category") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(topCategories, id: \.self) { category in
                                Button(action: { searchText = category; remember("q:" + category) }) {
                                    Text(category)
                                        .font(.custom("Montserrat-SemiBold", size: 13))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 16)
                                        .frame(height: 38)
                                        .glassEffect(.regular.interactive(), in: .capsule)
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
            }

            if !suggestedProducts.isEmpty {
                section("Just dropped") {
                    productGrid(suggestedProducts)
                }
            }

            if !newArrivals.isEmpty {
                section("New arrivals") {
                    productGrid(newArrivals)
                }
            }
        }
        .padding(.top, 4)
        .padding(.bottom, 120)
    }

    // MARK: - Results

    private var results: some View {
        VStack(alignment: .leading, spacing: 28) {
            if !filteredStores.isEmpty {
                section("Stores") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 18) {
                            ForEach(filteredStores) { store in
                                StoreCircle(store: store) { open(store) }
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
            }
            if !filteredProducts.isEmpty {
                section("Products") {
                    LazyVGrid(columns: grid, spacing: 20) {
                        ForEach(filteredProducts) { product in
                            Button(action: { selectedProduct = product }) {
                                SearchResultItem(product: product)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            if filteredStores.isEmpty && filteredProducts.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 40))
                        .foregroundColor(.gray)
                    Text("No results for \"\(searchText)\"")
                        .font(.custom("Montserrat-Medium", size: 16))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 60)
            }
        }
        .padding(.top, 4)
        .padding(.bottom, 120)
    }

    private func productGrid(_ products: [Product]) -> some View {
        LazyVGrid(columns: grid, spacing: 20) {
            ForEach(products) { product in
                Button(action: { selectedProduct = product }) {
                    SearchResultItem(product: product)
                }
            }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func section<Content: View>(_ title: String, trailing: String? = nil, action: (() -> Void)? = nil, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(title)
                    .font(.custom("Montserrat-Bold", size: 18))
                    .foregroundColor(.white)
                Spacer()
                if let trailing, let action {
                    Button(trailing, action: action)
                        .font(.custom("Montserrat-Medium", size: 13))
                        .foregroundColor(.gray)
                }
            }
            .padding(.horizontal, 16)
            content()
        }
    }

    // MARK: - Data

    private func open(_ store: Store) {
        remember("store:" + store.firestoreId)
        selectedStore = store
    }

    private func remember(_ entry: String) {
        guard entry.count > 2, entry != "q:" else { return }
        recents.removeAll { $0 == entry }
        recents.insert(entry, at: 0)
        recents = Array(recents.prefix(12))
        SearchRecents.save(recents)
    }

    private func clearRecents() {
        recents = []
        SearchRecents.save(recents)
    }

    private var recentStores: [Store] {
        recents.compactMap { entry in
            guard entry.hasPrefix("store:") else { return nil }
            let id = String(entry.dropFirst(6))
            return databaseService.stores.first { $0.firestoreId == id }
        }
    }

    private var recentQueries: [String] {
        recents.filter { $0.hasPrefix("q:") }.map { String($0.dropFirst(2)) }
    }

    /// Stores that actually have products, portal-tagged trending first.
    /// A store with nothing to sell is a dead end, not a suggestion.
    var suggestedStores: [Store] {
        let stocked = Set(databaseService.products.map { $0.storeId })
        let stores = databaseService.stores.filter { stocked.contains($0.firestoreId) }
        return stores.sorted { a, b in
            let ta = a.tags.contains("trending"), tb = b.tags.contains("trending")
            return ta != tb ? ta : a.name < b.name
        }
    }

    var suggestedProducts: [Product] {
        Array(databaseService.justDroppedProducts.prefix(6))
    }

    /// Most-stocked categories, excluding the generic bucket.
    var topCategories: [String] {
        var counts: [String: Int] = [:]
        for p in databaseService.products where !p.category.isEmpty && p.category != "Clothing" {
            counts[p.category, default: 0] += 1
        }
        return counts.sorted { $0.value != $1.value ? $0.value > $1.value : $0.key < $1.key }.prefix(8).map { $0.key }
    }

    var newArrivals: [Product] {
        Array(databaseService.products
            .filter { $0.createdAt != nil && $0.isRemoteImage }
            .sorted { $0.createdAt! > $1.createdAt! }
            .prefix(6))
    }

    var filteredStores: [Store] {
        if searchText.isEmpty { return [] }
        return databaseService.stores.filter { store in
            store.name.localizedCaseInsensitiveContains(searchText) ||
            store.category.localizedCaseInsensitiveContains(searchText)
        }
    }

    var filteredProducts: [Product] {
        if searchText.isEmpty { return [] }
        return databaseService.products.filter { product in
            product.title.localizedCaseInsensitiveContains(searchText) ||
            product.brand.localizedCaseInsensitiveContains(searchText) ||
            product.category.localizedCaseInsensitiveContains(searchText)
        }
    }
}

/// Recent searches: "store:<firestoreId>" or "q:<text>", newest first.
enum SearchRecents {
    private static let key = "recentSearches"
    static func load() -> [String] { UserDefaults.standard.stringArray(forKey: key) ?? [] }
    static func save(_ value: [String]) { UserDefaults.standard.set(value, forKey: key) }
}

/// Store logo in a Liquid Glass circle with the name beneath.
struct StoreCircle: View {
    let store: Store
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    if let urlString = store.logoURL ?? store.imageURL, let url = URL(string: urlString) {
                        CachedAsyncImage(url: url) { image in
                            image.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Color.white.opacity(0.08)
                        }
                        .frame(width: 58, height: 58)
                        .clipShape(Circle())
                    } else {
                        Text(String(store.name.prefix(1)))
                            .font(.custom("Montserrat-Bold", size: 22))
                            .foregroundColor(.white)
                    }
                }
                .frame(width: 72, height: 72)
                .glassEffect(.regular.interactive(), in: .circle)

                Text(store.name)
                    .font(.custom("Montserrat-Medium", size: 12))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .frame(width: 84)
            }
        }
    }
}

struct SearchResultItem: View {
    let product: Product
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topTrailing) {
                Rectangle()
                    .fill(Color.white)
                    .frame(height: 220)
                    .overlay {
                        // Remote or Local Image
                        if product.isRemoteImage, let urlString = product.imageURL, let url = URL(string: urlString) {
                            CachedAsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                ProgressView()
                            }
                        } else if product.imageName.contains(".fill") || product.imageName == "tshirt" || product.imageName == "bag" {
                            Image(systemName: product.imageName)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .padding(20)
                                .foregroundColor(.black.opacity(0.8))
                        } else {
                            Image(product.imageName)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 15))
                
                // Small Add Button
                Image(systemName: "plus")
                    .foregroundColor(.black)
                    .padding(6)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(radius: 2)
                    .padding(8)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(product.brand)
                    .font(.custom("Montserrat-Regular", size: 12))
                    .foregroundColor(.gray)
                
                Text(product.title)
                    .font(.custom("Montserrat-Bold", size: 14))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(String(format: "$%.2f", product.price))
                    .font(.custom("Montserrat-Regular", size: 12))
                    .foregroundColor(.white)
            }
            .frame(height: 50, alignment: .top)
        }
        .frame(maxWidth: .infinity)
    }
}

