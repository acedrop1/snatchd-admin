import SwiftUI
import MapKit
import CoreLocation

struct LocationDropdownCard: View {
    @Binding var isShowing: Bool
    @Binding var selectedLocation: String
    /// Set when user picks a specific address/result — drives HomeView's store filter
    @Binding var selectedCoordinate: CLLocation?
    /// Persisted in HomeView so the highlight survives dropdown close/reopen
    @Binding var selectedAddressId: String?
    /// Passed in from HomeView — avoids creating a second CLLocationManager on every open
    @ObservedObject var locationManager: LocationManager
    @EnvironmentObject var addressManager: AddressManager
    @State private var searchQuery = ""
    @State private var showAddAddressSheet = false
    @State private var editingAddress: SavedAddress? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // Search Bar
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.5))
                
                TextField("Search for an address", text: $searchQuery)
                    .font(.custom("Montserrat-Regular", size: 15))
                    .foregroundColor(.white)
                    .onChange(of: searchQuery) { oldValue, newValue in
                        if !newValue.isEmpty {
                            locationManager.searchAddress(query: newValue) { _ in }
                        } else {
                            locationManager.searchResults = []
                        }
                    }
                
                if !searchQuery.isEmpty {
                    Button(action: {
                        searchQuery = ""
                        locationManager.searchResults = []
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white.opacity(0.5))
                            .font(.system(size: 18))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
            .glassEffect(in: RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 15)
            
            ScrollView {
                VStack(spacing: 12) {
                    // Search Results
                    if !locationManager.searchResults.isEmpty {
                        ForEach(locationManager.searchResults, id: \.self) { mapItem in
                            Button(action: {
                                // Update display label
                                if let name = mapItem.name {
                                    selectedLocation = extractNeighborhood(from: name)
                                }
                                // Set coordinate so HomeView filters stores by this location
                                let coord = mapItem.placemark.coordinate
                                selectedCoordinate = CLLocation(latitude: coord.latitude, longitude: coord.longitude)
                                searchQuery = ""
                                locationManager.searchResults = []
                                isShowing = false
                            }) {
                                HStack(spacing: 12) {
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.title3)
                                        .foregroundColor(.blue)
                                    
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(mapItem.name ?? "Unknown")
                                            .font(.custom("Montserrat-SemiBold", size: 15))
                                            .foregroundColor(.white)
                                        
                                        if let address = mapItem.placemark.title {
                                            Text(address)
                                                .font(.custom("Montserrat-Regular", size: 13))
                                                .foregroundColor(.white.opacity(0.6))
                                                .lineLimit(1)
                                        }
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                            }
                            .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                    } else {
                        // Current Location Card
                        Button(action: {
                            selectedCoordinate = nil
                            selectedAddressId = nil
                            locationManager.getCurrentLocation()
                            if !locationManager.currentAddress.isEmpty && locationManager.currentAddress != "Fetching location..." {
                                selectedLocation = extractNeighborhood(from: locationManager.currentAddress)
                                isShowing = false
                            }
                        }) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle()
                                        .fill(Color.blue.opacity(0.2))
                                        .frame(width: 36, height: 36)
                                    Image(systemName: "location.fill")
                                        .font(.system(size: 16))
                                        .foregroundColor(.blue)
                                }
                                VStack(alignment: .leading, spacing: 3) {
                                    Text("Use Current Location")
                                        .font(.custom("Montserrat-SemiBold", size: 15))
                                        .foregroundColor(.white)
                                    Text(locationManager.currentAddress)
                                        .font(.custom("Montserrat-Regular", size: 13))
                                        .foregroundColor(.white.opacity(0.6))
                                        .lineLimit(1)
                                }
                                Spacer()
                                // Spacer so overlay pencil doesn't overlap text
                                Color.clear.frame(width: 30)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        .overlay(alignment: .trailing) {
                            Button(action: {
                                // Pre-fill form with current GPS location data if available
                                if let p = locationManager.currentPlacemark {
                                    let street = [p.subThoroughfare, p.thoroughfare]
                                        .compactMap { $0 }.joined(separator: " ")
                                    editingAddress = SavedAddress(
                                        label: "Home",
                                        street: street,
                                        apartment: "",
                                        city: p.locality ?? "",
                                        state: p.administrativeArea ?? "",
                                        zipCode: p.postalCode ?? "",
                                        isDefault: false
                                    )
                                } else {
                                    showAddAddressSheet = true
                                }
                            }) {
                                Image(systemName: "pencil.circle.fill")
                                    .font(.system(size: 22))
                                    .foregroundColor(.white.opacity(0.45))
                                    .padding(.trailing, 16)
                            }
                            .buttonStyle(.plain)
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(selectedAddressId == nil ? Color.white.opacity(0.5) : Color.clear, lineWidth: 1.5)
                        )
                        .onChange(of: locationManager.currentAddress) { oldValue, newAddress in
                            if !newAddress.isEmpty && newAddress != "Fetching location..." {
                                selectedLocation = extractNeighborhood(from: newAddress)
                                selectedCoordinate = nil
                                selectedAddressId = nil
                                isShowing = false
                            }
                        }
                        
                        // Divider
                        HStack(spacing: 12) {
                            Rectangle()
                                .fill(Color.white.opacity(0.15))
                                .frame(height: 1)
                            Text("Saved Addresses")
                                .font(.custom("Montserrat-Medium", size: 12))
                                .foregroundColor(.white.opacity(0.5))
                            Rectangle()
                                .fill(Color.white.opacity(0.15))
                                .frame(height: 1)
                        }
                        .padding(.vertical, 12)
                        
                        // Saved Addresses
                        ForEach(addressManager.addresses) { address in
                            AddressCardCompact(
                                address: address,
                                isSelected: address.id == selectedAddressId,
                                onSelect: {
                                    selectedAddressId = address.id
                                    // Show the saved label (e.g. "Home", "Gym") if it's not generic,
                                    // otherwise fall back to the street number + name
                                    let knownLabels = ["Home", "Work"]
                                    if knownLabels.contains(address.label) {
                                        selectedLocation = address.label
                                    } else if !address.label.isEmpty && address.label != "Other" {
                                        selectedLocation = address.label   // custom name like "Mom's House"
                                    } else {
                                        selectedLocation = address.street.isEmpty ? extractNeighborhood(from: address.address) : address.street
                                    }
                                    geocodeAddress(address.address) { location in
                                        selectedCoordinate = location
                                    }
                                    isShowing = false
                                },
                                onEdit: { editingAddress = address }
                            )
                        }
                        .sheet(item: $editingAddress) { address in
                            AddEditAddressView(addressManager: addressManager, existingAddress: address)
                        }
                        
                        // Add New Address Button
                        Button(action: { showAddAddressSheet = true }) {
                            HStack(spacing: 12) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(.white)
                                Text("Add New Address")
                                    .font(.custom("Montserrat-SemiBold", size: 15))
                                    .foregroundColor(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.4))
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        .padding(.top, 4)
                        .sheet(isPresented: $showAddAddressSheet) {
                            AddEditAddressView(addressManager: addressManager)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .frame(maxHeight: 400)
        }
        .glassEffect(in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: Color.black.opacity(0.3), radius: 20, x: 0, y: 10)
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }
    
    // Helper function to extract neighborhood from address
    private func extractNeighborhood(from address: String) -> String {
        // Try to extract neighborhood (e.g., "SoHo" from "123 Spring St, SoHo, NY 10012")
        let components = address.components(separatedBy: ", ")

        // If we have at least 2 components, the second one is usually the neighborhood
        if components.count >= 2 {
            return components[1]
        }

        // Otherwise return the first component or the full address
        return components.first ?? address
    }

    /// Forward-geocode a saved address string into a CLLocation for store proximity filtering
    private func geocodeAddress(_ address: String, completion: @escaping (CLLocation?) -> Void) {
        CLGeocoder().geocodeAddressString(address) { placemarks, _ in
            DispatchQueue.main.async {
                completion(placemarks?.first?.location)
            }
        }
    }
}

// Inline Add Address Form Component
struct AddAddressInlineForm: View {
    @Binding var isShowing: Bool
    @EnvironmentObject var addressManager: AddressManager
    @State private var addressLabel = "Home"
    @State private var streetAddress = ""
    @State private var apartment = ""
    @State private var city = ""
    @State private var state = ""
    @State private var zipCode = ""
    @State private var deliveryInstructions = ""
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: AppConfig.defaultLatitude, longitude: AppConfig.defaultLongitude),
        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )
    
    var body: some View {
        VStack(spacing: 16) {
            // Header with Close Button
            HStack {
                Text("Add New Address")
                    .font(.custom("Montserrat-SemiBold", size: 17))
                    .foregroundColor(.white)
                
                Spacer()
                
                Button(action: {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                        isShowing = false
                    }
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 28, height: 28)
                        .background(Circle().fill(Color.white.opacity(0.2)))
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    // Map View with Pin Location Button
                    ZStack(alignment: .bottom) {
                        Map(coordinateRegion: $region, annotationItems: [MapPin(coordinate: region.center)]) { pin in
                            MapMarker(coordinate: pin.coordinate, tint: .blue)
                        }
                        .frame(height: 150)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                        
                        // PIN LOCATION Button
                        Button(action: {
                            // Pin location action
                        }) {
                            Text("PIN LOCATION")
                                .font(.custom("Montserrat-Bold", size: 10))
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 6)
                                .background(Color.black.opacity(0.8))
                                .cornerRadius(16)
                        }
                        .padding(.bottom, 10)
                    }
                    
                    // Label Selection
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Label")
                            .font(.custom("Montserrat-Medium", size: 12))
                            .foregroundColor(.gray)
                        
                        HStack(spacing: 8) {
                            ForEach(["Home", "Work", "Other"], id: \.self) { label in
                                Button(action: {
                                    addressLabel = label
                                }) {
                                    Text(label)
                                        .font(.custom("Montserrat-Medium", size: 13))
                                        .foregroundColor(addressLabel == label ? .white : .gray)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(
                                            addressLabel == label
                                                ? Color.white.opacity(0.15)
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
                        
                        TextField("Enter street address", text: $streetAddress)
                            .font(.custom("Montserrat-Regular", size: 14))
                            .foregroundColor(.white)
                            .padding(12)
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
                            .padding(12)
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
                            .padding(12)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(10)
                    }
                    
                    // State & ZIP
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("State")
                                .font(.custom("Montserrat-Medium", size: 12))
                                .foregroundColor(.gray)
                            
                            TextField("NY", text: $state)
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.white)
                                .padding(12)
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
                                .padding(12)
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
                            .padding(12)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(10)
                    }
                    
                    // Save Button
                    Button(action: {
                        guard !streetAddress.isEmpty, !city.isEmpty else { return }
                        let newAddress = SavedAddress(
                            label: addressLabel,
                            street: streetAddress,
                            apartment: apartment,
                            city: city.isEmpty ? "New York" : city,
                            state: state.isEmpty ? "NY" : state,
                            zipCode: zipCode,
                            isDefault: addressManager.addresses.isEmpty // first address = default
                        )
                        addressManager.addAddress(newAddress)
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                            isShowing = false
                        }
                    }) {
                        Text("Save Address")
                            .font(.custom("Montserrat-SemiBold", size: 15))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(24)
                            .overlay(
                                RoundedRectangle(cornerRadius: 24)
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                    }
                    .padding(.top, 4)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
    }
}


struct AddressCardCompact: View {
    let address: SavedAddress
    let isSelected: Bool
    let onSelect: () -> Void
    var onEdit: (() -> Void)? = nil
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.2))
                        .frame(width: 36, height: 36)
                    Image(systemName: iconName)
                        .font(.system(size: 16))
                        .foregroundColor(iconColor)
                }
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Text(address.label)
                            .font(.custom("Montserrat-SemiBold", size: 15))
                            .foregroundColor(.white)
                        if address.isDefault {
                            Text("DEFAULT")
                                .font(.custom("Montserrat-Bold", size: 9))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.blue)
                                .cornerRadius(3)
                        }
                    }
                    Text(address.address)
                        .font(.custom("Montserrat-Regular", size: 13))
                        .foregroundColor(.white.opacity(0.6))
                        .lineLimit(1)
                }
                Spacer()
                // Reserve space so text doesn't run under the pencil overlay
                Color.clear.frame(width: 30)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
        // Pencil in overlay so it never triggers the card's select action
        .overlay(alignment: .trailing) {
            Button(action: { onEdit?() }) {
                Image(systemName: "pencil.circle.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.white.opacity(0.45))
                    .padding(.trailing, 16)
            }
            .buttonStyle(.plain)
        }
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.white.opacity(0.5) : Color.clear, lineWidth: 1.5)
        )
    }
    
    var iconName: String {
        switch address.label {
        case "Home": return "house.fill"
        case "Work": return "briefcase.fill"
        default: return "mappin.circle.fill"
        }
    }
    
    var iconColor: Color {
        switch address.label {
        case "Home": return .blue
        case "Work": return .orange
        default: return .green
        }
    }
}
