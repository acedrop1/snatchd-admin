import SwiftUI
import Combine
import CoreLocation
import MapKit

// MARK: - Location Fetcher (callback-based, main-thread safe)

private class LocationFetcher: NSObject, CLLocationManagerDelegate, ObservableObject {
    private let manager = CLLocationManager()
    private var completion: ((Result<CLLocation, Error>) -> Void)?

    override init() {
        super.init()
        // Must set delegate on main thread
        DispatchQueue.main.async {
            self.manager.delegate = self
            self.manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        }
    }

    /// Call this to start a one-shot location fetch. Completion always called on main thread.
    func fetch(completion: @escaping (Result<CLLocation, Error>) -> Void) {
        DispatchQueue.main.async {
            self.completion = completion
            switch self.manager.authorizationStatus {
            case .notDetermined:
                self.manager.requestWhenInUseAuthorization()
            case .authorizedWhenInUse, .authorizedAlways:
                self.manager.requestLocation()
            default:
                self.completion?(.failure(FetchError.denied))
                self.completion = nil
            }
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard completion != nil else { return }
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            completion?(.failure(FetchError.denied))
            completion = nil
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.first else { return }
        completion?(.success(loc))
        completion = nil
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        completion?(.failure(error))
        completion = nil
    }

    enum FetchError: LocalizedError {
        case denied
        var errorDescription: String? {
            "Location access denied. Go to Settings → Privacy → Location Services to enable."
        }
    }
}

// MARK: - Address Autocomplete

private class AddressCompleter: NSObject, MKLocalSearchCompleterDelegate, ObservableObject {
    @Published var suggestions: [MKLocalSearchCompletion] = []
    private let completer = MKLocalSearchCompleter()

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = .address
    }

    func update(query: String) {
        if query.count < 3 {
            suggestions = []
        } else {
            completer.queryFragment = query
        }
    }

    func clear() { suggestions = [] }

    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        suggestions = Array(completer.results.prefix(5))
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        suggestions = []
    }
}

// MARK: - View

struct AddEditAddressView: View {
    @ObservedObject var addressManager: AddressManager
    @Environment(\.presentationMode) var presentationMode

    var existingAddress: SavedAddress?

    @State private var labelTab: String = "Home"   // "Home", "Work", or "Other"
    @State private var customLabel: String = ""    // used when labelTab == "Other"
    @State private var street: String = ""
    @State private var apartment: String = ""
    @State private var city: String = ""
    @State private var state: String = ""
    @State private var zipCode: String = ""
    @State private var deliveryInstructions: String = ""
    @State private var isDefault: Bool = false

    @State private var errorMessage: String?
    @State private var isLocating: Bool = false
    @State private var showSuggestions: Bool = false

    @StateObject private var completer = AddressCompleter()
    @StateObject private var locationFetcher = LocationFetcher()
    @State private var suppressSuggestions = false

