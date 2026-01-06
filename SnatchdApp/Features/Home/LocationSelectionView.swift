import SwiftUI
import MapKit

struct LocationSelectionView: View {
    @Environment(\.presentationMode) var presentationMode
    @StateObject private var locationManager = LocationManager()
    @EnvironmentObject var addressManager: AddressManager
    @State private var selectedAddress: SavedAddress?
    @State private var showAddAddress = false
    @State private var showMap = false
    @State private var searchQuery = ""
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7231, longitude: -73.9969), // SoHo, NYC
        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )
    
    var body: some View {
        ZStack(alignment: .top) {
            // Clear background with blur effect
            Rectangle()
                .fill(.ultraThinMaterial)
                .edgesIgnoringSafeArea(.all)
                .onTapGesture {
                    presentationMode.wrappedValue.dismiss()
                }
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(
                                Circle()
                                    .fill(Color.white.opacity(0.1))
                            )
                    }
                    
                    Spacer()
                    
                    Text("Delivery Location")
                        .font(.custom("Montserrat-Bold", size: 17))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    Color.clear.frame(width: 32)
                }
                .padding(.horizontal, 20)
                .padding(.top, 20) // Minimal padding for status bar
                .padding(.bottom, 20)
                
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
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.1))
                )
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                
                ScrollView {
                    VStack(spacing: 15) {
                        // Search Results
                        if !locationManager.searchResults.isEmpty {
                            VStack(spacing: 10) {
                                ForEach(locationManager.searchResults, id: \.self) { mapItem in
                                    Button(action: {
                                        searchQuery = ""
                                        locationManager.searchResults = []
                                        presentationMode.wrappedValue.dismiss()
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
                                        .padding(.vertical, 14)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color.white.opacity(0.1))
                                        )
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        
                        // Current Location Button
                        if locationManager.searchResults.isEmpty {
                            Button(action: {
                                locationManager.getCurrentLocation()
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
                                        Text(locationManager.currentLocation != nil ? "Current Location" : "Use Current Location")
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
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.1))
                                )
                            }
                            .padding(.horizontal, 20)
                            .onAppear {
                                locationManager.getCurrentLocation()
                            }
                        }
                        
                        // Divider
                        if locationManager.searchResults.isEmpty && searchQuery.isEmpty {
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
                            .padding(.horizontal, 20)
                            .padding(.vertical, 15)
                        }
                        
                        // Saved Addresses List
                        if locationManager.searchResults.isEmpty && searchQuery.isEmpty {
                            VStack(spacing: 10) {
                                ForEach(addressManager.addresses) { address in
                                    LocationAddressCard(
                                        address: address,
                                        isSelected: address.isDefault,
                                        onSelect: {
                                            presentationMode.wrappedValue.dismiss()
                                        },
                                        onEdit: {
                                            // Edit address
                                        }
                                    )
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        
                        // Add New Address Button
                        if locationManager.searchResults.isEmpty && searchQuery.isEmpty {
                            Button(action: {
                                showAddAddress = true
                            }) {
                                HStack(spacing: 12) {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.system(size: 22))
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
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.1))
                                )
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 8)
                            .padding(.bottom, 30)
                        }
                    }
                }
                
                Spacer() // Force content to top
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top) // Force VStack to top
            .background(
                RoundedRectangle(cornerRadius: 30, style: .continuous)
                    .fill(.ultraThinMaterial)
            )
            .clipShape(
                RoundedRectangle(cornerRadius: 30, style: .continuous)
            )
        }
        .edgesIgnoringSafeArea(.all)
        .navigationBarHidden(true)
        .sheet(isPresented: $showAddAddress) {
            AddEditAddressView(addressManager: addressManager)
        }
    }
}

struct LocationAddressCard: View {
    let address: SavedAddress
    let isSelected: Bool
    let onSelect: () -> Void
    let onEdit: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 12) {
                // Icon
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.2))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: iconName)
                        .font(.system(size: 18))
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
                
                // Edit Button
                Button(action: onEdit) {
                    Image(systemName: "ellipsis")
                        .foregroundColor(.white.opacity(0.5))
                        .font(.system(size: 18))
                        .rotationEffect(.degrees(90))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.1))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.white.opacity(0.2) : Color.clear, lineWidth: 1.5)
            )
        }
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

