import SwiftUI

struct OrdersView: View {
    @State private var selectedTab = 0
    var navID: UUID
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 0) {
                    // Header
                    Text("Orders")
                        .font(.custom("Montserrat-Bold", size: 24))
                        .foregroundColor(.white)
                        .padding(.top, 20)
                        .padding(.bottom, 20)
                    
                    // Segmented Control
                    HStack(spacing: 0) {
                        Button(action: { selectedTab = 0 }) {
                            Text("Active Orders")
                                .font(.custom("Montserrat-Medium", size: 15))
                                .foregroundColor(selectedTab == 0 ? .white : .gray)
                                .padding(.vertical, 12)
                                .frame(maxWidth: .infinity)
                                .background(selectedTab == 0 ? Color.white.opacity(0.1) : Color.clear)
                                .cornerRadius(25)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 25)
                                        .stroke(selectedTab == 0 ? Color.white.opacity(0.3) : Color.clear, lineWidth: 1)
                                )
                        }
                        
                        Button(action: { selectedTab = 1 }) {
                            Text("Past Orders")
                                .font(.custom("Montserrat-Medium", size: 15))
                                .foregroundColor(selectedTab == 1 ? .white : .gray)
                                .padding(.vertical, 12)
                                .frame(maxWidth: .infinity)
                                .background(selectedTab == 1 ? Color.white.opacity(0.1) : Color.clear)
                                .cornerRadius(25)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 25)
                                        .stroke(selectedTab == 1 ? Color.white.opacity(0.3) : Color.clear, lineWidth: 1)
                                )
                        }
                    }
                    .padding(4)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(30)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 30)
                    
                    ScrollView {
                        VStack(spacing: 20) {
                            if selectedTab == 0 {
                                ActiveOrderCard()
                            } else {
                                Text("No past orders")
                                    .font(.custom("Montserrat-Regular", size: 16))
                                    .foregroundColor(.gray)
                                    .padding(.top, 40)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    Spacer()
                }
            }
            .navigationBarHidden(true)
        }
        .id(navID)
    }
}

struct ActiveOrderCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Skims, Adidas, Aesop, Zara + \n1 other store")
                        .font(.custom("Montserrat-Bold", size: 18))
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("ORDER #0126")
                        .font(.custom("Montserrat-Bold", size: 12))
                        .foregroundColor(.gray)
                    Text("Order Total")
                        .font(.custom("Montserrat-Regular", size: 12))
                        .foregroundColor(.white)
                    Text("$424.98")
                        .font(.custom("Montserrat-Bold", size: 16))
                        .foregroundColor(.white)
                }
            }
            
            // Product Thumbnails (Horizontal Scroll)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ProductThumbnail(brand: "Adidas", name: "Brown Sambas Classico", price: "$90.00", imageName: "product2") // Nike shoe as placeholder for Adidas
                    ProductThumbnail(brand: "Acne Studios", name: "Black Japanese Denim", price: "$150.00", imageName: "product5") // T-shirt
                    ProductThumbnail(brand: "Our Legacy", name: "Black Woven Leather", price: "$250.00", imageName: "product3") // Bag
                }
            }
            
            Divider()
                .background(Color.white.opacity(0.1))
            
            // Status & Tracking
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Arriving in 32 minutes")
                        .font(.custom("Montserrat-Bold", size: 18))
                        .foregroundColor(.white)
                    Text("Your Snatchr, Tory, is on the way.")
                        .font(.custom("Montserrat-Regular", size: 14))
                        .foregroundColor(.gray)
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
            
            // Progress Bar
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("On the way!")
                        .font(.custom("Montserrat-Bold", size: 14))
                        .foregroundColor(.white)
                    Spacer()
                    Image(systemName: "box.truck.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                }
                
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 6)
                    
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [Color.white.opacity(0.5), Color.white],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: 220, height: 6)
                }
            }
        }
        .padding(24)
        .background(Color(red: 0.1, green: 0.1, blue: 0.1)) // Dark gray card background
        .cornerRadius(24)
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

struct ProductThumbnail: View {
    let brand: String
    let name: String
    let price: String
    let imageName: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(brand)
                .font(.custom("Montserrat-Bold", size: 12))
                .foregroundColor(.white)
            
            Image(imageName)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 120, height: 120)
                .background(Color.white)
                .cornerRadius(16)
                .clipped()
            
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.custom("Montserrat-SemiBold", size: 13))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(width: 120, alignment: .leading)
                
                Text(price)
                    .font(.custom("Montserrat-Regular", size: 12))
                    .foregroundColor(.gray)
            }
        }
    }
}

#Preview {
    OrdersView(navID: UUID())
        .preferredColorScheme(.dark)
}
