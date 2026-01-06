import SwiftUI

struct SearchView: View {
    @Binding var searchText: String
    @Binding var isPresented: Bool
    @FocusState var isFocused: Bool
    
    @State private var selectedSearchTab = 0 // 0: Recent, 1: Saved
    @State private var selectedProduct: Product?
    @State private var selectedStore: Store?
    @Namespace private var tabNamespace
    
    @ObservedObject private var databaseService = DatabaseService.shared
    
    var body: some View {
        VStack(spacing: 0) {
            // Header / Search Bar Area
            HStack(spacing: 12) {
                // Back Button
                Button(action: {
                    isPresented = false
                    isFocused = false
                    searchText = ""
                }) {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 20))
                        .foregroundColor(.white)
                        .padding(8)
                }
                
                // Search Field
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    
                    TextField("Search for anything", text: $searchText)
                        .font(.custom("Montserrat-Regular", size: 16))
                        .foregroundColor(.white)
                        .focused($isFocused)
                        .submitLabel(.search)
                    
                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 12)
                .background(Color(UIColor.systemGray6).opacity(0.2))
                .cornerRadius(25)
                
                // Cancel Button
                Button(action: {
                    isPresented = false
                    isFocused = false
                    searchText = ""
                }) {
                    Text("Cancel")
                        .font(.custom("Montserrat-Medium", size: 16))
                        .foregroundColor(.white)
                }
            }
            .padding(.horizontal)
            .padding(.top, 10) // Safe area adjustment if needed
            .padding(.bottom, 10)
            
            if searchText.isEmpty {
                // Empty state
                ScrollView {
                    VStack(spacing: 15) {
                        Spacer().frame(height: 50)
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                            .padding()
                            .background(Circle().stroke(Color.gray, lineWidth: 1))
                        
                        Text("Search Snatchd")
                            .font(.custom("Montserrat-Bold", size: 20))
                            .foregroundColor(.white)
                        
                        Text("Find your next favorite thing.")
                            .font(.custom("Montserrat-Regular", size: 14))
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 50)
                }
            } else {
                // Search Results
                ScrollView {
                    VStack(alignment: .leading, spacing: 25) {
                        
                        // 1. STORES SECTION
                        if !filteredStores.isEmpty {
                            VStack(alignment: .leading, spacing: 15) {
                                Text("Stores")
                                    .font(.custom("Montserrat-Bold", size: 18))
                                    .foregroundColor(.white)
                                    .padding(.horizontal)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 15) {
                                        ForEach(filteredStores) { store in
                                            // Navigation to Store
                                            Button(action: {
                                                selectedStore = store
                                            }) {
                                                VStack {
                                                    Text(store.name)
                                                        .font(.custom("Montserrat-Bold", size: 14))
                                                        .foregroundColor(.white)
                                                        .padding(.bottom, 2)
                                                        .multilineTextAlignment(.center)
                                                    
                                                    Text("Delivery")
                                                        .font(.custom("Montserrat-Regular", size: 10))
                                                        .foregroundColor(.gray)
                                                }
                                                .frame(width: 120, height: 60)
                                                .background(Color.white.opacity(0.1))
                                                .cornerRadius(12)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                                )
                                            }
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                        }
                        
                        // 2. PRODUCTS SECTION
                        if !filteredProducts.isEmpty {
                            VStack(alignment: .leading, spacing: 15) {
                                Text("Products")
                                    .font(.custom("Montserrat-Bold", size: 18))
                                    .foregroundColor(.white)
                                    .padding(.horizontal)
                                
                                LazyVGrid(columns: [GridItem(.flexible(), spacing: 15), GridItem(.flexible(), spacing: 15)], spacing: 20) {
                                    ForEach(filteredProducts) { product in
                                        Button(action: {
                                            selectedProduct = product
                                        }) {
                                            SearchResultItem(product: product)
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                        
                        // No Results State
                        if filteredStores.isEmpty && filteredProducts.isEmpty {
                            VStack(spacing: 20) {
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 50))
                                    .foregroundColor(.gray)
                                Text("No results found for \"\(searchText)\"")
                                    .font(.custom("Montserrat-Medium", size: 16))
                                    .foregroundColor(.gray)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 50)
                        }
                    }
                    .padding(.bottom, 40)
                    .padding(.top, 10)
                }
            }
            
            Spacer()
        }
        .background(Color.black.edgesIgnoringSafeArea(.all))
        .onAppear {
            isFocused = true
        }
        .fullScreenCover(item: $selectedProduct) { product in
            ProductDetailView(product: product, showTabBar: .constant(false), selectedTab: .constant(.stores))
        }
        .fullScreenCover(item: $selectedStore) { store in
            StoreProductsView(store: store, showTabBar: .constant(false), selectedTab: .constant(.stores))
        }
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
        let allProducts = databaseService.products + MockDataService.shared.trendingProducts
        return allProducts.filter { product in
            product.title.localizedCaseInsensitiveContains(searchText) ||
            product.brand.localizedCaseInsensitiveContains(searchText) ||
            product.category.localizedCaseInsensitiveContains(searchText)
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

