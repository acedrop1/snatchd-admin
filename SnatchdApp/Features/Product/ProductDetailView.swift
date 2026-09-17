import SwiftUI

struct ProductDetailView: View {
    let product: Product
    @Binding var showTabBar: Bool
    @Binding var selectedTab: AppTab
    let onDismiss: () -> Void
    @EnvironmentObject var cartManager: CartManager
    @Environment(\.dismiss) private var navDismiss   // pops NavigationLink or closes overlay

    // Animation State
    @State private var cartScale: CGFloat = 1.0
    @State private var showCart = false

    // Expandable sections state
    @State private var isDescriptionExpanded = true

    // Interaction State
    @State private var showFullImage = false
    @State private var selectedSize: String = ""
    @State private var selectedStyle: String = ""
    @State private var currentImageIndex: Int = 0
    @State private var scrollPositionId: Int? = 0

    // Bottom Sheet State
    @State private var dragOffset: CGFloat = 0
    @State private var isSheetExpanded = false

    // Availability — per size, from the backend (AvailabilityService). "unknown"
    // is a real state: the Snatcher confirms in store before the card is captured.
    @State private var isCheckingStock = false
    @State private var availability: ProductAvailability?
    @State private var stockError: String?

    private var unavailableSizes: Set<String> { availability?.unavailableSizes ?? product.unavailableSizes }
    private var selectedSizeUnavailable: Bool { !selectedSize.isEmpty && unavailableSizes.contains(selectedSize) }
    /// Only a known sold-out blocks the order. Unconfirmed is orderable — the
    /// Snatcher checks the rack before the card is captured.
    private var needsSize: Bool { !product.sizes.isEmpty && selectedSize.isEmpty }
    private var canAddToCart: Bool { product.inStock && !selectedSizeUnavailable && !needsSize }
    private var buttonLabel: String {
        if !product.inStock || selectedSizeUnavailable { return "Sold Out" }
        return needsSize ? "Choose a Size" : "Add to Cart"
    }

    // All images for this product — used in both the detail carousel and the full-screen viewer
    private var allProductImages: [String] {
        product.images.isEmpty
            ? (product.imageURL.map { [$0] } ?? [])
            : product.images
    }

