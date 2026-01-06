import SwiftUI
import MapKit

struct MapLocation: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
    let type: LocationType
    
    enum LocationType {
        case user
        case courier
    }
}

struct TrackingView: View {
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.0060),
        span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
    )
    
    // Mock Locations
    let locations = [
        MapLocation(coordinate: CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.0060), type: .user),
        MapLocation(coordinate: CLLocationCoordinate2D(latitude: 40.7158, longitude: -74.0090), type: .courier)
    ]
    
    @Environment(\.presentationMode) var presentationMode
    
    @State private var showHelpSheet = false
    @State private var dragOffset: CGFloat = 0
    @State private var currentOffset: CGFloat = 0
    
    let minHeight: CGFloat = 280
    let maxHeight: CGFloat = 650
    
    var sheetHeight: CGFloat {
        max(minHeight, min(maxHeight, minHeight + currentOffset - dragOffset))
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Map Background with Annotations
            Map(coordinateRegion: $region, annotationItems: locations) { location in
                MapAnnotation(coordinate: location.coordinate) {
                    if location.type == .user {
                        Image(systemName: "house.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.blue)
                            .background(Circle().fill(Color.white))
                            .shadow(radius: 4)
                    } else {
                        Image(systemName: "bicycle.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.green)
                            .background(Circle().fill(Color.white))
                            .shadow(radius: 4)
                    }
                }
            }
            .edgesIgnoringSafeArea(.all)
            
            // Top Navigation Bar
            VStack {
                HStack(spacing: 16) {
                    // Back Button
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                    }
                    
                    Spacer()
                    
                    // Title
                    Text("Live Tracking")
                        .font(.custom("Montserrat-SemiBold", size: 16))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(.ultraThinMaterial)
                        .environment(\.colorScheme, .dark)
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                    
                    Spacer()
                    
                    // Help Button
                    Button(action: {
                        showHelpSheet = true
                    }) {
                        Image(systemName: "questionmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                    }
                }
                .padding(.top, 50)
                .padding(.horizontal, 20)
                
                Spacer()
            }
            
            // Bottom Sheet
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    // Drag Handle
                    Capsule()
                        .fill(Color.white.opacity(0.3))
                        .frame(width: 40, height: 5)
                        .padding(.top, 12)
                        .padding(.bottom, 20)
                    
                    // Fixed Header Content (Always Draggable)
                    VStack(spacing: 16) {
                        deliveryStatusSection
                        progressBar
                        courierInfoCard
                    }
                    .padding(.bottom, 16)
                    .contentShape(Rectangle())
                    .gesture(dragGesture) // Always draggable from here
                    
                    // Scrollable Timeline (Only visible/scrollable when expanded)
                    ScrollView(showsIndicators: false) {
                        if sheetHeight > minHeight + 50 {
                            deliveryTimeline
                                .padding(.top, 8)
                                .transition(.opacity)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    
                    // Bottom safe area padding
                    Spacer().frame(height: 100)
                }
                .frame(height: sheetHeight)
                .frame(maxWidth: .infinity)
                .background(
                    ZStack {
                        Color.black.opacity(0.6)
                        VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                    }
                )
                .cornerRadius(24, corners: [.topLeft, .topRight])
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(
                            LinearGradient(
                                colors: [Color.white.opacity(0.3), Color.white.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1.5
                        )
                )
                .shadow(color: Color.black.opacity(0.3), radius: 20, x: 0, y: -5)
                .offset(y: geometry.size.height - sheetHeight)
            }
        }
        .edgesIgnoringSafeArea(.bottom)
        .navigationBarHidden(true)
        .sheet(isPresented: $showHelpSheet) {
            HelpSheetView()
        }
    }
    
    // MARK: - Computed Properties
    
    var deliveryStatusSection: some View {
        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Arriving in 15 mins")
                    .font(.custom("Montserrat-Bold", size: 22))
                    .foregroundColor(.white)
                Text("On the way!")
                    .font(.custom("Montserrat-Medium", size: 13))
                    .foregroundColor(.gray)
            }
            Spacer()
            Image(systemName: "box.truck.fill")
                .font(.system(size: 36))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 20)
        .padding(.top, 4)
    }
    
    var progressBar: some View {
        ZStack(alignment: .leading) {
            Capsule()
                .fill(Color.white.opacity(0.1))
                .frame(height: 6)
            
            Capsule()
                .fill(
                    LinearGradient(
                        colors: [Color.white, Color.white.opacity(0.8)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(width: 220, height: 6)
        }
        .padding(.horizontal, 20)
    }
    
    var courierInfoCard: some View {
        HStack(spacing: 16) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color.blue.opacity(0.6), Color.purple.opacity(0.6)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 56, height: 56)
                .overlay(
                    Image(systemName: "person.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.white)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Jane Doe")
                    .font(.custom("Montserrat-Bold", size: 17))
                    .foregroundColor(.white)
                Text("Your Snatcher")
                    .font(.custom("Montserrat-Regular", size: 13))
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            HStack(spacing: 12) {
                actionButton(icon: "phone.fill", action: callCourier)
                actionButton(icon: "message.fill", action: messageCourier)
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }
    
    func actionButton(icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.white)
                .frame(width: 44, height: 44)
                .background(Color.white.opacity(0.1))
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        }
    }
    
    var deliveryTimeline: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Delivery Timeline")
                .font(.custom("Montserrat-SemiBold", size: 16))
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
            
            VStack(spacing: 0) {
                TimelineRow(icon: "checkmark.circle.fill", title: "Order Placed", time: "2:15 PM", isCompleted: true)
                TimelineRow(icon: "checkmark.circle.fill", title: "Picked Up", time: "2:38 PM", isCompleted: true)
                TimelineRow(icon: "bicycle", title: "In Transit", time: "Est. arrival 2:50 PM", isCompleted: false, isActive: true)
                TimelineRow(icon: "house.fill", title: "Delivered", time: "", isCompleted: false, isLast: true)
            }
        }
    }
    
    var dragGesture: some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .global)
            .onChanged { value in
                dragOffset = value.translation.height
            }
            .onEnded { value in
                // Use predicted end translation to handle flicks
                let predictedDragOffset = value.predictedEndTranslation.height
                let targetOffset = currentOffset - predictedDragOffset
                
                // Calculate threshold (1/3 of the range is enough to trigger)
                let range = maxHeight - minHeight
                let threshold = range / 3
                
                withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                    if targetOffset > threshold {
                        currentOffset = range
                    } else {
                        currentOffset = 0
                    }
                    dragOffset = 0
                }
            }
    }
    
    func callCourier() {
        if let url = URL(string: "tel://5551234567"), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        }
    }
    
    func messageCourier() {
        if let url = URL(string: "sms://5551234567"), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        }
    }
}

