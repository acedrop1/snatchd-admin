import SwiftUI
import CoreLocation

struct HomeView: View {
    @Binding var showTabBar: Bool
    @Binding var selectedTab: Tab
    @Binding var showSearch: Bool
    @Binding var searchText: String
    @Binding var isTopSearchActive: Bool
    @Binding var scrollToTop: Bool
    @Binding var isAtRoot: Bool
    var navID: UUID
    @Binding var manualCoordinate: CLLocation?
    @Binding var selectedAddressId: String?
    @StateObject private var databaseService = DatabaseService.shared
    @StateObject private var locationManager = LocationManager()
    @State private var selectedCategory = "All"
    @State private var showLocationSheet = false
    @State private var selectedLocation = AppConfig.defaultLocationName
    /// Lifted to ContentView so it survives tab switches
    @Binding var manualCoordinate: CLLocation?
    /// Lifted to ContentView so it survives tab switches
    @Binding var selectedAddressId: String?

    let categories = ["All", "Clothing", "Hygiene", "Beauty & Skincare", "Fine Jewelry"]

    let columns = [
        GridItem(.flexible(), spacing: 15),
        GridItem(.flexible(), spacing: 15)
    ]

    // True once GPS or a manual pick has resolved
    var locationDetermined: Bool {
        manualCoordinate != nil || locationManager.currentLocation != nil
    }

    // Active location: manual pick wins over GPS
    var activeLocation: CLLocation? {
        manualCoordinate ?? locationManager.currentLocation
    }

    // Tag-filtered + portal-ordered sections
    var forYouStores: [Store]   { orderedStores(tag: "foryou") }
    var trendingStores: [Store] { orderedStores(tag: "trending") }
    var under60Stores: [Store]  { orderedStores(tag: "60min") }

    func orderedStores(tag: String) -> [Store] {
        let tagged = displayStores.filter { $0.tags.contains(tag) }
        let order = databaseService.storeOrderConfig[tag] ?? []
        guard !order.isEmpty else { return tagged }
        let inOrder = order.compactMap { id in tagged.first { $0.firestoreId == id } }
        let remainder = tagged.filter { s in !order.contains(s.firestoreId) }
        return inOrder + remainder
    }

    // Just Dropped products filtered to only show items from in-range stores
    var justDroppedProducts: [Product] {
        guard locationDetermined else {
            // Location not yet resolved — show all while waiting
            return databaseService.justDroppedProducts
        }
        let inRangeIds = Set(displayStores.map { $0.firestoreId })
        return databaseService.justDroppedProducts.filter { inRangeIds.contains($0.storeId) }
    }

    // Nearby Firestore stores sorted by distance; empty when location is known but no stores are in range
    var displayStores: [Store] {
        let allStores = databaseService.stores.isEmpty ? MockDataService.shared.stores : databaseService.stores

        guard let location = activeLocation else {
            // Location not yet determined — show everything while waiting
            return allStores
        }

        let userLat = location.coordinate.latitude
        let userLon = location.coordinate.longitude

        // No fallback: return empty so the UI shows "No stores in your area"
        return allStores
            .filter { $0.isWithinDeliveryRange(of: userLat, userLongitude: userLon) }
            .sorted { a, b in
                guard let latA = a.latitude, let lonA = a.longitude,
                      let latB = b.latitude, let lonB = b.longitude else { return false }
                let distA = CLLocation(latitude: latA, longitude: lonA).distance(from: location)
                let distB = CLLocation(latitude: latB, longitude: lonB).distance(from: location)
                return distA < distB
            }
    }
    
