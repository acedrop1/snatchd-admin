import SwiftUI

struct CheckoutView: View {
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var cartManager: CartManager
    @EnvironmentObject var addressManager: AddressManager
    
    @State private var isPlacingOrder = false
    @State private var showTracking = false
    
    // Selection State
    @State private var selectedDeliveryOption = "Standard"
    @State private var showAddressSheet = false
    @State private var showPaymentSheet = false
    @State private var isOrderSummaryExpanded = false
    @State private var showSchedulePicker = false
    @State private var scheduledDate = Date()
    
    @State private var selectedAddress: SavedAddress?
    
    // Initialize selectedAddress from manager if possible
    private func loadDefaultAddress() {
        if selectedAddress == nil {
            selectedAddress = addressManager.addresses.first(where: { $0.isDefault }) ?? addressManager.addresses.first
        }
    }
    
    @State private var paymentMethods = [
        PaymentMethod(id: UUID(), cardNumber: "5002", cardholderName: "John Doe", expirationMonth: 12, expirationYear: 2025, cardType: .amex, isDefault: true),
        PaymentMethod(id: UUID(), cardNumber: "4242", cardholderName: "John Doe", expirationMonth: 8, expirationYear: 2026, cardType: .visa, isDefault: false),
        PaymentMethod(id: UUID(), cardNumber: "0000", cardholderName: "Apple Pay", expirationMonth: 1, expirationYear: 2099, cardType: .unknown, isDefault: false)
    ]
    @State private var selectedPayment: PaymentMethod?
    
    // Constants
    let deliveryFee: Double = 6.00
    let taxRate: Double = 0.08875
    
    var taxAmount: Double {
        cartManager.total * taxRate
    }
    
