import SwiftUI

struct ContentView: View {
    init() {
        // Customize Tab Bar appearance
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.black
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    
    @State private var selectedTab: Tab = .stores
    @State private var showSearch = false
    @State private var showTabBar = true
    @State private var searchText = ""
    @State private var isTopSearchActive = false
    @State private var scrollToTop = false
    @State private var isHomeAtRoot = true
    @State private var homeNavID = UUID()
    @State private var cartNavID = UUID()
    @State private var ordersNavID = UUID()
    @State private var profileNavID = UUID()
    @EnvironmentObject var cartManager: CartManager
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            // Main Content
            Group {
                switch selectedTab {
                case .stores:
                    HomeView(showTabBar: $showTabBar, selectedTab: $selectedTab, showSearch: $showSearch, searchText: $searchText, isTopSearchActive: $isTopSearchActive, scrollToTop: $scrollToTop, isAtRoot: $isHomeAtRoot, navID: homeNavID)
                case .cart:
                    CartView(selectedTab: $selectedTab)
                case .orders:
                    OrdersView(navID: ordersNavID)
                case .profile:
                    ProfileView(navID: profileNavID)
                }
            }
            
            
            // Dedicated Search Screen (Global)
            if showSearch {
                SearchView(searchText: $searchText, isPresented: $showSearch)
                    .zIndex(2000) // Ensure it's on top of everything including tab bar
                    .transition(.opacity)
            }
            
            // CustomTabBar (Hidden on Cart and when showTabBar is false)
            if showTabBar && (selectedTab != .cart || cartManager.items.isEmpty) {
                VStack {
                    Spacer()
                    CustomTabBar(selectedTab: $selectedTab, showSearch: $showSearch, searchText: $searchText, onTabTapped: { tab in
                        if selectedTab == tab {
                            // Reset navigation stack for the tapped tab
                            switch tab {
                            case .stores:
                                if isHomeAtRoot {
                                    scrollToTop = true
                                } else {
                                    homeNavID = UUID()
                                }
                            case .cart:
                                cartNavID = UUID()
                            case .orders:
                                ordersNavID = UUID()
                            case .profile:
                                profileNavID = UUID()
                            }
                        }
                    })
                }
                .ignoresSafeArea(.container, edges: .bottom)
                .zIndex(2) // Always on top
            }
        }
        .animation(.easeOut(duration: 0.15), value: showSearch)
    }
}