    var body: some View {
        ZStack {
            NavigationView {
                ZStack(alignment: .top) {
                    Color.black.edgesIgnoringSafeArea(.all)
                    
                    
                    ScrollViewReader { proxy in
                        ScrollView {
                            VStack(alignment: .leading, spacing: 25) {
                                // Invisible anchor at the top
                                Color.clear
                                    .frame(height: 0)
                                    .id("top")
                                
                                // Header
                            HStack {
                                Button(action: {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                        showLocationSheet.toggle()
                                    }
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "mappin.and.ellipse")
                                            .foregroundColor(.white)
                                        Text("Delivering to \(selectedLocation)")
                                            .font(.custom("Montserrat-SemiBold", size: 14))
                                            .foregroundColor(.white)
                                        Image(systemName: showLocationSheet ? "chevron.up" : "chevron.down")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                }
                                
                                Spacer()
                                
                                Button(action: {
                                    withAnimation {
                                        selectedTab = .cart
                                    }
                                }) {
                                    Image("cart")
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .frame(width: 28, height: 28)
                                        .foregroundColor(.white)
                                }
                            }
                            .padding(.horizontal)
                            .padding(.top, 10)
                            
                            // Search Bar Placeholder (Tappable)
                            Button(action: {
                                showSearch = true
                            }) {
                                HStack(spacing: 12) {
                                    Image(systemName: "magnifyingglass")
                                        .foregroundColor(.gray)
                                    Text("Search for products, brands...")
                                        .font(.custom("Montserrat-Regular", size: 15))
                                        .foregroundColor(.gray)
                                    Spacer()
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                            }
                            .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                            .padding(.horizontal)
                            
                            // Categories
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 24) {
                                    ForEach(categories, id: \.self) { category in
                                        Button(action: {
                                            withAnimation(.easeInOut(duration: 0.15)) {
                                                selectedCategory = category
                                            }
                                        }) {
                                            VStack(spacing: 6) {
                                                Text(category.uppercased())
                                                    .font(.custom(
                                                        selectedCategory == category ? "Montserrat-Bold" : "Montserrat-Regular",
                                                        size: 13
                                                    ))
                                                    .foregroundColor(selectedCategory == category ? .white : Color(white: 0.55))
                                                    .fixedSize()

                                                // Underline indicator
                                                Rectangle()
                                                    .fill(selectedCategory == category ? Color.white : Color.clear)
                                                    .frame(height: 1.5)
                                            }
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(.horizontal)
                                .padding(.bottom, 2)
                            }
                            
                            if locationDetermined && displayStores.isEmpty {
                                // ── No stores in range ────────────────────────────
                                VStack(spacing: 20) {
                                    Image(systemName: "location.slash")
                                        .font(.system(size: 52))
                                        .foregroundColor(.white.opacity(0.25))

                                    VStack(spacing: 8) {
                                        Text("No stores in your area")
                                            .font(.custom("Montserrat-Bold", size: 20))
                                            .foregroundColor(.white)

                                        Text("We don't have any Snatchd stores near \(selectedLocation) yet.\nTry a different location.")
                                            .font(.custom("Montserrat-Regular", size: 14))
                                            .foregroundColor(.gray)
                                            .multilineTextAlignment(.center)
                                    }

                                    Button(action: {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                            showLocationSheet = true
                                        }
                                    }) {
                                        Text("Change Location")
                                            .font(.custom("Montserrat-SemiBold", size: 15))
                                            .foregroundColor(.black)
                                            .padding(.horizontal, 28)
                                            .padding(.vertical, 13)
                                            .background(Color.white)
                                            .cornerRadius(24)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.horizontal)
                                .padding(.vertical, 60)
                            } else {
                                // ── Snatchd For You ───────────────────────────────
                                if !forYouStores.isEmpty {
                                    VStack(alignment: .leading, spacing: 10) {
                                        SectionHeader(
                                            title: "Snatchd For You",
                                            destination: AnyView(
                                                SectionStoresView(title: "Snatchd For You", stores: forYouStores, showTabBar: $showTabBar, selectedTab: $selectedTab)
                                            )
                                        )
                                        ScrollView(.horizontal, showsIndicators: false) {
                                            HStack(spacing: 15) {
                                                ForEach(forYouStores.prefix(10)) { store in
                                                    NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                                        FeaturedStoreCard(store: store)
                                                    }
                                                }
                                            }
                                            .padding(.horizontal)
                                        }
                                    }
                                }

                                // ── Trending in Your Area ─────────────────────────
                                if !trendingStores.isEmpty {
                                    VStack(alignment: .leading, spacing: 10) {
                                        SectionHeader(
                                            title: "Trending in Your Area",
                                            destination: AnyView(
                                                SectionStoresView(title: "Trending in Your Area", stores: trendingStores, showTabBar: $showTabBar, selectedTab: $selectedTab)
                                            )
                                        )
                                        ScrollView(.horizontal, showsIndicators: false) {
                                            HStack(spacing: 15) {
                                                ForEach(trendingStores.prefix(10)) { store in
                                                    NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                                        TrendingStoreCard(store: store)
                                                    }
                                                }
                                            }
                                            .padding(.horizontal)
                                        }
                                    }
                                }

                                // ── Under 60 minutes ──────────────────────────────
                                if !under60Stores.isEmpty {
                                    VStack(alignment: .leading, spacing: 15) {
                                        SectionHeader(
                                            title: "Under 60 Minutes",
                                            destination: AnyView(
                                                SectionStoresView(title: "Under 60 Minutes", stores: under60Stores, showTabBar: $showTabBar, selectedTab: $selectedTab)
                                            )
                                        )
                                        LazyVGrid(columns: columns, spacing: 20) {
                                            ForEach(under60Stores.prefix(10)) { store in
                                                NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                                    GridStoreCard(store: store)
                                                }
                                            }
                                        }
                                        .padding(.horizontal)
                                    }
                                }

                                // ── Just Dropped ──────────────────────────────────
                                if !justDroppedProducts.isEmpty {
                                    VStack(alignment: .leading, spacing: 12) {
                                        SectionHeader(
                                            title: "Just Dropped",
                                            destination: AnyView(
                                                SectionProductsView(title: "Just Dropped", products: justDroppedProducts, stores: databaseService.stores, showTabBar: $showTabBar, selectedTab: $selectedTab)
                                            )
                                        )
                                        LazyVGrid(columns: columns, spacing: 16) {
                                            ForEach(justDroppedProducts.prefix(10)) { product in
                                                let store = databaseService.stores.first { $0.firestoreId == product.storeId }
                                                Group {
                                                    if let store = store {
                                                        NavigationLink(destination: StoreProductsView(store: store, initialProduct: product, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                                            JustDroppedProductCard(product: product)
                                                        }
                                                    } else {
                                                        JustDroppedProductCard(product: product)
                                                    }
                                                }
                                            }
                                        }
                                        .padding(.horizontal)
                                    }
                                }

                                // ── The Full Edit ─────────────────────────────────
                                if !displayStores.isEmpty {
                                    VStack(alignment: .leading, spacing: 15) {
                                        SectionHeader(
                                            title: "The Full Edit",
                                            destination: AnyView(
                                                SectionStoresView(title: "The Full Edit", stores: displayStores, showTabBar: $showTabBar, selectedTab: $selectedTab)
                                            )
                                        )
                                        LazyVGrid(columns: columns, spacing: 20) {
                                            ForEach(displayStores.prefix(10)) { store in
                                                NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                                    GridStoreCard(store: store)
                                                }
                                            }
                                        }
                                        .padding(.horizontal)
                                    }
                                }
                            }

                            Spacer(minLength: 100)
                        }
                    }
                    .onChange(of: scrollToTop) { shouldScroll in
                        if shouldScroll {
                            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                                proxy.scrollTo("top", anchor: .top)
                            }
                            // Reset the trigger
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                scrollToTop = false
                            }
                        }
                    }
                }
                .onAppear {
                    isAtRoot = true
                    databaseService.fetchStores()
                    databaseService.fetchProducts()
                    locationManager.requestLocationPermission()
                }
                .onDisappear {
                    isAtRoot = false
                }
                .onChange(of: locationManager.currentAddress) { address in
                    // Only update header from GPS when user hasn't manually picked a location
                    if manualCoordinate == nil,
                       address != "Fetching location...",
                       address != "Unable to fetch location" {
                        selectedLocation = address
                    }
                }
                .zIndex(1) // Above dimmed
                .navigationBarHidden(true)
            }
            .id(navID) // Reset navigation stack when ID changes
            }
            
            // Location Dropdown Card - Outside NavigationView
            if showLocationSheet {
                ZStack {
                    // Dimmed background
                    Color.black.opacity(0.4)
                        .edgesIgnoringSafeArea(.all)
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                showLocationSheet = false
                            }
                        }
                    
                    // Dropdown card
                    VStack {
                        LocationDropdownCard(isShowing: $showLocationSheet, selectedLocation: $selectedLocation, selectedCoordinate: $manualCoordinate, selectedAddressId: $selectedAddressId, locationManager: locationManager)
                            .padding(.top, 60)
                        
                        Spacer()
                    }
                }
                .zIndex(1000)
                .transition(.opacity)
            }
    }
}
}