    var totalAmount: Double {
        cartManager.total + deliveryFee + taxAmount
    }
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 25) {
                        // Delivery Address
                        deliveryAddressSection
                        
                        // Delivery Time
                        deliveryTimeSection
                        
                        // Order Summary
                        orderSummarySection
                        
                        // Payment
                        paymentSection
                        
                        // Spacer for fixed button
                        Color.clear.frame(height: 100)
                    }
                    .padding()
                }
                
                // Fixed Bottom Button with Liquid Glass
                VStack {
                    Button(action: placeOrder) {
                        HStack {
                            if isPlacingOrder {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Place Order")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.black)
                        .overlay(
                            RoundedRectangle(cornerRadius: 25)
                                .stroke(Color.white.opacity(0.3), lineWidth: 1)
                        )
                        .cornerRadius(25)
                    }
                    .disabled(isPlacingOrder)
                }
                .padding()
                .background(
                    VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                )
                .background(Color.black.opacity(0.8))
                .cornerRadius(30, corners: [.topLeft, .topRight])
            }
        }
        .fullScreenCover(isPresented: $showTracking) {
            TrackingView()
        }
        .sheet(isPresented: $showAddressSheet) {
            AddressSelectionView(selectedAddress: $selectedAddress)
        }
        .sheet(isPresented: $showPaymentSheet) {
            PaymentSelectionView(paymentMethods: $paymentMethods, selectedPayment: $selectedPayment)
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
        .onAppear(perform: loadDefaultAddress)
    }
    
    func placeOrder() {
        isPlacingOrder = true
        
        // Simulate network request
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            isPlacingOrder = false
            cartManager.clearCart()
            showTracking = true
        }
    }
    
    func generateTimeSlots() -> [Date] {
        let calendar = Calendar.current
        let now = Date()
        let currentHour = calendar.component(.hour, from: now)
        
        var timeSlots: [Date] = []
        
        // Generate hourly slots from current hour + 1 to end of day (11 PM)
        for hour in (currentHour + 1)...23 {
            if let timeSlot = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: now) {
                timeSlots.append(timeSlot)
            }
        }
        
        return timeSlots
    }
    
    func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
    
    // MARK: - Subviews
    
    private var headerView: some View {
        HStack {
            Button(action: { presentationMode.wrappedValue.dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.title2)
                    .foregroundColor(.white)
            }
            Spacer()
            Text("Checkout")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Spacer()
            Image(systemName: "chevron.left")
                .font(.title2)
                .foregroundColor(.clear)
        }
        .padding()
        .background(Color.black)
    }
    
    private var deliveryAddressSection: some View {
        Button(action: { showAddressSheet = true }) {
            VStack(alignment: .leading, spacing: 15) {
                HStack {
                    Text("Delivery Address")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                    Text("Change")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                
                HStack {
                    Image(systemName: "mappin.and.ellipse")
                        .foregroundColor(.white)
                    
                    if let address = selectedAddress {
                        VStack(alignment: .leading) {
                            Text(address.street)
                                .foregroundColor(.white)
                            Text(address.address) // Computed property for full string
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    } else {
                        Text("Select an Address")
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    // Only show chevron if there are addresses or to prompt adding one
                    Image(systemName: "chevron.right")
                        .foregroundColor(.gray)
                }
                .padding()
                .background(Color.white.opacity(0.05))
                .cornerRadius(15)
                .overlay(
                    RoundedRectangle(cornerRadius: 15)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
            }
        }
    }
    
    private var deliveryTimeSection: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Delivery time")
                    .font(.headline)
                    .foregroundColor(.white)
            
            DeliveryOptionRow(title: "Standard", detail: "60-90 min", isSelected: selectedDeliveryOption == "Standard")
                .onTapGesture { 
                    selectedDeliveryOption = "Standard"
                    showSchedulePicker = false
                }
            
            DeliveryOptionRow(title: "Priority", detail: "30-60 min", price: "+$6.99", isSelected: selectedDeliveryOption == "Priority")
                .onTapGesture { 
                    selectedDeliveryOption = "Priority"
                    showSchedulePicker = false
                }
            
            VStack(spacing: 0) {
                DeliveryOptionRow(title: "Schedule", detail: selectedDeliveryOption == "Schedule" ? formatTime(scheduledDate) : "Choose a time", isSelected: selectedDeliveryOption == "Schedule")
                    .onTapGesture { 
                        selectedDeliveryOption = "Schedule"
                        withAnimation {
                            showSchedulePicker.toggle()
                        }
                    }
                
                if showSchedulePicker && selectedDeliveryOption == "Schedule" {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Select Time")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(.horizontal)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(generateTimeSlots(), id: \.self) { timeSlot in
                                    Button(action: {
                                        scheduledDate = timeSlot
                                    }) {
                                        Text(formatTime(timeSlot))
                                            .font(.subheadline)
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 20)
                                            .padding(.vertical, 12)
                                            .background(
                                                Calendar.current.isDate(scheduledDate, equalTo: timeSlot, toGranularity: .hour) 
                                                    ? Color.white.opacity(0.2) 
                                                    : Color.white.opacity(0.05)
                                            )
                                            .cornerRadius(10)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 10)
                                                    .stroke(
                                                        Calendar.current.isDate(scheduledDate, equalTo: timeSlot, toGranularity: .hour) 
                                                            ? Color.white 
                                                            : Color.white.opacity(0.1), 
                                                        lineWidth: 1
                                                    )
                                            )
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(15)
                    .transition(.opacity)
                }
            }
        }
    }
    
    private var orderSummarySection: some View {
        VStack(alignment: .leading, spacing: 15) {
            Text("Order summary")
                .font(.headline)
                .foregroundColor(.white)
            
            // Header / Toggle
            Button(action: { withAnimation { isOrderSummaryExpanded.toggle() } }) {
                HStack {
                    Image(systemName: "bag.fill")
                        .resizable()
                        .frame(width: 20, height: 20)
                        .foregroundColor(.white)
                        .padding(8)
                        .background(Circle().fill(Color.white.opacity(0.1)))
                    
                    VStack(alignment: .leading) {
                        Text("Snatchd Order")
                            .foregroundColor(.white)
                            .fontWeight(.medium)
                        Text("\(cartManager.items.reduce(0) { $0 + $1.quantity }) items")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    Spacer()
                    Image(systemName: "chevron.down")
                        .foregroundColor(.white)
                        .rotationEffect(Angle(degrees: isOrderSummaryExpanded ? 180 : 0))
                }
                .padding()
                .background(Color.white.opacity(0.05))
                .cornerRadius(15)
            }
            
            if isOrderSummaryExpanded {
                VStack(spacing: 15) {
                    ForEach(cartManager.items) { item in
                        HStack {
                            Text("\(item.quantity)x")
                                .font(.caption)
                                .foregroundColor(.gray)
                                .frame(width: 30, alignment: .leading)
                            Text(item.product.title)
                                .font(.subheadline)
                                .foregroundColor(.white)
                                .lineLimit(1)
                            Spacer()
                            Text("$\(Int(item.product.price * Double(item.quantity)))")
                                .font(.subheadline)
                                .foregroundColor(.white)
                        }
                    }
                    Divider().background(Color.gray.opacity(0.5))
                }
                .padding(.horizontal)
                .transition(.opacity)
            }
            
            VStack(spacing: 10) {
                SummaryRow(title: "Subtotal", value: String(format: "$%.2f", cartManager.total))
                SummaryRow(title: "Delivery Fee", value: String(format: "$%.2f", deliveryFee), info: true)
                SummaryRow(title: "Taxes & Other Fees", value: String(format: "$%.2f", taxAmount), info: true)
                Divider().background(Color.gray)
                HStack {
                    Text("Total")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                    Text(String(format: "$%.2f", totalAmount))
                        .font(.headline)
                        .foregroundColor(.white)
                }
            }
        }
    }
    
    private var paymentSection: some View {
        Button(action: { showPaymentSheet = true }) {
            HStack {
                if let payment = selectedPayment {
                    Image(systemName: payment.cardType.icon)
                        .foregroundColor(.blue)
                    Text("\(payment.cardType.rawValue) ending in \(payment.cardNumber)")
                        .foregroundColor(.white)
                } else {
                    Text("Select Payment Method")
                        .foregroundColor(.white)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(.white)
            }
            .padding()
            .background(Color.white.opacity(0.05))
            .cornerRadius(15)
        }
    }
}

// Address Selection View
struct AddressSelectionView: View {
    @EnvironmentObject var addressManager: AddressManager
    @Binding var selectedAddress: SavedAddress?
    @Environment(\.presentationMode) var presentationMode
    @State private var showAddEditForm = false
    @State private var editingAddress: SavedAddress?
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                VStack {
                    if addressManager.addresses.isEmpty {
                        VStack(spacing: 20) {
                            Spacer()
                            Text("No saved addresses")
                                .foregroundColor(.gray)
                            Button("Add Address") {
                                editingAddress = nil
                                showAddEditForm = true
                            }
                            Spacer()
                        }
                    } else {
                        List {
                            ForEach(addressManager.addresses) { address in
                                Button(action: {
                                    selectedAddress = address
                                    presentationMode.wrappedValue.dismiss()
                                }) {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 5) {
                                            HStack {
                                                Image(systemName: iconName(for: address.label))
                                                    .foregroundColor(iconColor(for: address.label))
                                                Text(address.label)
                                                    .foregroundColor(.white)
                                                    .fontWeight(.medium)
                                            }
                                            Text(address.address)
                                                .font(.caption)
                                                .foregroundColor(.gray)
                                        }
                                        Spacer()
                                        HStack(spacing: 15) {
                                            Button(action: {
                                                editingAddress = address
                                                showAddEditForm = true
                                            }) {
                                                Image(systemName: "pencil")
                                                    .foregroundColor(.blue)
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                            
                                            if let selected = selectedAddress, address.id == selected.id {
                                                Image(systemName: "checkmark")
                                                    .foregroundColor(.blue)
                                            }
                                        }
                                    }
                                }
                                .listRowBackground(Color.black)
                                .listRowSeparator(.visible, edges: .all)
                                .listRowSeparatorTint(Color.white.opacity(0.1))
                            }
                        }
                        .listStyle(PlainListStyle())
                        .scrollContentBackground(.hidden)
                    }
                }
            }
            .navigationTitle("Select Address")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Back") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.blue)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        editingAddress = nil
                        showAddEditForm = true
                    }) {
                        Image(systemName: "plus")
                            .foregroundColor(.blue)
                    }
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(Color.black, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .sheet(isPresented: $showAddEditForm) {
            AddEditAddressView(addressManager: addressManager, existingAddress: editingAddress)
        }
    }
    
    func iconName(for label: String) -> String {
        switch label {
        case "Home": return "house.fill"
        case "Work": return "briefcase.fill"
        default: return "mappin.circle.fill"
        }
    }
    
    func iconColor(for label: String) -> Color {
        switch label {
        case "Home": return .blue
        case "Work": return .orange
        default: return .green
        }
    }
}

