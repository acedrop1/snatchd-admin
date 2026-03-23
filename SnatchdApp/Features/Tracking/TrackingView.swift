import SwiftUI
import MapKit
import CoreLocation

// MARK: - Map Annotation Items

struct TrackingPin: Identifiable {
    let id: String
    let coordinate: CLLocationCoordinate2D
    let type: PinType
    enum PinType { case store, delivery }
}

// MARK: - TrackingView

struct TrackingView: View {
    let orderId: String

    @ObservedObject private var db = DatabaseService.shared
    @Environment(\.presentationMode) var presentationMode

    // ── Map ──────────────────────────────────────────────────────────────
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.0060),
            span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
        )
    )
    @State private var storeCoord: CLLocationCoordinate2D?
    @State private var deliveryCoord: CLLocationCoordinate2D?
    @State private var routeCoords: [CLLocationCoordinate2D] = []
    @State private var pins: [TrackingPin] = []

    // ── Animations ───────────────────────────────────────────────────────
    @State private var shimmerPhase: CGFloat = 0       // progress bar shimmer
    @State private var dotCount: Int = 1               // 1, 2, 3 cycling dots
    @State private var dotTimer: Timer?

    // ── Sheet drag ───────────────────────────────────────────────────────
    @State private var showHelpSheet = false
    @State private var dragOffset: CGFloat = 0
    @State private var currentOffset: CGFloat = 0

    let minHeight: CGFloat = 300
    let maxHeight: CGFloat = 660

    var sheetHeight: CGFloat {
        max(minHeight, min(maxHeight, minHeight + currentOffset - dragOffset))
    }

    // ── Live order data ──────────────────────────────────────────────────
    var order: Order?         { db.trackedOrder }
    var trackingStep: Int     { order?.trackingStep ?? -1 }
    var isAssigning: Bool     { order?.driverName == nil || (order?.driverName ?? "").isEmpty }

    var arrivalText: String {
        guard let order = order else { return "Order confirmed" }
        switch order.trackingStatus {
        case "headed_to_store": return "Headed to the store"
        case "shopping":        return "Shopping for you now"
        case "checking_out":    return "Checking out..."
        case "on_the_way":      return "On the way!"
        case "almost_there":    return "Almost there!"
        case "delivered":       return "Delivered!"
        default:                return "Order confirmed"
        }
    }

    var trackingStatusLabel: String { order?.trackingLabel ?? "Order Placed" }

    var driverDisplayName: String {
        if isAssigning {
            return "Assigning driver" + String(repeating: ".", count: dotCount)
        }
        return order?.driverName ?? "Your Snatcher"
    }

    var driverPhone: String? { order?.driverPhone }

    var progressFraction: Double {
        if trackingStep < 0 { return 0.05 }
        return Double(min(trackingStep + 1, 6)) / 6.0
    }

    // MARK: - Body

    var body: some View {
        ZStack(alignment: .bottom) {

            // ── Real Map ─────────────────────────────────────────────────
            Map(position: $cameraPosition) {
                // Store pin
                if let coord = storeCoord {
                    Annotation("Store", coordinate: coord) {
                        ZStack {
                            Circle()
                                .fill(Color.white)
                                .frame(width: 40, height: 40)
                                .shadow(color: .black.opacity(0.3), radius: 4)
                            Image(systemName: "bag.fill")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.black)
                        }
                    }
                }
                // Delivery pin
                if let coord = deliveryCoord {
                    Annotation("Delivery", coordinate: coord) {
                        ZStack {
                            Circle()
                                .fill(Color.blue)
                                .frame(width: 40, height: 40)
                                .shadow(color: .black.opacity(0.3), radius: 4)
                            Image(systemName: "house.fill")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.white)
                        }
                    }
                }
                // Route polyline
                if routeCoords.count >= 2 {
                    MapPolyline(coordinates: routeCoords)
                        .stroke(
                            LinearGradient(
                                colors: [.white, .white.opacity(0.6)],
                                startPoint: .leading,
                                endPoint: .trailing
                            ),
                            style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round)
                        )
                }
            }
            .mapStyle(.standard(elevation: .realistic))
            .edgesIgnoringSafeArea(.all)

            // ── Top Nav Bar ───────────────────────────────────────────────
            VStack {
                HStack(spacing: 16) {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .glassEffect(.regular, in: Circle())
                    }

                    Spacer()

                    Text("Live Tracking")
                        .font(.custom("Montserrat-SemiBold", size: 16))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .glassEffect(.regular, in: Capsule())

                    Spacer()

                    Button(action: { showHelpSheet = true }) {
                        Image(systemName: "questionmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .glassEffect(.regular, in: Circle())
                    }
                }
                .padding(.top, 20)
                .padding(.horizontal, 20)
                Spacer()
            }

            // ── Bottom Sheet ──────────────────────────────────────────────
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    // Drag handle
                    Capsule()
                        .fill(Color.white.opacity(0.4))
                        .frame(width: 40, height: 5)
                        .padding(.top, 12)
                        .padding(.bottom, 20)

                    // Status + progress + courier
                    VStack(spacing: 16) {
                        deliveryStatusSection
                        animatedProgressBar(totalWidth: geometry.size.width - 40)
                        courierInfoCard
                    }
                    .padding(.bottom, 16)
                    .contentShape(Rectangle())
                    .gesture(dragGesture)

                    // Timeline (revealed on drag up)
                    ScrollView(showsIndicators: false) {
                        if sheetHeight > minHeight + 50 {
                            deliveryTimeline
                                .padding(.top, 8)
                                .transition(.opacity)
                        }
                    }
                    .frame(maxWidth: .infinity)

                    Spacer().frame(height: 100)
                }
                .frame(height: sheetHeight)
                .frame(maxWidth: .infinity)
                // ── Liquid Glass ──────────────────────────────────────────
                .glassEffect(
                    .regular,
                    in: UnevenRoundedRectangle(
                        topLeadingRadius: 24, bottomLeadingRadius: 0,
                        bottomTrailingRadius: 0, topTrailingRadius: 24
                    )
                )
                .overlay(
                    UnevenRoundedRectangle(
                        topLeadingRadius: 24, bottomLeadingRadius: 0,
                        bottomTrailingRadius: 0, topTrailingRadius: 24
                    )
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.35), Color.white.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.5
                    )
                )
                .offset(y: geometry.size.height - sheetHeight)
            }
        }
        .edgesIgnoringSafeArea(.bottom)
        .navigationBarHidden(true)
        .onAppear {
            if !orderId.isEmpty { db.listenToOrder(orderId: orderId) }
            startDotAnimation()
            startShimmerAnimation()
        }
        .onDisappear {
            db.stopTrackingOrder()
            dotTimer?.invalidate()
            dotTimer = nil
        }
        .onChange(of: order?.id) { _ in
            loadMapData()
        }
        .onChange(of: isAssigning) { assigning in
            if assigning { startDotAnimation() } else { dotTimer?.invalidate() }
        }
        .sheet(isPresented: $showHelpSheet) {
            HelpSheetView()
        }
    }

    // MARK: - Subviews

    var deliveryStatusSection: some View {
        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text(arrivalText)
                    .font(.custom("Montserrat-Bold", size: 22))
                    .foregroundColor(.white)
                    .animation(.easeInOut, value: arrivalText)
                Text(trackingStatusLabel)
                    .font(.custom("Montserrat-Medium", size: 13))
                    .foregroundColor(Color.white.opacity(0.6))
                    .animation(.easeInOut, value: trackingStatusLabel)
            }
            Spacer()
            Image(systemName: trackingStep >= 3 ? "box.truck.fill" : trackingStep >= 0 ? "bag.fill" : "clock.fill")
                .font(.system(size: 36))
                .foregroundColor(.white)
                .animation(.easeInOut, value: trackingStep)
        }
        .padding(.horizontal, 20)
        .padding(.top, 4)
    }

    func animatedProgressBar(totalWidth: CGFloat) -> some View {
        let filled = max(20, totalWidth * progressFraction)
        return ZStack(alignment: .leading) {
            // Track
            Capsule()
                .fill(Color.white.opacity(0.12))
                .frame(height: 6)

            // Fill
            Capsule()
                .fill(
                    LinearGradient(
                        colors: [Color.white.opacity(0.9), Color.white.opacity(0.6)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(width: filled, height: 6)
                .animation(.spring(response: 0.6, dampingFraction: 0.7), value: progressFraction)
                // Shimmer overlay
                .overlay(
                    GeometryReader { geo in
                        Color.white
                            .opacity(0.5)
                            .frame(width: 40)
                            .blur(radius: 6)
                            .offset(x: shimmerPhase * geo.size.width - 20)
                    }
                    .clipShape(Capsule())
                )
        }
        .padding(.horizontal, 20)
    }

    var courierInfoCard: some View {
        HStack(spacing: 16) {
            // Avatar
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
                // Animated driver name with dots
                Text(driverDisplayName)
                    .font(.custom("Montserrat-Bold", size: 17))
                    .foregroundColor(.white)
                    .animation(.easeInOut(duration: 0.2), value: driverDisplayName)
                Text("Your Snatcher")
                    .font(.custom("Montserrat-Regular", size: 13))
                    .foregroundColor(Color.white.opacity(0.5))
            }

            Spacer()

            if driverPhone != nil {
                HStack(spacing: 12) {
                    actionButton(icon: "phone.fill", action: callCourier)
                    actionButton(icon: "message.fill", action: messageCourier)
                }
            }
        }
        .padding(16)
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }

    func actionButton(icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.white)
                .frame(width: 44, height: 44)
                .glassEffect(.regular, in: Circle())
        }
    }

    var deliveryTimeline: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Delivery Timeline")
                .font(.custom("Montserrat-SemiBold", size: 16))
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.bottom, 16)

            TimelineRow(
                icon: "checkmark.circle.fill",
                title: "Order Placed",
                time: order?.createdAt != nil ? formatTime(order!.createdAt) : "",
                isCompleted: true
            )
            TimelineRow(
                icon: trackingStep >= 2 ? "checkmark.circle.fill" : "bag.fill",
                title: trackingStep <= 0 ? "Headed to Store" : trackingStep == 1 ? "Shopping" : trackingStep == 2 ? "Checking Out" : "Picked Up",
                time: "",
                isCompleted: trackingStep >= 3,
                isActive: trackingStep >= 0 && trackingStep <= 2
            )
            TimelineRow(
                icon: trackingStep >= 5 ? "checkmark.circle.fill" : "bicycle",
                title: trackingStep == 4 ? "Almost There!" : "On the Way",
                time: "",
                isCompleted: trackingStep >= 5,
                isActive: trackingStep == 3 || trackingStep == 4
            )
            TimelineRow(
                icon: "house.fill",
                title: "Delivered",
                time: trackingStep >= 5 ? "Delivered!" : "",
                isCompleted: trackingStep >= 5,
                isLast: true
            )
        }
    }

    // MARK: - Animations

    private func startDotAnimation() {
        dotTimer?.invalidate()
        guard isAssigning else { return }
        dotTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.2)) {
                dotCount = dotCount % 3 + 1
            }
        }
    }

    private func startShimmerAnimation() {
        withAnimation(
            .linear(duration: 1.8)
            .repeatForever(autoreverses: false)
        ) {
            shimmerPhase = 1.4
        }
    }

    // MARK: - Real Map Loading

    private func loadMapData() {
        guard let order = order else { return }

        // 1. Find store coordinates from db.stores using the first item's storeId
        if let storeId = order.items.first?.storeId,
           let store = db.stores.first(where: { $0.firestoreId == storeId }),
           let lat = store.latitude, let lon = store.longitude {
            storeCoord = CLLocationCoordinate2D(latitude: lat, longitude: lon)
        }

        // 2. Geocode delivery address
        let geocoder = CLGeocoder()
        geocoder.geocodeAddressString(order.deliveryAddress) { placemarks, _ in
            DispatchQueue.main.async {
                if let loc = placemarks?.first?.location?.coordinate {
                    self.deliveryCoord = loc
                    self.updateMapCamera()
                    self.fetchRoute()
                }
            }
        }
    }

    private func updateMapCamera() {
        let coords = [storeCoord, deliveryCoord].compactMap { $0 }
        guard coords.count == 2,
              let s = storeCoord, let d = deliveryCoord else {
            if let single = storeCoord ?? deliveryCoord {
                withAnimation {
                    cameraPosition = .region(MKCoordinateRegion(
                        center: single,
                        span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                    ))
                }
            }
            return
        }
        let minLat = min(s.latitude,  d.latitude)
        let maxLat = max(s.latitude,  d.latitude)
        let minLon = min(s.longitude, d.longitude)
        let maxLon = max(s.longitude, d.longitude)
        let centerLat = (minLat + maxLat) / 2
        let centerLon = (minLon + maxLon) / 2
        let spanLat = (maxLat - minLat) * 1.6
        let spanLon = (maxLon - minLon) * 1.6
        withAnimation(.easeInOut(duration: 0.8)) {
            cameraPosition = .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
                span: MKCoordinateSpan(
                    latitudeDelta: max(spanLat, 0.01),
                    longitudeDelta: max(spanLon, 0.01)
                )
            ))
        }
    }

    private func fetchRoute() {
        guard let s = storeCoord, let d = deliveryCoord else { return }
        let req = MKDirections.Request()
        req.source      = MKMapItem(placemark: MKPlacemark(coordinate: s))
        req.destination = MKMapItem(placemark: MKPlacemark(coordinate: d))
        req.transportType = .automobile
        MKDirections(request: req).calculate { response, _ in
            DispatchQueue.main.async {
                if let route = response?.routes.first {
                    self.routeCoords = route.polyline.coordinates
                } else {
                    // Fallback: straight line
                    self.routeCoords = [s, d]
                }
            }
        }
    }

    // MARK: - Drag Gesture

    var dragGesture: some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .global)
            .onChanged { value in dragOffset = value.translation.height }
            .onEnded { value in
                let target = currentOffset - value.predictedEndTranslation.height
                let range  = maxHeight - minHeight
                withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                    currentOffset = target > range / 3 ? range : 0
                    dragOffset = 0
                }
            }
    }

    // MARK: - Actions

    private func callCourier() {
        guard let phone = driverPhone else { return }
        let cleaned = phone.filter { $0.isNumber }
        if let url = URL(string: "tel://\(cleaned)"), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        }
    }

    private func messageCourier() {
        guard let phone = driverPhone else { return }
        let cleaned = phone.filter { $0.isNumber }
        if let url = URL(string: "sms://\(cleaned)"), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        }
    }

    private func formatTime(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f.string(from: date)
    }
}

// MARK: - MKPolyline extension

extension MKPolyline {
    var coordinates: [CLLocationCoordinate2D] {
        var coords = [CLLocationCoordinate2D](repeating: .init(), count: pointCount)
        getCoordinates(&coords, range: NSRange(location: 0, length: pointCount))
        return coords
    }
}

// MARK: - Timeline Row

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

// MARK: - Help Sheet

struct HelpSheetView: View {
    @Environment(\.presentationMode) var presentationMode
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        HelpItem(icon: "map.fill",         title: "Track in Real-Time",      description: "Watch your Snatcher's live position on the map.")
                        HelpItem(icon: "phone.fill",       title: "Contact Your Snatcher",   description: "Call or message your Snatcher directly.")
                        HelpItem(icon: "clock.fill",       title: "Estimated Arrival",       description: "See estimated delivery time and progress.")
                        HelpItem(icon: "hand.raised.fill", title: "Drag to Expand",          description: "Swipe up on the bottom card to see the timeline.")
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
