import SwiftUI
import MapKit

struct LocationDropdownCard: View {
    @Binding var isShowing: Bool
    @Binding var selectedLocation: String
    @StateObject private var locationManager = LocationManager()
    @EnvironmentObject var addressManager: AddressManager
    @State private var searchQuery = ""
    @State private var showAddAddress = false
    
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
                    .onChange(of: searchQuery) { newValue in
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
                                // Extract neighborhood from search result
                                if let name = mapItem.name {
                                    selectedLocation = extractNeighborhood(from: name)
                                }
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
                        // Current Location Button
                        Button(action: {
                            locationManager.getCurrentLocation()
                            // Update selected location once we have the address
                            if !locationManager.currentAddress.isEmpty && locationManager.currentAddress != "Fetching location..." {
                                selectedLocation = extractNeighborhood(from: locationManager.currentAddress)
                                isShowing = false
                            }
                        }) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle()
                                        .fill(Color.blue.opacity(0.2))
                                        .frame(width: 40, height: 40)
                                    
                                    Image(systemName: locationManager.currentLocation != nil ? "location.fill" : "location")
                                        .font(.system(size: 18))
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
                                
                                if locationManager.currentLocation != nil {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                        .font(.system(size: 20))
                                } else {
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.white.opacity(0.4))
                                        .font(.caption)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        .onAppear {
                            locationManager.getCurrentLocation()
                        }
                        .onChange(of: locationManager.currentAddress) { newAddress in
                            // Auto-update and close when location is fetched
                            if !newAddress.isEmpty && newAddress != "Fetching location..." {
                                selectedLocation = extractNeighborhood(from: newAddress)
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
                                isSelected: address.isDefault,
                                onSelect: {
                                    selectedLocation = extractNeighborhood(from: address.address)
                                    isShowing = false
                                }
                            )
                        }
                        
                        // Add New Address Button / Form
                        if !showAddAddress {
                            Button(action: {
                                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                    showAddAddress = true
                                }
                            }) {
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
                        } else {
                            // Inline Add Address Form
                            AddAddressInlineForm(isShowing: $showAddAddress)
                                .transition(.asymmetric(
                                    insertion: .scale(scale: 0.95).combined(with: .opacity),
                                    removal: .scale(scale: 0.95).combined(with: .opacity)
                                ))
                                .padding(.top, 4)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .frame(maxHeight: showAddAddress ? .infinity : 400)
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
}

// Inline Add Address Form Component
struct AddAddressInlineForm: View {
    @Binding var isShowing: Bool
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
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Icon
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.2))
                        .frame(width: 36, height: 36)
                    
                    Image(systemName: iconName)
                        .font(.system(size: 16))
                        .foregroundColor(iconColor)
                }
                
                // Address Info
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
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.system(size: 18))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.white.opacity(0.3) : Color.clear, lineWidth: 1.5)
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