// Payment Selection View
struct PaymentSelectionView: View {
    @Binding var paymentMethods: [PaymentMethod]
    @Binding var selectedPayment: PaymentMethod?
    @Environment(\.presentationMode) var presentationMode
    @State private var showAddEditForm = false
    @State private var editingPayment: PaymentMethod?
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                VStack {
                    List {
                        ForEach(paymentMethods) { payment in
                            Button(action: {
                                selectedPayment = payment
                                presentationMode.wrappedValue.dismiss()
                            }) {
                                HStack {
                                    Image(systemName: payment.cardType.icon)
                                        .foregroundColor(.blue)
                                    Text("\(payment.cardType.rawValue) ending in \(payment.cardNumber)")
                                        .foregroundColor(.white)
                                    Spacer()
                                    HStack(spacing: 15) {
                                        Button(action: {
                                            editingPayment = payment
                                            showAddEditForm = true
                                        }) {
                                            Image(systemName: "pencil")
                                                .foregroundColor(.blue)
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                        
                                        if let selected = selectedPayment, payment.id == selected.id {
                                            Image(systemName: "checkmark")
                                                .foregroundColor(.blue)
                                        }
                                    }
                                }
                            }
                            .listRowBackground(Color.black)
                            .listRowSeparator(.visible, edges: .all)
                            .listRowSeparatorTint(Color.white.opacity(0.1))
                        }
                    }
                    .listStyle(PlainListStyle())
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Select Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Back") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.blue)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        editingPayment = nil
                        showAddEditForm = true
                    }) {
                        Image(systemName: "plus")
                            .foregroundColor(.blue)
                    }
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(Color.black, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .sheet(isPresented: $showAddEditForm) {
            PaymentFormView(
                payment: editingPayment,
                onSave: { newPayment in
                    if let index = paymentMethods.firstIndex(where: { $0.id == newPayment.id }) {
                        paymentMethods[index] = newPayment
                    } else {
                        paymentMethods.append(newPayment)
                    }
                    showAddEditForm = false
                }
            )
        }
    }
}