// MARK: - Card Components

struct StoreImageView: View {
    let store: Store
    
    var body: some View {
        // Remote or Local Image
        if store.isRemoteImage, let urlString = store.imageURL, let url = URL(string: urlString) {
            CachedAsyncImage(url: url) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                ProgressView()
            }
        } else if store.isSystemImage {
            Image(systemName: store.imageName)
                .resizable()
                .aspectRatio(contentMode: .fit)
        } else {
            Image(store.imageName)
                .resizable()
                .aspectRatio(contentMode: .fill)
        }
    }
}

struct FeaturedStoreCard: View {
    let store: Store
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Background Image
            Rectangle()
                .fill(Color.gray.opacity(0.3))
                .aspectRatio(0.7, contentMode: .fit) // Vertical aspect ratio
                .overlay(
                    StoreImageView(store: store)
                        .padding(store.isSystemImage ? 40 : 0) // Padding only for icons
                        .foregroundColor(store.isSystemImage ? .white.opacity(0.5) : .white)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10)) // Ensure image is clipped
            
            // Liquid Glass Overlay
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(store.name)
                        .font(.custom("Montserrat-Bold", size: 20)) // Larger title
                        .foregroundColor(.white)
                    Text(store.address ?? store.category)
                        .font(.custom("Montserrat-Regular", size: 14))
                        .foregroundColor(.white.opacity(0.8))
                        .lineLimit(1)
                }
                Spacer()
                
                // Optional: Small icon or indicator on the right if needed, keeping it clean for now
                // or matching the "arrow" from before but subtler?
                // The image shows a small square image on the right. I'll leave it empty for now to match the "text banner" focus, or add a small visual.
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 20)
            .glassEffect(in: RoundedRectangle(cornerRadius: 10))
            .padding(12) // Margin from the card edges
        }
        .frame(width: 260) // Slightly wider to accommodate larger text
    }
}

