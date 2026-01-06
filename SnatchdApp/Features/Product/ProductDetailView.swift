import SwiftUI
import CoreLocation

struct ProductDetailView: View {
    let product: Product
    @Binding var showTabBar: Bool
    @Binding var selectedTab: Tab
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var cartManager: CartManager
    
    // Animation State
    @State private var cartScale: CGFloat = 1.0
    @State private var showCart = false
    
    // Expandable sections state
    @State private var isDescriptionExpanded = true
    @State private var isIngredientsExpanded = false
    
    // Interaction State
    @State private var showFullImage = false
    @State private var selectedSize = "M"
    @State private var selectedColor = "Black"
    
    // Bottom Sheet State
    @State private var dragOffset: CGFloat = 0
    @State private var isSheetExpanded = false
    
    // Real-Time Stock Check State
    @StateObject private var locationManager = LocationManager()
    @State private var isCheckingStock = false
    @State private var stockAvailability: [StoreAvailability] = []
    @State private var stockError: String?
    
    // Constants
    private let collapsedHeight: CGFloat = 300 // Height visible when collapsed
    private let expandedOffset: CGFloat = 0 // Offset when fully expanded
    
    var body: some View {
        ZStack(alignment: .top) {
            // 1. Background Image Area (Full Screen)
            GeometryReader { geometry in
                // Remote or Local Image
                if product.isRemoteImage, let urlString = product.imageURL, let url = URL(string: urlString) {
                    CachedAsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: geometry.size.width, height: geometry.size.height * 0.65)
                            .clipped()
                    } placeholder: {
                        ProgressView()
                            .frame(width: geometry.size.width, height: geometry.size.height * 0.65)
                    }
                } else if product.imageName.contains(".fill") || product.imageName == "tshirt" || product.imageName == "bag" {
                    Image(systemName: product.imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding(40)
                        .frame(width: geometry.size.width, height: geometry.size.height * 0.65)
                        .background(Color(red: 248/255, green: 245/255, blue: 240/255))
                        .foregroundColor(.black.opacity(0.8))
                } else {
                    Image(product.imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geometry.size.width, height: geometry.size.height * 0.65)
                        .clipped()
                }
            }
            .edgesIgnoringSafeArea(.all)
            .simultaneousGesture(
                DragGesture(coordinateSpace: .global)
                    .onChanged { value in
                        // Detect swipe right from left edge for back navigation
                        if value.startLocation.x < 50 && value.translation.width > 50 {
                            // User is swiping right from left edge - dismiss
                            presentationMode.wrappedValue.dismiss()
                        }
                    }
            )
            .simultaneousGesture(
                TapGesture()
                    .onEnded { _ in
                        withAnimation {
                            showFullImage = true
                        }
                    }
            )
            
            // 2. Custom Navigation Bar
            VStack {
                HStack {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.black)
                            .padding()
                            .background(Circle().fill(Color.white.opacity(0.5)))
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                        selectedTab = .cart
                        showTabBar = true
                    }) {
                        ZStack {
                            Image("cartblack")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 24, height: 24)
                                .foregroundColor(.black)
                            
                            if cartManager.items.count > 0 {
                                Text("\(cartManager.items.reduce(0) { $0 + $1.quantity })")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 16, height: 16)
                                    .background(Color.black)
                                    .clipShape(Circle())
                                    .offset(x: 10, y: -8)
                                    .scaleEffect(cartScale)
                            }
                        }
                        .padding()
                        .background(Circle().fill(Color.white.opacity(0.5)))
                    }
                }
                .padding(.top, 10) // Align with Dynamic Island
                .padding(.horizontal)
                
                Spacer()
            }
            .zIndex(1) // Ensure nav bar is above image
            
            // 3. Draggable Glassmorphic Bottom Sheet
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    // Draggable Handle Area (Larger touch target)
                    VStack(spacing: 8) {
                        Capsule()
                            .fill(Color.white.opacity(0.5))
                            .frame(width: 50, height: 5)
                        
                        Text("Swipe up for details")
                            .font(.custom("Montserrat-Regular", size: 11))
                            .foregroundColor(.white.opacity(0.5))
                            .opacity(isSheetExpanded ? 0 : 1)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 15)
                    .padding(.bottom, 20)
                    .contentShape(Rectangle()) // Make entire area tappable
                    
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 20) {
                            // Title & Price
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(product.title)
                                        .font(.custom("Montserrat-Bold", size: 24))
                                        .foregroundColor(.white)
                                    Text(product.brand)
                                        .font(.custom("Montserrat-Regular", size: 16))
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                Text("$\(Int(product.price))")
                                    .font(.custom("Montserrat-Bold", size: 24))
                                    .foregroundColor(.white)
                            }
                            
                            // Selectors (Size & Color)
                            HStack(spacing: 15) {
                                SelectorMenu(title: "Size", selection: $selectedSize, options: ["S", "M", "L", "XL"])
                                SelectorMenu(title: "Color", selection: $selectedColor, options: ["Black", "White", "Navy", "Beige"])
                            }
                            
                            // REAL-TIME STOCK CHECK UI
                            if isCheckingStock {
                                HStack {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    Text("Checking store availability...")
                                        .font(.custom("Montserrat-Regular", size: 14))
                                        .foregroundColor(.white.opacity(0.8))
                                }
                                .padding(.vertical, 5)
                            } else if !stockAvailability.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("NEARBY AVAILABILITY")
                                        .font(.custom("Montserrat-Bold", size: 12))
                                        .foregroundColor(.gray)
                                    
                                    ForEach(stockAvailability.prefix(3)) { store in
                                        HStack {
                                            VStack(alignment: .leading) {
                                                Text(store.storeName)
                                                    .font(.custom("Montserrat-SemiBold", size: 14))
                                                    .foregroundColor(.white)
                                                if let dist = store.distance {
                                                    Text(String(format: "%.1f miles away", dist))
                                                        .font(.custom("Montserrat-Regular", size: 12))
                                                        .foregroundColor(.gray)
                                                }
                                            }
                                            Spacer()
                                            
                                            if store.inStock {
                                                Text("IN STOCK")
                                                    .font(.custom("Montserrat-Bold", size: 12))
                                                    .foregroundColor(.black)
                                                    .padding(.horizontal, 8)
                                                    .padding(.vertical, 4)
                                                    .background(Color.green)
                                                    .cornerRadius(4)
                                            } else {
                                                Text("SOLD OUT")
                                                    .font(.custom("Montserrat-Bold", size: 12))
                                                    .foregroundColor(.white.opacity(0.5))
                                                    .padding(.horizontal, 8)
                                                    .padding(.vertical, 4)
                                                    .background(Color.white.opacity(0.1))
                                                    .cornerRadius(4)
                                            }
                                        }
                                        .padding()
                                        .background(Color.white.opacity(0.05))
                                        .cornerRadius(10)
                                    }
                                }
                            } else if let error = stockError {
                                Text("Stock Check Unavailable: \(error)")
                                    .font(.custom("Montserrat-Regular", size: 12))
                                    .foregroundColor(.red)
                            }
                            
                            // Add to Cart Button
                            Button(action: {
                                if product.inStock {
                                    cartManager.addToCart(product: product)
                                    let generator = UIImpactFeedbackGenerator(style: .medium)
                                    generator.impactOccurred()
                                    
                                    // Animate Badge
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.3)) {
                                        cartScale = 1.5
                                    }
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                        withAnimation {
                                            cartScale = 1.0
                                        }
                                    }
                                }
                            }) {
                                Text(product.inStock ? "Add to Cart" : "SOLD OUT")
                                    .font(.custom("Montserrat-SemiBold", size: 18))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 18)
                                    .glassEffect(in: RoundedRectangle(cornerRadius: 30))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 30)
                                            .stroke(Color.white.opacity(0.4), lineWidth: 1.5)
                                    )
                                    .background(
                                        RoundedRectangle(cornerRadius: 30)
                                            .fill(product.inStock ? Color.clear : Color.black.opacity(0.6))
                                    )
                                    .grayscale(product.inStock ? 0 : 1.0)
                                    .shadow(color: product.inStock ? Color.white.opacity(0.2) : Color.clear, radius: 20, x: 0, y: 8)
                                    .shadow(color: product.inStock ? Color.black.opacity(0.3) : Color.clear, radius: 15, x: 0, y: 5)
                            }
                            .disabled(!product.inStock)
                            .padding(.vertical, 10)
                            
                            Divider().background(Color.white.opacity(0.2))
                            
                            // Expandable Description
                            ExpandableSection(title: "Description", content: "Crafted from supple lambskin leather, this classic biker jacket by Saint Laurent features an asymmetrical zip front, epaulets on the shoulders, and multiple zip pockets. A timeless piece that exudes rebellious charm and luxury.\n\n- 100% Lambskin Leather", isExpanded: $isDescriptionExpanded)
                            
                            Divider().background(Color.white.opacity(0.2))
                            
                            // Expandable Ingredients
                            ExpandableSection(title: "Ingredients", content: "Water (Aqua), Glycerin, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Stearic Acid, Cetearyl Alcohol, Ceteareth-20, Cocos Nucifera (Coconut) Oil, Macadamia Ternifolia Seed Oil, Glyceryl Stearate, Tocopherol, Aloe Barbadensis Leaf Juice.", isExpanded: $isIngredientsExpanded)
                            
                            Spacer(minLength: 100)
                        }
                        .padding(25)
                    }
                }
                .glassEffect(in: RoundedRectangle(cornerRadius: 30))
                .frame(height: geometry.size.height * 0.85) // Sheet height
                .offset(y: isSheetExpanded ? geometry.size.height * 0.15 : geometry.size.height * 0.60) // Collapsed starts at 60%
                .offset(y: dragOffset)
                .highPriorityGesture(
                    DragGesture(minimumDistance: 10)
                        .onChanged { value in
                            // Only respond to vertical drags (not horizontal swipes)
                            let horizontalAmount = abs(value.translation.width)
                            let verticalAmount = abs(value.translation.height)
                            
                            // If drag is more horizontal than vertical, ignore it (allow swipe back)
                            guard verticalAmount > horizontalAmount else { return }
                            
                            let newOffset = value.translation.height
                            // Resistance when dragging up past expansion
                            if isSheetExpanded && newOffset < 0 {
                                dragOffset = newOffset / 3
                            } else {
                                dragOffset = newOffset
                            }
                        }
                        .onEnded { value in
                            // Only respond to vertical drags
                            let horizontalAmount = abs(value.translation.width)
                            let verticalAmount = abs(value.translation.height)
                            
                            guard verticalAmount > horizontalAmount else {
                                dragOffset = 0
                                return
                            }
                            
                            let threshold = geometry.size.height * 0.15
                            
                            if isSheetExpanded {
                                // If expanded, drag down to collapse
                                if value.translation.height > threshold {
                                    withAnimation(.spring()) {
                                        isSheetExpanded = false
                                        dragOffset = 0
                                    }
                                } else {
                                    withAnimation(.spring()) {
                                        dragOffset = 0
                                    }
                                }
                            } else {
                                // If collapsed, drag up to expand
                                if value.translation.height < -threshold {
                                    withAnimation(.spring()) {
                                        isSheetExpanded = true
                                        dragOffset = 0
                                    }
                                } else {
                                    withAnimation(.spring()) {
                                        dragOffset = 0
                                    }
                                }
                            }
                        }
                )
            }
            .edgesIgnoringSafeArea(.bottom)
            
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
        .background(SwipeBackHandler(presentationMode: presentationMode))
        .onAppear {
            DispatchQueue.main.async {
                showTabBar = false
                locationManager.requestLocationPermission()
            }
            
            // Trigger Stock Check
            checkInventory()
        }
        .onDisappear {
            DispatchQueue.main.async {
                showTabBar = true
            }
        }
        // Full Screen Image Overlay with Zoom and Swipe to Dismiss
        .overlay(
            Group {
                if showFullImage {
                    ZoomableImageViewer(
                        product: product,
                        isPresented: $showFullImage
                    )
                    .transition(.opacity)
                    .zIndex(2)
                }
            }
        )
    }
    
    private func checkInventory() {
        guard let zaraId = product.zaraProductId else { return }
        
        // Wait for location or use default NYC logic if unavailable for demo
        // Ideally checking locationManager.currentLocation
        
        isCheckingStock = true
        stockError = nil
        
        // Use user location OR default to NYC Times Square for demo
        let lat = locationManager.currentLocation?.coordinate.latitude ?? AppConfig.defaultLatitude
        let lng = locationManager.currentLocation?.coordinate.longitude ?? AppConfig.defaultLongitude
        
        Task {
            do {
                let stores = try await StockCheckService.shared.checkStock(
                    productId: product.id.uuidString,
                    zaraProductId: zaraId,
                    latitude: lat,
                    longitude: lng
                )
                
                await MainActor.run {
                    self.stockAvailability = stores
                    self.isCheckingStock = false
                }
            } catch {
                print("Stock check failed: \(error)")
                await MainActor.run {
                    self.stockError = "Could not verify stock"
                    self.isCheckingStock = false
                }
            }
        }
    }
}

