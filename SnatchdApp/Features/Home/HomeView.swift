import SwiftUI

struct HomeView: View {
    @Binding var showTabBar: Bool
    @Binding var selectedTab: Tab
    @Binding var showSearch: Bool
    @Binding var searchText: String
    @Binding var isTopSearchActive: Bool
    @Binding var scrollToTop: Bool
    @Binding var isAtRoot: Bool
    var navID: UUID
    @StateObject private var databaseService = DatabaseService.shared
    @State private var selectedCategory = "All"
    @State private var showLocationSheet = false
    @State private var selectedLocation = AppConfig.defaultLocationName
    @Namespace private var categoryNamespace
    
    let categories = ["All", "Clothing", "Hygiene", "Beauty & Skincare", "Fine Jewelry"]
    
    let columns = [
        GridItem(.flexible(), spacing: 15),
        GridItem(.flexible(), spacing: 15)
    ]
    
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
                                        selectedTab = .profile
                                    }
                                }) {
                                    Image("profile") // Custom profile icon
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
                                HStack(spacing: 12) {
                                    ForEach(categories, id: \.self) { category in
                                        Button(action: {
                                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                                selectedCategory = category
                                            }
                                        }) {
                                            Text(category)
                                                .font(.custom("Montserrat-SemiBold", size: 14))
                                                .foregroundColor(selectedCategory == category ? .white : .gray)
                                                .padding(.horizontal, 18)
                                                .padding(.vertical, 10)
                                        }
                                        .background(
                                            Group {
                                                if selectedCategory == category {
                                                    Capsule()
                                                        .glassEffect()
                                                        .matchedGeometryEffect(id: "categoryBackground", in: categoryNamespace)
                                                }
                                            }
                                        )
                                    }
                                }
                                .padding(.horizontal)
                            }
                            
                            // Snatchd For You (Vertical Featured Cards)
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Snatchd For You")
                                    .font(.custom("Montserrat-Bold", size: 18))
                                    .foregroundColor(.white)
                                    .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 15) {
                                        // Using stores for this section as per mockup (Louis Vuitton, Nike)
                                        ForEach(databaseService.stores) { store in
                                            NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                                FeaturedStoreCard(store: store)
                                            }
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                            
                            // Trending in Your Area (Wide Cards)
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Trending in Your Area")
                                    .font(.custom("Montserrat-Bold", size: 18))
                                    .foregroundColor(.white)
                                    .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 15) {
                                        ForEach(databaseService.stores) { store in
                                            NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                                TrendingStoreCard(store: store)
                                            }
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                            
                            // Under 60 minutes (Grid)
                            VStack(alignment: .leading, spacing: 15) {
                                Text("Under 60 minutes")
                                    .font(.custom("Montserrat-Bold", size: 18))
                                    .foregroundColor(.white)
                                    .padding(.horizontal)
                                
                                LazyVGrid(columns: columns, spacing: 20) {
                                    ForEach(databaseService.stores) { store in
                                        NavigationLink(destination: StoreProductsView(store: store, showTabBar: $showTabBar, selectedTab: $selectedTab)) {
                                            GridStoreCard(store: store)
                                        }
                                    }
                                }
                                .padding(.horizontal)
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
                }
                .onDisappear {
                    isAtRoot = false
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
                        LocationDropdownCard(isShowing: $showLocationSheet, selectedLocation: $selectedLocation)
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
                    Text("Madison Ave")
                        .font(.custom("Montserrat-Regular", size: 14))
                        .foregroundColor(.white.opacity(0.8))
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
#Preview {
    HomeView(showTabBar: .constant(true), selectedTab: .constant(.stores), showSearch: .constant(false), searchText: .constant(""), isTopSearchActive: .constant(false), scrollToTop: .constant(false), isAtRoot: .constant(true), navID: UUID())
        .preferredColorScheme(.dark)
}