// Payment Form View
struct PaymentFormView: View {
    @Environment(\.presentationMode) var presentationMode
    let payment: PaymentMethod?
    let onSave: (PaymentMethod) -> Void
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 20) {
                    Text("Payment editing is available in the Profile section")
                        .font(.custom("Montserrat-Regular", size: 16))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding()
                }
            }
            .navigationTitle("Payment Method")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    closeButton
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(Color.black, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
    }
    
    private var closeButton: some View {
        Button("Close") {
            presentationMode.wrappedValue.dismiss()
        }
        .foregroundColor(.blue)
    }
}



extension PaymentMethod: Equatable {
    static func == (lhs: PaymentMethod, rhs: PaymentMethod) -> Bool {
        lhs.id == rhs.id
    }
}

struct DeliveryOptionRow: View {
    let title: String
    let detail: String
    var price: String? = nil
    let isSelected: Bool
    
    var body: some View {
        HStack {
            HStack {
                Text(title)
                    .foregroundColor(.white)
                if let price = price {
                    Text(price)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            Spacer()
            Text(detail)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(15)
        .overlay(
            RoundedRectangle(cornerRadius: 15)
                .stroke(isSelected ? Color.white : Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

struct SummaryRow: View {
    let title: String
    let value: String
    var info: Bool = false
    
    var body: some View {
        HStack {
            Text(title)
                .foregroundColor(.gray)
            if info {
                Image(systemName: "info.circle")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            Spacer()
            Text(value)
                .foregroundColor(.gray)
        }
    }
}

#Preview {
    CheckoutView()
        .environmentObject(CartManager())
        .preferredColorScheme(.dark)
}