// MARK: - Subcomponents

struct SelectorMenu: View {
    let title: String
    @Binding var selection: String
    let options: [String]
    
    var body: some View {
        Menu {
            ForEach(options, id: \.self) { option in
                Button(action: { selection = option }) {
                    HStack {
                        Text(option)
                        if selection == option {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack {
                Text("\(title): \(selection)")
                    .font(.custom("Montserrat-Medium", size: 14))
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.caption)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
        .glassEffect(in: RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.3), lineWidth: 1)
        )
    }
}

struct ExpandableSection: View {
    let title: String
    let content: String
    @Binding var isExpanded: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button(action: {
                withAnimation {
                    isExpanded.toggle()
                }
            }) {
                HStack {
                    Text(title)
                        .font(.custom("Montserrat-Bold", size: 16))
                        .foregroundColor(.white)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.white)
                }
            }
            
            if isExpanded {
                Text(content)
                    .font(.custom("Montserrat-Regular", size: 14))
                    .foregroundColor(.gray)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true) // Allow text to wrap
            }
        }
    }
}

// Helper for rounded corners
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}

// Swipe Back Handler for Product Detail View
struct SwipeBackHandler: UIViewControllerRepresentable {
    @Binding var presentationMode: PresentationMode
    
    init(presentationMode: Binding<PresentationMode>) {
        self._presentationMode = presentationMode
    }
    