// Timeline Row Component
struct TimelineRow: View {
    let icon: String
    let title: String
    let time: String
    var isCompleted: Bool = false
    var isActive: Bool = false
    var isLast: Bool = false
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(spacing: 0) {
                ZStack {
                    Circle()
                        .fill(isCompleted || isActive ? Color.white : Color.white.opacity(0.2))
                        .frame(width: 32, height: 32)
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(isCompleted || isActive ? .black : .gray)
                }
                if !isLast {
                    Rectangle()
                        .fill(isCompleted ? Color.white.opacity(0.3) : Color.white.opacity(0.1))
                        .frame(width: 2, height: 40)
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.custom("Montserrat-SemiBold", size: 15))
                    .foregroundColor(isCompleted || isActive ? .white : .gray)
                if !time.isEmpty {
                    Text(time)
                        .font(.custom("Montserrat-Regular", size: 13))
                        .foregroundColor(.gray)
                }
            }
            .padding(.top, 4)
            Spacer()
        }
        .padding(.horizontal, 20)
    }
}

// Help Sheet View
struct HelpSheetView: View {
    @Environment(\.presentationMode) var presentationMode
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        HelpItem(icon: "map.fill", title: "Track in Real-Time", description: "Watch your Snatcher's location update live on the map.")
                        HelpItem(icon: "phone.fill", title: "Contact Your Snatcher", description: "Call or message your Snatcher directly.")
                        HelpItem(icon: "clock.fill", title: "Estimated Arrival", description: "See the estimated delivery time and track progress.")
                        HelpItem(icon: "hand.raised.fill", title: "Drag to Expand", description: "Swipe up on the bottom card to see the timeline.")
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Tracking Help")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { presentationMode.wrappedValue.dismiss() }.foregroundColor(.white)
                }
            }
        }
    }
}

struct HelpItem: View {
    let icon: String
    let title: String
    let description: String
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(.white)
                .frame(width: 48, height: 48)
                .background(Color.white.opacity(0.1))
                .cornerRadius(12)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.custom("Montserrat-SemiBold", size: 16))
                    .foregroundColor(.white)
                Text(description)
                    .font(.custom("Montserrat-Regular", size: 14))
                    .foregroundColor(.gray)
            }
        }
    }
}
