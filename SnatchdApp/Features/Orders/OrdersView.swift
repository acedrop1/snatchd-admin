import SwiftUI
import FirebaseAuth

struct OrdersView: View {
    @State private var selectedTab = 0
    @ObservedObject private var databaseService = DatabaseService.shared
    var navID: UUID

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                // Header
                Text("Orders")
                    .font(.custom("Montserrat-Bold", size: 24))
                    .foregroundColor(.white)
                    .padding(.top, 60)
                    .padding(.bottom, 20)

                    // Segmented Control
                    HStack(spacing: 0) {
                        TabPill(title: "Active Orders", isSelected: selectedTab == 0) { selectedTab = 0 }
                        TabPill(title: "Past Orders",   isSelected: selectedTab == 1) { selectedTab = 1 }
                    }
                    .padding(4)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(30)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 30)

                    ScrollView {
                        VStack(spacing: 20) {
                            if selectedTab == 0 {
                                if databaseService.activeOrders.isEmpty {
                                    OrderEmptyState(
                                        icon: "bag",
                                        title: "No active orders",
                                        subtitle: "Your current orders will appear here"
                                    )
                                } else {
                                    ForEach(databaseService.activeOrders) { order in
                                        ActiveOrderCard(order: order)
                                    }
                                }
                            } else {
                                if databaseService.pastOrders.isEmpty {
                                    OrderEmptyState(
                                        icon: "clock",
                                        title: "No past orders",
                                        subtitle: "Your completed orders will appear here"
                                    )
                                } else {
                                    ForEach(databaseService.pastOrders) { order in
                                        PastOrderCard(order: order)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 40)
                    }
                }
            }
        .id(navID)
        .onAppear {
            if let userId = Auth.auth().currentUser?.uid {
                databaseService.listenToOrders(userId: userId)
            }
        }
    }
}

// MARK: - Tab Pill

struct TabPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.custom("Montserrat-Medium", size: 15))
                .foregroundColor(isSelected ? .white : .gray)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity)
                .background(isSelected ? Color.white.opacity(0.1) : Color.clear)
                .cornerRadius(25)
                .overlay(
                    RoundedRectangle(cornerRadius: 25)
                        .stroke(isSelected ? Color.white.opacity(0.3) : Color.clear, lineWidth: 1)
                )
        }
    }
}

// MARK: - Active Order Card

struct ActiveOrderCard: View {
    let order: Order

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header row
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(order.storeSummary)
                        .font(.custom("Montserrat-Bold", size: 18))
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text(order.orderNumber)
                        .font(.custom("Montserrat-Bold", size: 12))
                        .foregroundColor(.gray)
                    Text("Order Total")
                        .font(.custom("Montserrat-Regular", size: 12))
                        .foregroundColor(.white)
                    Text(String(format: "$%.2f", order.total))
                        .font(.custom("Montserrat-Bold", size: 16))
                        .foregroundColor(.white)
                }
            }

            // Product Thumbnails
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(order.items) { item in
                        OrderProductThumbnail(item: item)
                    }
                }
            }

            Divider().background(Color.white.opacity(0.1))

            // Status & Track button
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(order.statusLabel)
                        .font(.custom("Montserrat-Bold", size: 18))
                        .foregroundColor(.white)
                    Text(order.deliveryAddress)
                        .font(.custom("Montserrat-Regular", size: 13))
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
                Spacer()
                NavigationLink(destination: TrackingView()) {
                    HStack(spacing: 8) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.system(size: 14))
                        Text("Track Live")
                            .font(.custom("Montserrat-SemiBold", size: 14))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(20)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                    )
                }
            }

            // Status progress bar
            OrderStatusBar(status: order.status)
        }
        .padding(24)
        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
        .cornerRadius(24)
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

// MARK: - Past Order Card

struct PastOrderCard: View {
    let order: Order

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(order.storeSummary)
                        .font(.custom("Montserrat-Bold", size: 16))
                        .foregroundColor(.white)
                        .lineLimit(2)
                    Text(formattedDate(order.createdAt))
                        .font(.custom("Montserrat-Regular", size: 12))
                        .foregroundColor(.gray)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text(order.orderNumber)
                        .font(.custom("Montserrat-Bold", size: 11))
                        .foregroundColor(.gray)
                    Text(String(format: "$%.2f", order.total))
                        .font(.custom("Montserrat-Bold", size: 15))
                        .foregroundColor(.white)
                }
            }

            // Product thumbnails (smaller)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(order.items) { item in
                        OrderProductThumbnail(item: item, size: 80)
                    }
                }
            }

            HStack {
                Text("Delivered")
                    .font(.custom("Montserrat-SemiBold", size: 12))
                    .foregroundColor(.green)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(20)
                Spacer()
                Text("\(order.items.reduce(0) { $0 + $1.quantity }) item\(order.items.reduce(0) { $0 + $1.quantity } == 1 ? "" : "s")")
                    .font(.custom("Montserrat-Regular", size: 12))
                    .foregroundColor(.gray)
            }
        }
        .padding(20)
        .background(Color(red: 0.08, green: 0.08, blue: 0.08))
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    func formattedDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f.string(from: date)
    }
}

// MARK: - Order Product Thumbnail

struct OrderProductThumbnail: View {
    let item: OrderItem
    var size: CGFloat = 120

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Group {
                if let urlString = item.productImageURL, let url = URL(string: urlString) {
                    CachedAsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.white.opacity(0.1)
                    }
                } else {
                    Color.white.opacity(0.1)
                        .overlay(
                            Image(systemName: "photo")
                                .foregroundColor(.white.opacity(0.3))
                        )
                }
            }
            .frame(width: size, height: size)
            .cornerRadius(12)
            .clipped()

            VStack(alignment: .leading, spacing: 2) {
                Text(item.productBrand)
                    .font(.custom("Montserrat-Bold", size: 11))
                    .foregroundColor(.white)
                Text(item.productTitle)
                    .font(.custom("Montserrat-SemiBold", size: 12))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .frame(width: size, alignment: .leading)
                Text(String(format: "$%.0f", item.productPrice))
                    .font(.custom("Montserrat-Regular", size: 11))
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Order Status Bar

struct OrderStatusBar: View {
    let status: String

    private let steps = ["placed", "confirmed", "picked_up", "in_transit", "delivered"]

    private var currentIndex: Int {
        steps.firstIndex(of: status) ?? 0
    }

    private func label(for step: String) -> String {
        switch step {
        case "placed":     return "Placed"
        case "confirmed":  return "Confirmed"
        case "picked_up":  return "Picked Up"
        case "in_transit": return "En Route"
        case "delivered":  return "Delivered"
        default:           return step
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    Circle()
                        .fill(index <= currentIndex ? Color.white : Color.white.opacity(0.2))
                        .frame(width: 8, height: 8)
                    if index < steps.count - 1 {
                        Rectangle()
                            .fill(index < currentIndex ? Color.white : Color.white.opacity(0.15))
                            .frame(height: 2)
                    }
                }
            }
            Text(label(for: status))
                .font(.custom("Montserrat-SemiBold", size: 12))
                .foregroundColor(.white.opacity(0.7))
        }
    }
}

// MARK: - Empty State

struct OrderEmptyState: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundColor(.white.opacity(0.2))
                .padding(.top, 60)
            Text(title)
                .font(.custom("Montserrat-Bold", size: 18))
                .foregroundColor(.white.opacity(0.5))
            Text(subtitle)
                .font(.custom("Montserrat-Regular", size: 14))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 40)
    }
}

#Preview {
    OrdersView(navID: UUID())
        .preferredColorScheme(.dark)
}
