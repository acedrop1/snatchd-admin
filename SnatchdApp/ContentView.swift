import SwiftUI
import CoreLocation

enum AppTab: Hashable {
    case stores, cart, orders, profile, search
}

// Native TabView: on iOS 26 the bar is Liquid Glass, minimizes on scroll, and
// the search tab morphs into a search field — none of that is our code.
struct ContentView: View {
    @State private var selectedTab: AppTab = .stores
    @State private var showTabBar = true
    @State private var searchText = ""
    @State private var scrollToTop = false
    @State private var isHomeAtRoot = true
    @State private var homeNavID = UUID()
    // Persisted across tab switches so returning to Stores keeps the chosen delivery location
    @State private var manualCoordinate: CLLocation? = nil
    @State private var selectedAddressId: String? = nil
    @State private var ordersNavID = UUID()
    @State private var profileNavID = UUID()
    @EnvironmentObject var cartManager: CartManager

    /// Re-tapping the active tab pops it to root (Stores scrolls to top when already there).
    private var tabSelection: Binding<AppTab> {
        Binding(
            get: { selectedTab },
            set: { tab in
                if tab == selectedTab { resetToRoot(tab) }
                selectedTab = tab
            }
        )
    }

    private func resetToRoot(_ tab: AppTab) {
        switch tab {
        case .stores:
            if isHomeAtRoot { scrollToTop = true } else { homeNavID = UUID() }
        case .orders:  ordersNavID = UUID()
        case .profile: profileNavID = UUID()
        case .cart, .search: break
        }
    }

    var body: some View {
        TabView(selection: tabSelection) {
            Tab("Stores", image: "stores", value: .stores) {
                HomeView(
                    showTabBar: $showTabBar, selectedTab: $selectedTab,
                    scrollToTop: $scrollToTop, isAtRoot: $isHomeAtRoot, navID: homeNavID,
                    manualCoordinate: $manualCoordinate, selectedAddressId: $selectedAddressId
                )
            }
            Tab("Cart", image: "cart", value: .cart) {
                CartView(selectedTab: $selectedTab)
            }
            .badge(cartManager.items.reduce(0) { $0 + $1.quantity })

            Tab("Orders", image: "orders", value: .orders) {
                OrdersView(navID: ordersNavID)
            }
            Tab("Profile", image: "profile", value: .profile) {
                ProfileView(navID: profileNavID)
            }
            Tab(value: .search, role: .search) {
                SearchView(searchText: $searchText, selectedTab: $selectedTab)
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .onReceive(NotificationCenter.default.publisher(for: .switchToOrdersTab)) { _ in
            selectedTab = .orders
        }
    }
}