    // Constants
    private let collapsedHeight: CGFloat = 300
    private let expandedOffset: CGFloat = 0

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.ignoresSafeArea() // fills behind status bar / dynamic island
            // 1. Background Image Area — carousel if multiple images, single if one
            GeometryReader { geometry in
                let imageHeight = geometry.size.height * 0.65
                let allImages = allProductImages

                ZStack(alignment: .bottom) {
                    if allImages.count > 1 {
                        // ── Multi-image vertical scroll carousel (SSENSE style) ──
                        ScrollView(.vertical, showsIndicators: false) {
                            LazyVStack(spacing: 0) {
                                ForEach(Array(allImages.enumerated()), id: \.offset) { idx, urlString in
                                    if let url = URL(string: urlString) {
                                        CachedAsyncImage(url: url) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                                .frame(width: geometry.size.width, height: imageHeight)
                                                .clipped()
                                        } placeholder: {
                                            Rectangle()
                                                .fill(Color.black.opacity(0.3))
                                                .frame(width: geometry.size.width, height: imageHeight)
                                                .overlay(ProgressView().tint(.white))
                                        }
                                        .id(idx)
                                    }
                                }
                            }
                            .scrollTargetLayout()
                        }
                        .scrollTargetBehavior(.paging)
                        .frame(width: geometry.size.width, height: imageHeight)
                        .scrollPosition(id: $scrollPositionId)
                        .onChange(of: scrollPositionId) { _, newId in
                            currentImageIndex = newId ?? 0
                        }
                        .overlay(alignment: .trailing) {
                            // Vertical bar indicators — right edge, SSENSE style
                            // Dark fill + white shadow so bars are visible on both light and dark product images
                            VStack(spacing: 5) {
                                ForEach(0..<allImages.count, id: \.self) { idx in
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(idx == currentImageIndex ? Color(white: 0.1) : Color(white: 0.35).opacity(0.85))
                                        .frame(width: 3, height: idx == currentImageIndex ? 22 : 14)
                                        .shadow(color: .white.opacity(0.6), radius: 2, x: 0, y: 0)
                                        .animation(.spring(response: 0.25), value: currentImageIndex)
                                }
                            }
                            .padding(.trailing, 12)
                        }

                    } else if let urlString = allImages.first, let url = URL(string: urlString) {
                        // ── Single remote image ───────────────────────────────
                        CachedAsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: geometry.size.width, height: imageHeight)
                                .clipped()
                        } placeholder: {
                            Rectangle()
                                .fill(Color.black.opacity(0.3))
                                .frame(width: geometry.size.width, height: imageHeight)
                                .overlay(ProgressView().tint(.white))
                        }

                    } else if product.imageName.contains(".fill") || product.imageName == "tshirt" || product.imageName == "bag" {
                        // ── System image fallback ─────────────────────────────
                        Image(systemName: product.imageName)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .padding(40)
                            .frame(width: geometry.size.width, height: imageHeight)
                            .background(Color(red: 248/255, green: 245/255, blue: 240/255))
                            .foregroundColor(.black.opacity(0.8))

                    } else {
                        // ── Local asset fallback ──────────────────────────────
                        Image(product.imageName)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: geometry.size.width, height: imageHeight)
                            .clipped()
                    }
                }
            }
            .ignoresSafeArea()
            .simultaneousGesture(
                TapGesture()
                    .onEnded { _ in
                        withAnimation { showFullImage = true }
                    }
            )
            // Note: no full-screen drag gesture here — vertical scroll owns vertical swipes.
            // Dismiss is handled by the left-edge swipe gesture on the ZStack below.

            // 2. Back Button (Top Left) — navDismiss() pops navigation; onDismiss() covers overlay fallback
            Button(action: { navDismiss(); onDismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 20)
            .padding(.leading, 16)
            .zIndex(1)

            // 3. Cart Button (Top Right)
            Button(action: {
                navDismiss(); onDismiss()
                selectedTab = .cart
                showTabBar = true
            }) {
                ZStack(alignment: .topTrailing) {
                    Image("cart")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 22, height: 22)
                        .frame(width: 44, height: 44)
                        .glassEffect(.regular.interactive(), in: .circle)

                    if cartManager.items.reduce(0, { $0 + $1.quantity }) > 0 {
                        Text("\(cartManager.items.reduce(0) { $0 + $1.quantity })")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.black)
                            .frame(width: 16, height: 16)
                            .background(Color.white)
                            .clipShape(Circle())
                            .offset(x: 3, y: -3)
                            .scaleEffect(cartScale)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.top, 20)
            .padding(.trailing, 16)
            .zIndex(1)

            // 4. Draggable Glassmorphic Bottom Sheet
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    // Draggable Handle Area — gesture lives HERE only, not on the whole sheet.
                    // This lets native NavigationStack swipe-back work anywhere on the card.
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
                    .contentShape(Rectangle())
                    .highPriorityGesture(
                        DragGesture(minimumDistance: 10)
                            .onChanged { value in
                                let horizontalAmount = abs(value.translation.width)
                                let verticalAmount = abs(value.translation.height)
                                guard verticalAmount > horizontalAmount else { return }
                                let newOffset = value.translation.height
                                if isSheetExpanded && newOffset < 0 {
                                    dragOffset = newOffset / 3
                                } else {
                                    dragOffset = newOffset
                                }
                            }
                            .onEnded { value in
                                let horizontalAmount = abs(value.translation.width)
                                let verticalAmount = abs(value.translation.height)
                                guard verticalAmount > horizontalAmount else {
                                    dragOffset = 0; return
                                }
                                let threshold = geometry.size.height * 0.15
                                if isSheetExpanded {
                                    if value.translation.height > threshold {
                                        withAnimation(.spring()) { isSheetExpanded = false; dragOffset = 0 }
                                    } else {
                                        withAnimation(.spring()) { dragOffset = 0 }
                                    }
                                } else {
                                    if value.translation.height < -threshold {
                                        withAnimation(.spring()) { isSheetExpanded = true; dragOffset = 0 }
                                    } else {
                                        withAnimation(.spring()) { dragOffset = 0 }
                                    }
                                }
                            }
                    )
                    
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
                            
                            // Size Selector — only shown when the product has known sizes
                            if !product.sizes.isEmpty {
                                SelectorMenu(title: "Size", selection: $selectedSize, options: product.sizes, unavailable: unavailableSizes)
                                    .frame(maxWidth: .infinity)
                            }

                            // Styles — selectable colour / style chips
                            if !product.styles.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack {
                                        Text("STYLE")
                                            .font(.custom("Montserrat-Bold", size: 11))
                                            .foregroundColor(.gray)
                                            .tracking(1.2)
                                        if !selectedStyle.isEmpty {
                                            Text("· \(selectedStyle)")
                                                .font(.custom("Montserrat-SemiBold", size: 11))
                                                .foregroundColor(.white)
                                        }
                                    }
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 8) {
                                            ForEach(product.styles, id: \.self) { style in
                                                let isSelected = selectedStyle == style
                                                Button(action: {
                                                    withAnimation(.spring(response: 0.2)) {
                                                        selectedStyle = isSelected ? "" : style
                                                    }
                                                }) {
                                                    Text(style)
                                                        .font(.custom("Montserrat-SemiBold", size: 13))
                                                        .foregroundColor(isSelected ? .black : .white)
                                                        .padding(.horizontal, 14)
                                                        .padding(.vertical, 8)
                                                        .background(isSelected ? Color.white : Color.white.opacity(0.1))
                                                        .overlay(
                                                            RoundedRectangle(cornerRadius: 20)
                                                                .stroke(isSelected ? Color.white : Color.white.opacity(0.25), lineWidth: 1)
                                                        )
                                                        .cornerRadius(20)
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // AVAILABILITY — what the backend knows, and what the Snatcher confirms
                            AvailabilityRow(isChecking: isCheckingStock, availability: availability, error: stockError, size: selectedSize)

                            // Add to Cart Button
                            Button(action: {
                                if canAddToCart {
                                    cartManager.addToCart(product: product, size: selectedSize)
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
                                let buttonText: String = buttonLabel
                                let backgroundColor: Color = canAddToCart ? Color.clear : Color.black.opacity(0.6)
                                let grayscaleAmount: Double = canAddToCart ? 0 : 1.0
                                let topShadowColor: Color = canAddToCart ? Color.white.opacity(0.2) : Color.clear
                                let bottomShadowColor: Color = canAddToCart ? Color.black.opacity(0.3) : Color.clear

                                Text(buttonText)
                                    .font(.custom("Montserrat-SemiBold", size: 18))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 18)
                                    .glassEffect(.regular.interactive(), in: .rect(corners: .concentric(minimum: .fixed(20))))
                                    .overlay(
                                        ConcentricRectangle(corners: .concentric(minimum: .fixed(20)), isUniform: true)
                                            .stroke(Color.white.opacity(0.4), lineWidth: 1.5)
                                    )
                                    .background(
                                        ConcentricRectangle(corners: .concentric(minimum: .fixed(20)), isUniform: true)
                                            .fill(backgroundColor)
                                    )
                                    .grayscale(grayscaleAmount)
                                    .shadow(color: topShadowColor, radius: 20, x: 0, y: 8)
                                    .shadow(color: bottomShadowColor, radius: 15, x: 0, y: 5)
                            }
                            .disabled(!canAddToCart)
                            .padding(.vertical, 10)
                            
                            Divider().background(Color.white.opacity(0.2))

                            // Expandable Description — uses real product description from Firestore
                            if !product.description.isEmpty {
                                ExpandableSection(title: "Description", content: product.description, isExpanded: $isDescriptionExpanded)
                                Divider().background(Color.white.opacity(0.2))
                            }
                            
                            Spacer(minLength: 100)
                        }
                        .padding(25)
                    }
                }
                .containerShape(.rect(cornerRadius: 30))
                .background(
                    RoundedRectangle(cornerRadius: 30)
                        .fill(Color.black.opacity(0.72))
                )
                .background(
                    RoundedRectangle(cornerRadius: 30)
                        .fill(.ultraThinMaterial)
                )
                .frame(height: geometry.size.height * 1.05) // Overshoot so bottom never shows a gap
                .offset(y: isSheetExpanded ? geometry.size.height * 0.10 : geometry.size.height * 0.54) // Collapsed starts at 54%
                .offset(y: dragOffset)
                .highPriorityGesture(
                    DragGesture(minimumDistance: 10)
                        .onChanged { value in
                            let h = abs(value.translation.width)
                            let v = abs(value.translation.height)
                            guard v > h else { return }
                            dragOffset = (isSheetExpanded && value.translation.height < 0)
                                ? value.translation.height / 3
                                : value.translation.height
                        }
                        .onEnded { value in
                            let h = abs(value.translation.width)
                            let v = abs(value.translation.height)
                            guard v > h else { dragOffset = 0; return }
                            let threshold = geometry.size.height * 0.15
                            if isSheetExpanded {
                                if value.translation.height > threshold {
                                    withAnimation(.spring()) { isSheetExpanded = false; dragOffset = 0 }
                                } else {
                                    withAnimation(.spring()) { dragOffset = 0 }
                                }
                            } else {
                                if value.translation.height < -threshold {
                                    withAnimation(.spring()) { isSheetExpanded = true; dragOffset = 0 }
                                } else {
                                    withAnimation(.spring()) { dragOffset = 0 }
                                }
                            }
                        }
                )
            }
            .edgesIgnoringSafeArea(.bottom)

        }
        .fullScreenSwipeBack()
        .navigationBarHidden(true)
        .toolbar(.hidden, for: .tabBar)
        .onAppear {
            DispatchQueue.main.async { showTabBar = false }
            // Pre-select the first size the backend hasn't already ruled out
            if selectedSize.isEmpty {
                selectedSize = product.sizes.first { !unavailableSizes.contains($0) } ?? product.sizes.first ?? ""
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
                        allImages: allProductImages,
                        initialIndex: currentImageIndex,
                        isPresented: $showFullImage
                    )
                    .transition(.opacity)
                    .zIndex(2)
                }
            }
        )
    }
    
    private func checkInventory() {
        guard !product.id.isEmpty else { return }
        isCheckingStock = true
        stockError = nil
        Task {
            do {
                let result = try await AvailabilityService.shared.check(productId: product.id)
                await MainActor.run {
                    availability = result
                    isCheckingStock = false
                    // The pre-selected size may have just turned out to be gone
                    if result.unavailableSizes.contains(selectedSize) {
                        selectedSize = product.sizes.first { !result.unavailableSizes.contains($0) } ?? selectedSize
                    }
                }
            } catch {
                await MainActor.run {
                    stockError = "Couldn't reach inventory"
                    isCheckingStock = false
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
    var unavailable: Set<String> = []

    var body: some View {
        Menu {
            ForEach(options, id: \.self) { option in
                Button(action: { selection = option }) {
                    HStack {
                        Text(unavailable.contains(option) ? "\(option) — Sold out" : option)
                        if selection == option {
                            Image(systemName: "checkmark")
                        }
                    }
                }
                .disabled(unavailable.contains(option))
            }
        } label: {
            HStack {
                Text(selection.isEmpty ? title : "\(title): \(selection)")
                    .font(.custom("Montserrat-Medium", size: 14))
                    .foregroundColor(.white)
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            // Manual styling — avoids the black flash that glassEffect causes on Menu labels
            .background(
                ConcentricRectangle(corners: .concentric(minimum: .fixed(14)), isUniform: true)
                    .fill(Color.white.opacity(0.08))
            )
            .overlay(
                ConcentricRectangle(corners: .concentric(minimum: .fixed(14)), isUniform: true)
                    .stroke(Color.white.opacity(0.25), lineWidth: 1)
            )
        }
        .menuOrder(.fixed)
    }
}

/// One honest line about stock. Green = the source says this size is there;
/// grey = nobody has checked yet. Either way the Snatcher confirms before capture.
struct AvailabilityRow: View {
    let isChecking: Bool
    let availability: ProductAvailability?
    let error: String?
    let size: String

    private var state: String {
        guard let a = availability else { return "unknown" }
        if !size.isEmpty, let s = a.sizes[size] { return s }
        return a.state
    }
    private var storeName: String { availability?.store?.name ?? "the store" }
    private var checkedAgo: String {
        guard let d = availability?.checkedDate else { return "" }
        let m = Int(Date().timeIntervalSince(d) / 60)
        return m < 1 ? "just now" : m < 60 ? "\(m)m ago" : "\(m / 60)h ago"
    }
    private var title: String {
        switch state {
        case "in_stock":     return size.isEmpty ? "In stock at \(storeName)" : "Size \(size) \(availability?.source == "bergdorf" || availability?.source == "zara" ? "on the floor" : "in stock") at \(storeName)"
        case "out_of_stock": return size.isEmpty ? "Sold out at \(storeName)" : "Size \(size) sold out at \(storeName)"
        default:             return "Availability unconfirmed"
        }
    }
    private var subtitle: String {
        switch state {
        case "in_stock", "out_of_stock":
            switch availability?.source {
            case "bergdorf": return "Bergdorf's own in-store count · \(checkedAgo)"
            case "zara":     return "Zara's own count at this store · \(checkedAgo)"
            case "zara_online": return "zara.com online stock · \(checkedAgo) · Snatcher confirms in store"
            case "skims":    return "skims.com online stock · \(checkedAgo) · Snatcher confirms in store"
            case "shopify":  return "Brand's online stock · \(checkedAgo) · Snatcher confirms in store"
            default:         return "Checked \(checkedAgo) · Snatcher confirms before you're charged"
            }
        default:
            return "A Snatcher checks the rack before you're charged"
        }
    }

    var body: some View {
        HStack(spacing: 10) {
            if isChecking {
                ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                Text("Checking \(storeName)…")
                    .font(.custom("Montserrat-SemiBold", size: 13))
                    .foregroundColor(.white.opacity(0.8))
            } else {
                Circle()
                    .fill(state == "in_stock" ? Color.green : state == "out_of_stock" ? Color.red.opacity(0.8) : Color.gray)
                    .frame(width: 8, height: 8)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.custom("Montserrat-SemiBold", size: 13))
                        .foregroundColor(.white)
                    Text(subtitle)
                        .font(.custom("Montserrat-Regular", size: 12))
                        .foregroundColor(.gray)
                }
            }
            Spacer()
        }
        .padding(14)
        .background(Color.white.opacity(0.05))
        .clipShape(ConcentricRectangle(corners: .concentric(minimum: .fixed(12)), isUniform: true))
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

// MARK: - Full-Screen Gallery Viewer
// Vertical-paging gallery identical in feel to the product detail image area.
// Each image is independently pinch-zoomable. Left-edge drag closes.
struct ZoomableImageViewer: View {
    let allImages: [String]
    let initialIndex: Int
    @Binding var isPresented: Bool

    @State private var scrollPositionId: Int?
    @State private var currentIndex: Int = 0
    @State private var isAnyImageZoomed: Bool = false

    // Nike-style swipe-to-close — @State so we can fly off-screen before dismissing
    @State private var closeOffset: CGFloat = 0

    init(allImages: [String], initialIndex: Int, isPresented: Binding<Bool>) {
        self.allImages = allImages
        self.initialIndex = initialIndex
        self._isPresented = isPresented
        self._scrollPositionId = State(initialValue: initialIndex)
        self._currentIndex = State(initialValue: initialIndex)
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // ── Vertical paging scroll through all images ──────────────────
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 0) {
                    ForEach(Array(allImages.enumerated()), id: \.offset) { idx, urlString in
                        ZoomableImagePage(
                            urlString: urlString,
                            isAnyImageZoomed: $isAnyImageZoomed
                        )
                        .frame(
                            width: UIScreen.main.bounds.width,
                            height: UIScreen.main.bounds.height
                        )
                        .id(idx)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollDisabled(isAnyImageZoomed)            // lock scroll while zoomed
            .scrollPosition(id: $scrollPositionId)
            .onChange(of: scrollPositionId) { _, newId in
                currentIndex = newId ?? 0
            }
            .ignoresSafeArea()

            // ── Right-side bar indicators (same style as detail view) ──────
            if allImages.count > 1 {
                VStack(spacing: 5) {
                    ForEach(0..<allImages.count, id: \.self) { idx in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(idx == currentIndex ? Color(white: 0.1) : Color(white: 0.35).opacity(0.85))
                            .frame(width: 3, height: idx == currentIndex ? 22 : 14)
                            .shadow(color: .white.opacity(0.6), radius: 2, x: 0, y: 0)
                            .animation(.spring(response: 0.25), value: currentIndex)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
                .padding(.trailing, 12)
                .allowsHitTesting(false)
            }

            // ── Close button top-right ─────────────────────────────────────
            VStack {
                HStack {
                    Spacer()
                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(Circle().fill(Color.black.opacity(0.55)))
                            .overlay(Circle().stroke(Color.white.opacity(0.15), lineWidth: 1))
                    }
                    .padding(.top, 56)
                    .padding(.trailing, 20)
                }
                Spacer()
            }

            // ── Swipe-to-close hotzone (Nike-style, 120pt) ────────────────
            HStack {
                Color.clear
                    .frame(width: 120)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 8)
                            .onChanged { value in
                                guard !isAnyImageZoomed else { return }
                                guard value.translation.width > 0 else { return }
                                guard abs(value.translation.width) > abs(value.translation.height) * 0.6 else { return }
                                closeOffset = value.translation.width
                            }
                            .onEnded { value in
                                guard !isAnyImageZoomed else { return }
                                guard value.translation.width > 0 else { return }
                                guard abs(value.translation.width) > abs(value.translation.height) * 0.6 else { return }
                                let screenWidth = UIScreen.main.bounds.width
                                let fast = value.predictedEndTranslation.width > 140
                                let far  = value.translation.width > 55
                                if fast || far {
                                    withAnimation(.easeOut(duration: 0.22)) {
                                        closeOffset = screenWidth
                                    }
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                                        isPresented = false
                                    }
                                } else {
                                    withAnimation(.interactiveSpring(response: 0.32, dampingFraction: 0.78)) {
                                        closeOffset = 0
                                    }
                                }
                            }
                    )
                Spacer()
            }
            .frame(maxHeight: .infinity)
            .zIndex(10)
        }
        .offset(x: closeOffset, y: 0)
    }
}

// MARK: - Single Zoomable Page (used inside ZoomableImageViewer)
struct ZoomableImagePage: View {
    let urlString: String
    @Binding var isAnyImageZoomed: Bool

    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0

    var body: some View {
        GeometryReader { geo in
            if let url = URL(string: urlString) {
                CachedAsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: geo.size.width, height: geo.size.height)
                } placeholder: {
                    Rectangle()
                        .fill(Color.black)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .overlay(ProgressView().tint(.white))
                }
            } else {
                Color.black.frame(width: geo.size.width, height: geo.size.height)
            }
        }
        .scaleEffect(scale)
        // Pinch to zoom — NO DragGesture here so the parent ScrollView can scroll freely
        .gesture(
            MagnificationGesture()
                .onChanged { value in
                    let delta = value / lastScale
                    lastScale = value
                    scale = min(max(scale * delta, 1.0), 5.0)
                    isAnyImageZoomed = scale > 1.02
                }
                .onEnded { _ in
                    lastScale = 1.0
                    if scale < 1.02 {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            scale = 1.0
                        }
                    }
                    isAnyImageZoomed = scale > 1.02
                }
        )
        // Double-tap toggles 2.5× zoom
        .onTapGesture(count: 2) {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                if scale > 1.02 {
                    scale = 1.0
                    isAnyImageZoomed = false
                } else {
                    scale = 2.5
                    isAnyImageZoomed = true
                }
            }
        }
    }
}