    var isEditing: Bool { existingAddress != nil }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
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
                    Color.clear.frame(width: 28, height: 28)
                }
                .padding(.horizontal, 20)
                .padding(.top, 15)
                .padding(.bottom, 20)

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 16) {

                        // Error banner
                        if let error = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red).font(.system(size: 12))
                                Text(error)
                                    .font(.custom("Montserrat-Medium", size: 12))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(Color.red.opacity(0.15))
                            .cornerRadius(10)
                        }

                        // Label selector
                        VStack(alignment: .leading, spacing: 8) {
                            Text("LABEL")
                                .font(.custom("Montserrat-Medium", size: 11))
                                .foregroundColor(Color(white: 0.5))
                            HStack(spacing: 10) {
                                ForEach(["Home", "Work", "Other"], id: \.self) { opt in
                                    Button(action: { labelTab = opt }) {
                                        Text(opt)
                                            .font(.custom("Montserrat-Medium", size: 14))
                                            .foregroundColor(labelTab == opt ? .white : .gray)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(labelTab == opt ? Color.white.opacity(0.2) : Color.white.opacity(0.05))
                                            .cornerRadius(10)
                                    }
                                }
                            }
                            // Custom name input shown only when "Other" is selected
                            if labelTab == "Other" {
                                TextField("e.g. Mom's House, Gym, Hotel…", text: $customLabel)
                                    .font(.custom("Montserrat-Regular", size: 14))
                                    .foregroundColor(.white)
                                    .padding(.vertical, 13)
                                    .padding(.horizontal, 14)
                                    .background(Color.white.opacity(0.05))
                                    .cornerRadius(10)
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.15), lineWidth: 1))
                            }
                        }

                        // Use Current Location
                        Button(action: detectLocation) {
                            HStack(spacing: 8) {
                                if isLocating {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "location.fill")
                                        .font(.system(size: 13))
                                }
                                Text(isLocating ? "Detecting..." : "Use Current Location")
                                    .font(.custom("Montserrat-SemiBold", size: 14))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(10)
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.15), lineWidth: 1))
                        }
                        .disabled(isLocating)

                        // Street with autocomplete
                        VStack(alignment: .leading, spacing: 6) {
                            Text("STREET ADDRESS")
                                .font(.custom("Montserrat-Medium", size: 11))
                                .foregroundColor(Color(white: 0.5))

                            TextField("123 Main St", text: $street)
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(10)
                                .onChange(of: street) { val in
                                    if suppressSuggestions {
                                        suppressSuggestions = false
                                        return
                                    }
                                    completer.update(query: val)
                                    showSuggestions = val.count >= 3
                                }

                            // Dropdown suggestions
                            if showSuggestions && !completer.suggestions.isEmpty {
                                VStack(spacing: 0) {
                                    ForEach(completer.suggestions, id: \.self) { suggestion in
                                        Button(action: { selectSuggestion(suggestion) }) {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(suggestion.title)
                                                    .font(.custom("Montserrat-SemiBold", size: 13))
                                                    .foregroundColor(.white)
                                                if !suggestion.subtitle.isEmpty {
                                                    Text(suggestion.subtitle)
                                                        .font(.custom("Montserrat-Regular", size: 11))
                                                        .foregroundColor(Color(white: 0.55))
                                                }
                                            }
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 10)
                                        }
                                        if suggestion != completer.suggestions.last {
                                            Divider().background(Color.white.opacity(0.1))
                                        }
                                    }
                                }
                                .background(Color(white: 0.12))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.15), lineWidth: 1))
                            }
                        }

                        // Apartment
                        formField(label: "APARTMENT / SUITE (OPTIONAL)", placeholder: "Apt, suite, floor...", text: $apartment)

                        // City
                        formField(label: "CITY", placeholder: "New York", text: $city)

                        // State + ZIP
                        HStack(spacing: 12) {
                            formField(label: "STATE", placeholder: "NY", text: $state)
                                .textInputAutocapitalization(.characters)
                            formField(label: "ZIP CODE", placeholder: "10012", text: $zipCode)
                                .keyboardType(.numberPad)
                        }

                        // Delivery instructions
                        formField(label: "DELIVERY NOTES (OPTIONAL)", placeholder: "Ring bell, leave at door...", text: $deliveryInstructions)

                        // Default toggle
                        HStack {
                            Text("Set as default address")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.white)
                            Spacer()
                            Toggle("", isOn: $isDefault).labelsHidden().tint(.white)
                        }

                        // Save button
                        Button(action: saveAddress) {
                            Text("Save Address")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(25)
                                .overlay(RoundedRectangle(cornerRadius: 25).stroke(Color.white.opacity(0.25), lineWidth: 1))
                        }
                        .padding(.top, 8)

                        Spacer().frame(height: 40)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
        .onAppear {
            if let a = existingAddress { loadAddress(a) }
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func formField(label: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.custom("Montserrat-Medium", size: 11))
                .foregroundColor(Color(white: 0.5))
            TextField(placeholder, text: text)
                .font(.custom("Montserrat-Regular", size: 14))
                .foregroundColor(.white)
                .padding(.vertical, 16)
                .padding(.horizontal, 16)
                .background(Color.white.opacity(0.05))
                .cornerRadius(10)
        }
    }

    private func loadAddress(_ a: SavedAddress) {
        if a.label == "Home" || a.label == "Work" {
            labelTab = a.label
            customLabel = ""
        } else {
            labelTab = "Other"
            customLabel = a.label  // restore the custom name e.g. "Mom's House"
        }
        suppressSuggestions = true   // prevent onChange(of: street) from opening autocomplete
        street = a.street; apartment = a.apartment
        city = a.city; state = a.state; zipCode = a.zipCode; isDefault = a.isDefault
        showSuggestions = false
        completer.clear()
    }

    // MARK: - Location Detection

    private func detectLocation() {
        isLocating = true
        errorMessage = nil
        locationFetcher.fetch { result in
            // completion is already on main thread
            switch result {
            case .success(let location):
                CLGeocoder().reverseGeocodeLocation(location) { placemarks, error in
                    DispatchQueue.main.async {
                        if let p = placemarks?.first {
                            self.suppressSuggestions = true
                            self.street  = [p.subThoroughfare, p.thoroughfare].compactMap { $0 }.joined(separator: " ")
                            self.city    = p.locality ?? ""
                            self.state   = p.administrativeArea ?? ""
                            self.zipCode = p.postalCode ?? ""
                            self.showSuggestions = false
                            self.completer.clear()
                        } else {
                            self.errorMessage = error?.localizedDescription ?? "Address couldn't be determined."
                        }
                        self.isLocating = false
                    }
                }
            case .failure(let error):
                self.isLocating = false
                self.errorMessage = error.localizedDescription
            }
        }
    }

    // MARK: - Autocomplete Selection

    private func selectSuggestion(_ suggestion: MKLocalSearchCompletion) {
        showSuggestions = false
        completer.clear()

        let searchRequest = MKLocalSearch.Request(completion: suggestion)
        let search = MKLocalSearch(request: searchRequest)
        search.start { response, _ in
            guard let item = response?.mapItems.first else { return }
            let p = item.placemark
            DispatchQueue.main.async {
                suppressSuggestions = true   // prevent onChange from re-opening the dropdown
                street  = [p.subThoroughfare, p.thoroughfare].compactMap { $0 }.joined(separator: " ")
                city    = p.locality ?? ""
                state   = p.administrativeArea ?? ""
                zipCode = p.postalCode ?? ""
            }
        }
    }

    // MARK: - Save

    private func saveAddress() {
        errorMessage = nil
        guard !street.isEmpty else { errorMessage = "Street address is required"; return }
        guard !city.isEmpty   else { errorMessage = "City is required"; return }
        guard !state.isEmpty  else { errorMessage = "State is required"; return }

        // Resolve the final label: custom text when "Other" tab is active
        let finalLabel: String = {
            if labelTab == "Other" {
                let trimmed = customLabel.trimmingCharacters(in: .whitespaces)
                return trimmed.isEmpty ? "Other" : trimmed
            }
            return labelTab
        }()

        if let existing = existingAddress {
            addressManager.updateAddress(SavedAddress(
                id: existing.id, label: finalLabel, street: street, apartment: apartment,
                city: city, state: state, zipCode: zipCode, isDefault: isDefault
            ))
        } else {
            addressManager.addAddress(SavedAddress(
                id: nil, label: finalLabel, street: street, apartment: apartment,
                city: city, state: state, zipCode: zipCode, isDefault: isDefault || addressManager.addresses.isEmpty
            ))
        }
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    AddEditAddressView(addressManager: AddressManager())
        .preferredColorScheme(.dark)
}