struct TrendingStoreCard: View {
    let store: Store
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Image
            ZStack(alignment: .center) {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 140)
                    .overlay(
                        StoreImageView(store: store)
                            .padding(store.isSystemImage ? 30 : 0)
                            .foregroundColor(store.isSystemImage ? .white.opacity(0.5) : .white)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                
                // Optional: Overlay icons like in mockup (Store, Chat, etc.)
                // For now, keeping it clean as per "exact design" request usually implies structure first.
            }
            .frame(width: 280)
            
            // Info
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(store.name)
                        .font(.custom("Montserrat-Bold", size: 14))
                        .foregroundColor(.white)
                    Text(store.category)
                        .font(.custom("Montserrat-Regular", size: 12))
                        .foregroundColor(.gray)
                }
                Spacer()
                Text(store.deliveryTime)
                    .font(.custom("Montserrat-Medium", size: 12))
                    .foregroundColor(.white)
            }
            .frame(width: 280)
        }
    }
}

struct GridStoreCard: View {
    let store: Store
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Image
            Rectangle()
                .fill(Color.gray.opacity(0.3))
                .aspectRatio(1.0, contentMode: .fit) // Square
                .overlay(
                    StoreImageView(store: store)
                        .padding(store.isSystemImage ? 20 : 0)
                        .foregroundColor(store.isSystemImage ? .white.opacity(0.5) : .white)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10))
            
            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(store.name)
                    .font(.custom("Montserrat-Bold", size: 14))
                    .foregroundColor(.white)
                Text(store.category)
                    .font(.custom("Montserrat-Regular", size: 12))
                    .foregroundColor(.gray)
            }
        }
    }
}
// MARK: - Section Header (title + optional "View all →")