    func makeUIViewController(context: Context) -> SwipeBackViewController {
        let controller = SwipeBackViewController()
        controller.presentationMode = _presentationMode
        return controller
    }
    
    func updateUIViewController(_ uiViewController: SwipeBackViewController, context: Context) {
        uiViewController.enableEdgeSwipe()
    }
    
    class SwipeBackViewController: UIViewController {
        var presentationMode: Binding<PresentationMode>?
        
        override func viewDidLoad() {
            super.viewDidLoad()
            view.backgroundColor = .clear
        }
        
        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            enableEdgeSwipe()
        }
        
        func enableEdgeSwipe() {
            guard let navController = navigationController else { return }
            navController.interactivePopGestureRecognizer?.isEnabled = true
            navController.interactivePopGestureRecognizer?.delegate = nil
        }
    }
}

// MARK: - Zoomable Image Viewer
struct ZoomableImageViewer: View {
    let product: Product
    @Binding var isPresented: Bool
    
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var dismissDragOffset: CGSize = .zero
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
                .opacity(Double(1.0 - min(sqrt(pow(dismissDragOffset.width / 500.0, 2) + pow(dismissDragOffset.height / 500.0, 2)), 1.0)))
            
            // Image
            Group {
                // Remote or Local Image
                if product.isRemoteImage, let urlString = product.imageURL, let url = URL(string: urlString) {
                    CachedAsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        ProgressView()
                    }
                } else if product.imageName.contains(".fill") || product.imageName == "tshirt" || product.imageName == "bag" {
                    Image(systemName: product.imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .foregroundColor(.white)
                } else {
                    Image(product.imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                }
            }
            .scaleEffect(scale)
            .offset(x: offset.width + dismissDragOffset.width, y: offset.height + dismissDragOffset.height)
            .gesture(
                MagnificationGesture()
                    .onChanged { value in
                        let delta = value / lastScale
                        lastScale = value
                        let newScale = scale * delta
                        // Clamp between 1x and 4x
                        scale = min(max(newScale, 1.0), 4.0)
                    }
                    .onEnded { _ in
                        lastScale = 1.0
                        // Snap back to 1x if user tried to zoom out below 1x
                        if scale <= 1.0 {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                scale = 1.0
                                offset = .zero
                                lastOffset = .zero
                            }
                        }
                    }
            )
            .simultaneousGesture(
                DragGesture()
                    .onChanged { value in
                        if scale > 1.0 {
                            // Pan when zoomed in
                            offset = CGSize(
                                width: lastOffset.width + value.translation.width,
                                height: lastOffset.height + value.translation.height
                            )
                        } else {
                            // Swipe to dismiss in any direction when not zoomed
                            dismissDragOffset = value.translation
                        }
                    }
                    .onEnded { value in
                        if scale > 1.0 {
                            lastOffset = offset
                        } else {
                            // Dismiss if swiped in any direction enough
                            let horizontalDrag = abs(value.translation.width)
                            let verticalDrag = abs(value.translation.height)
                            let totalDrag = sqrt(pow(horizontalDrag, 2) + pow(verticalDrag, 2))
                            
                            if totalDrag > 150 {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                    isPresented = false
                                }
                            } else {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                    dismissDragOffset = .zero
                                }
                            }
                        }
                    }
            )
            .onTapGesture(count: 2) {
                // Double tap to zoom
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    if scale > 1.0 {
                        scale = 1.0
                        offset = .zero
                        lastOffset = .zero
                    } else {
                        scale = 2.0
                    }
                }
            }
            
            // Close button
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            isPresented = false
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.largeTitle)
                            .foregroundColor(.white)
                            .padding()
                    }
                }
                Spacer()
            }
            .opacity(scale == 1.0 ? 1.0 : 0.3)
        }
        .onAppear {
            scale = 1.0
            offset = .zero
            lastOffset = .zero
            dismissDragOffset = .zero
        }
    }
}
