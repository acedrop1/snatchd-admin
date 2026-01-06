import SwiftUI

struct AddEditAddressView: View {
    @ObservedObject var addressManager: AddressManager
    @Environment(\.presentationMode) var presentationMode
    
    var existingAddress: SavedAddress?
    
    @State private var label: String = "Home"
    @State private var street: String = ""
    @State private var apartment: String = ""
    @State private var city: String = ""
    @State private var state: String = ""
    @State private var zipCode: String = ""
    @State private var deliveryInstructions: String = ""
    @State private var isDefault: Bool = false
    
    @State private var errorMessage: String?
    
    let labelOptions = ["Home", "Work", "Gym", "Other"]
    
    var isEditing: Bool {
        existingAddress != nil
    }
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Compact Custom Header
                HStack {
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 28, height: 28)
                            .background(Circle().fill(Color.white.opacity(0.15)))
                    }
                    
                    Spacer()
                    
                    Text(isEditing ? "Edit Address" : "Add Address")
                        .font(.custom("Montserrat-SemiBold", size: 17))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    // Invisible spacer for symmetry
                    Color.clear.frame(width: 28, height: 28)
                }
                .padding(.horizontal, 20)
                .padding(.top, 15)
                .padding(.bottom, 20)
                
                // Scrollable Content
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 16) {
                        // Error Message
                        if let error = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                    .font(.system(size: 12))
                                Text(error)
                                    .font(.custom("Montserrat-Medium", size: 12))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(Color.red.opacity(0.15))
                            .cornerRadius(10)
                        }
                        
                        // Label Selector
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Label")
                                .font(.custom("Montserrat-Medium", size: 12))
                                .foregroundColor(.gray)
                            
                            HStack(spacing: 10) {
                                ForEach(["Home", "Work", "Other"], id: \.self) { option in
                                    Button(action: {
                                        label = option
                                    }) {
                                        Text(option)
                                            .font(.custom("Montserrat-Medium", size: 14))
                                            .foregroundColor(label == option ? .white : .gray)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(
                                                label == option
                                                    ? Color.white.opacity(0.2)
                                                    : Color.white.opacity(0.05)
                                            )
                                            .cornerRadius(10)
                                    }
                                }
                            }
                        }
                        
                        // Street Address
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Street Address")
                                .font(.custom("Montserrat-Medium", size: 12))
                                .foregroundColor(.gray)
                            
                            TextField("Enter street address", text: $street)
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(10)
                        }
                        
                        // Apartment/Suite
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Apartment/Suite (Optional)")
                                .font(.custom("Montserrat-Medium", size: 12))
                                .foregroundColor(.gray)
                            
                            TextField("Apt, suite, floor, etc.", text: $apartment)
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(10)
                        }
                        
                        // City
                        VStack(alignment: .leading, spacing: 6) {
                            Text("City")
                                .font(.custom("Montserrat-Medium", size: 12))
                                .foregroundColor(.gray)
                            
                            TextField("New York", text: $city)
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(10)
                        }
                        
                        // State & ZIP
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("State")
                                    .font(.custom("Montserrat-Medium", size: 12))
                                    .foregroundColor(.gray)
                                
                                TextField("NY", text: $state)
                                    .font(.custom("Montserrat-Regular", size: 14))
                                    .foregroundColor(.white)
                                    .padding(.vertical, 16)
                                    .padding(.horizontal, 16)
                                    .background(Color.white.opacity(0.05))
                                    .cornerRadius(10)
                                    .textInputAutocapitalization(.characters)
                            }
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("ZIP Code")
                                    .font(.custom("Montserrat-Medium", size: 12))
                                    .foregroundColor(.gray)
                                
                                TextField("10012", text: $zipCode)
                                    .font(.custom("Montserrat-Regular", size: 14))
                                    .foregroundColor(.white)
                                    .padding(.vertical, 16)
                                    .padding(.horizontal, 16)
                                    .keyboardType(.numberPad)
                                    .background(Color.white.opacity(0.05))
                                    .cornerRadius(10)
                            }
                        }
                        
                        // Delivery Instructions
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Delivery Instructions (Optional)")
                                .font(.custom("Montserrat-Medium", size: 12))
                                .foregroundColor(.gray)
                            
                            TextField("Add delivery notes", text: $deliveryInstructions)
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(10)
                        }
                        
                        // Set as Default Toggle
                        HStack {
                            Text("Set as default address")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.white)
                            Spacer()
                            Toggle("", isOn: $isDefault)
                                .labelsHidden()
                                .tint(Color.white)
                        }
                        .padding(.vertical, 2)
                        
                        // Save Button
                        Button(action: saveAddress) {
                            Text("Save Address")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(25)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 25)
                                        .stroke(Color.white.opacity(0.25), lineWidth: 1)
                                )
                        }
                        .padding(.top, 8)
                        
                        // Bottom spacing for keyboard
                        Spacer().frame(height: 30)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
        .onAppear {
            if let address = existingAddress {
                loadAddress(address)
            }
        }
    }
    
    private func loadAddress(_ address: SavedAddress) {
        label = address.label
        street = address.street
        apartment = address.apartment
        city = address.city
        state = address.state
        zipCode = address.zipCode
        isDefault = address.isDefault
    }
    
    private func saveAddress() {
        // Validation
        errorMessage = nil
        
        guard !street.isEmpty else {
            errorMessage = "Street address is required"
            return
        }
        
        guard !city.isEmpty else {
            errorMessage = "City is required"
            return
        }
        
        guard !state.isEmpty else {
            errorMessage = "State is required"
            return
        }
        
        guard zipCode.count == 5, zipCode.allSatisfy({ $0.isNumber }) else {
            errorMessage = "ZIP code must be 5 digits"
            return
        }
        
        // Create or update address
        if let existing = existingAddress {
            let updated = SavedAddress(
                id: existing.id,
                label: label,
                street: street,
                apartment: apartment,
                city: city,
                state: state,
                zipCode: zipCode,
                isDefault: isDefault
            )
            addressManager.updateAddress(updated)
        } else {
            let newAddress = SavedAddress(
                id: nil, // ID will be generated by Firestore
                label: label,
                street: street,
                apartment: apartment,
                city: city,
                state: state,
                zipCode: zipCode,
                isDefault: isDefault
            )
            addressManager.addAddress(newAddress)
        }
        
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    AddEditAddressView(addressManager: AddressManager())
        .preferredColorScheme(.dark)
}