struct SectionHeader: View {
    let title: String
    let destination: AnyView

    var body: some View {
        HStack(alignment: .center) {
            Text(title)
                .font(.custom("Montserrat-Bold", size: 18))
                .foregroundColor(.white)
            Spacer()
            NavigationLink(destination: destination) {
                Text("See More")
                    .font(.custom("Montserrat-Medium", size: 13))
                    .foregroundColor(.gray)
                    .underline()
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Section Detail: Stores

struct SectionStoresView: View {
    let title: String
    let stores: [Store]
    @Binding var showTabBar: Bool
    @Binding var selectedTab: Tab

    let columns = [GridItem(.flexible(), spacing: 15), GridItem(.flexible(), spacing: 15)]

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            ScrollView {
                LazyVGrid(columns: columns, spacing: 20) {
                    ForEach(stores) { store in
                        NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                            GridStoreCard(store: store)
                        }
                    }
                }
                .padding()
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.large)
    }
}

// MARK: - Section Detail: Products (Just Dropped "View All")

struct SectionProductsView: View {
    let title: String
    let products: [Product]
    let stores: [Store]
    @Binding var showTabBar: Bool
    @Binding var selectedTab: Tab

    let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            ScrollView {
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(products) { product in
                        let store = stores.first { $0.firestoreId == product.storeId }
                        Group {
                            if let store = store {
                                NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                    JustDroppedProductCard(product: product)
                                        .frame(maxWidth: .infinity)
                                }
                            } else {
                                JustDroppedProductCard(product: product)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.large)
    }
}

struct JustDroppedProductCard: View {
    let product: Product

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Fixed 3:4 container — image overlaid and clipped inside it
            Rectangle()
                .fill(Color.gray.opacity(0.2))
                .aspectRatio(3/4, contentMode: .fit)
                .overlay(
                    Group {
                        if let urlString = product.imageURL, let url = URL(string: urlString) {
                            CachedAsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                ProgressView()
                            }
                        } else {
                            Image(systemName: "photo")
                                .font(.system(size: 32))
                                .foregroundColor(.white.opacity(0.3))
                        }
                    }
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(product.brand)
                    .font(.custom("Montserrat-SemiBold", size: 11))
                    .foregroundColor(.gray)
                    .lineLimit(1)
                Text(product.title)
                    .font(.custom("Montserrat-Bold", size: 13))
                    .foregroundColor(.white)
                    .lineLimit(2)
                Text("$\(product.price, specifier: "%.0f")")
                    .font(.custom("Montserrat-SemiBold", size: 13))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

#Preview {
    HomeView(showTabBar: .constant(true), selectedTab: .constant(.stores), showSearch: .constant(false), searchText: .constant(""), isTopSearchActive: .constant(false), scrollToTop: .constant(false), isAtRoot: .constant(true), navID: UUID(), manualCoordinate: .constant(nil), selectedAddressId: .constant(nil))
        .preferredColorScheme(.dark)
}