struct AddAddressView: View {
    @Environment(\.presentationMode) var presentationMode
    @StateObject private var locationManager = LocationManager()
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
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(Circle().fill(Color.white.opacity(0.2)))
                    }
                    
                    Spacer()
                    
                    Text("Add New Address")
                        .font(.custom("Montserrat-SemiBold", size: 18))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    Color.clear.frame(width: 32)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 16)
                
                // Content
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        // Map View with Pin Location Button
                        ZStack(alignment: .bottom) {
                            Map(coordinateRegion: $region, annotationItems: [MapPin(coordinate: region.center)]) { pin in
                                MapMarker(coordinate: pin.coordinate, tint: .blue)
                            }
                            .frame(height: 180)
                            .cornerRadius(16)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                            
                            // PIN LOCATION Button
                            Button(action: {
                                // Pin location action
                            }) {
                                Text("PIN LOCATION")
                                    .font(.custom("Montserrat-Bold", size: 11))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 8)
                                    .background(Color.black.opacity(0.8))
                                    .cornerRadius(20)
                            }
                            .padding(.bottom, 12)
                        }
                        
                        // Label Selection
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Label")
                                .font(.custom("Montserrat-Medium", size: 13))
                                .foregroundColor(.gray)
                            
                            HStack(spacing: 12) {
                                ForEach(["Home", "Work", "Other"], id: \.self) { label in
                                    Button(action: {
                                        addressLabel = label
                                    }) {
                                        Text(label)
                                            .font(.custom("Montserrat-Medium", size: 14))
                                            .foregroundColor(addressLabel == label ? .white : .gray)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 12)
                                            .background(
                                                addressLabel == label
                                                    ? Color.white.opacity(0.15)
                                                    : Color.white.opacity(0.05)
                                            )
                                            .cornerRadius(12)
                                    }
                                }
                            }
                        }
                        
                        // Street Address
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Street Address")
                                .font(.custom("Montserrat-Medium", size: 13))
                                .foregroundColor(.gray)
                            
                            TextField("Enter street address", text: $streetAddress)
                                .font(.custom("Montserrat-Regular", size: 15))
                                .foregroundColor(.white)
                                .padding(16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                        }
                        
                        // Apartment/Suite
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Apartment/Suite (Optional)")
                                .font(.custom("Montserrat-Medium", size: 13))
                                .foregroundColor(.gray)
                            
                            TextField("Apt, suite, floor, etc.", text: $apartment)
                                .font(.custom("Montserrat-Regular", size: 15))
                                .foregroundColor(.white)
                                .padding(16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                        }
                        
                        // City
                        VStack(alignment: .leading, spacing: 8) {
                            Text("City")
                                .font(.custom("Montserrat-Medium", size: 13))
                                .foregroundColor(.gray)
                            
                            TextField("New York", text: $city)
                                .font(.custom("Montserrat-Regular", size: 15))
                                .foregroundColor(.white)
                                .padding(16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                        }
                        
                        // State & ZIP
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("State")
                                    .font(.custom("Montserrat-Medium", size: 13))
                                    .foregroundColor(.gray)
                                
                                TextField("NY", text: $state)
                                    .font(.custom("Montserrat-Regular", size: 15))
                                    .foregroundColor(.white)
                                    .padding(16)
                                    .background(Color.white.opacity(0.05))
                                    .cornerRadius(12)
                                    .textInputAutocapitalization(.characters)
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("ZIP Code")
                                    .font(.custom("Montserrat-Medium", size: 13))
                                    .foregroundColor(.gray)
                                
                                TextField("10012", text: $zipCode)
                                    .font(.custom("Montserrat-Regular", size: 15))
                                    .foregroundColor(.white)
                                    .padding(16)
                                    .keyboardType(.numberPad)
                                    .background(Color.white.opacity(0.05))
                                    .cornerRadius(12)
                            }
                        }
                        
                        // Delivery Instructions
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Delivery Instructions (Optional)")
                                .font(.custom("Montserrat-Medium", size: 13))
                                .foregroundColor(.gray)
                            
                            TextField("Add delivery notes", text: $deliveryInstructions)
                                .font(.custom("Montserrat-Regular", size: 15))
                                .foregroundColor(.white)
                                .padding(16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                        }
                        
                        // Save Button
                        Button(action: {
                            presentationMode.wrappedValue.dismiss()
                        }) {
                            Text("Save Address")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(28)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 28)
                                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                )
                        }
                        .padding(.top, 8)
                        
                        Spacer().frame(height: 40)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
        .edgesIgnoringSafeArea(.top)
    }
}

// Helper struct for map pin
struct MapPin: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
}

