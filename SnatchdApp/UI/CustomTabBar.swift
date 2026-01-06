import SwiftUI

enum Tab: String, CaseIterable {
    case stores = "Stores"
    case cart = "Cart"
    case orders = "Orders"
    case profile = "Profile"
    
    var icon: String {
        switch self {
        case .stores: return "stores"
        case .cart: return "cart"
        case .orders: return "orders"
        case .profile: return "profile"
        }
    }
}

struct CustomTabBar: View {
    @Binding var selectedTab: Tab
    @Binding var showSearch: Bool
    @Binding var searchText: String
    var onTabTapped: (Tab) -> Void
    @Namespace private var namespace
    @FocusState private var isFocused: Bool
    
    var body: some View {
        ZStack(alignment: .bottom) {
            if showSearch {
                // Expanded Search Bar
                HStack(spacing: 12) {
                    Button(action: {
                        // Dismiss keyboard immediately for smoother transition
                        isFocused = false
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            showSearch = false
                        }
                        // Clear text after animation starts
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            searchText = ""
                        }
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 24, height: 24)
                    }
                    
                    TextField("Search for luxury...", text: $searchText)
                        .font(.custom("Montserrat-Regular", size: 16))
                        .foregroundColor(.white)
                        .disableAutocorrection(true)
                        .focused($isFocused)
                        .submitLabel(.search)
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                isFocused = true
                            }
                        }
                    
                    if !searchText.isEmpty {
                        Button(action: {
                            searchText = ""
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                                .font(.system(size: 18))
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .glassEffect(in: Capsule())
                .padding(.horizontal, 16)
                .padding(.bottom, 30)
                .zIndex(1)
            } else {
                // Standard Tab Bar
                HStack {
                    ZStack {
                        // Tabs
                        HStack(spacing: 0) {
                            ForEach(Tab.allCases, id: \.self) { tab in
                                Button(action: {
                                    // Notify that a tab was tapped (for reset logic)
                                    onTabTapped(tab)
                                    
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        selectedTab = tab
                                    }
                                }) {
                                    VStack(spacing: 3) {
                                        Image(tab.icon)
                                            .resizable()
                                            .aspectRatio(contentMode: .fit)
                                            .frame(width: 20, height: 20)
                                            .foregroundColor(selectedTab == tab ? .white : .gray)
                                            .scaleEffect(selectedTab == tab ? 1.1 : 1.0)
                                        
                                        Text(tab.rawValue)
                                            .font(.custom("Montserrat-Medium", size: 9))
                                            .foregroundColor(selectedTab == tab ? .white : .gray)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .contentShape(Rectangle())
                                }
                            }
                        }
                        
                        // "Liquid Glass" Selection Pill (Overlay)
                        HStack(spacing: 0) {
                            ForEach(Tab.allCases, id: \.self) { tab in
                                if selectedTab == tab {
                                    Capsule()
                                        .fill(LinearGradient(gradient: Gradient(colors: [Color.white.opacity(0.15), Color.white.opacity(0.02)]), startPoint: .top, endPoint: .bottom))
                                        .overlay(
                                            Capsule()
                                                .stroke(LinearGradient(gradient: Gradient(colors: [.white.opacity(0.5), .white.opacity(0.1)]), startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1)
                                        )
                                        .shadow(color: Color.black.opacity(0.3), radius: 4, x: 0, y: 2)
                                        .matchedGeometryEffect(id: "TabBackground", in: namespace)
                                        .frame(maxWidth: .infinity)
                                        .allowsHitTesting(false)
                                } else {
                                    Color.clear
                                        .frame(maxWidth: .infinity)
                                }
                            }
                        }
                    }
                    .glassEffect(in: Capsule())
                    .frame(height: 48) // Reduced height (~30% less than 65)
                    
                    Spacer()
                    
                    // Search Button
                    Button(action: {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                            showSearch = true
                        }
                        // Focus happens in onAppear of the TextField
                    }) {
                        Image("search")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 20, height: 20)
                            .foregroundColor(.white)
                            .frame(width: 48, height: 48) // Match tab bar height
                            .glassEffect(in: Circle())
                    }
                    .padding(.leading, 10)
                }
                .padding(.horizontal)
                .padding(.bottom, 30)
            }
        }
        .shadow(color: Color.black.opacity(0.4), radius: 20, x: 0, y: 10)
    }
}

extension UIApplication {
    func endEditing() {
        sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}

#Preview {
    ZStack {
        Color.gray
        VStack {
            Spacer()
            CustomTabBar(selectedTab: .constant(.stores), showSearch: .constant(false), searchText: .constant(""), onTabTapped: { _ in })
        }
    }
}
