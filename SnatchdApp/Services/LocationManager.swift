import Foundation
import CoreLocation
import MapKit
import Combine

class LocationManager: NSObject, ObservableObject {
    private let locationManager = CLLocationManager()
    private let geocoder = CLGeocoder()
    
    @Published var currentLocation: CLLocation?
    @Published var currentAddress: String = "Fetching location..."
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var searchResults: [MKMapItem] = []
    @Published var isSearching = false
    
    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        authorizationStatus = locationManager.authorizationStatus
    }
    
    func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
    }
    
    func startUpdatingLocation() {
        locationManager.startUpdatingLocation()
    }
    
    func stopUpdatingLocation() {
        locationManager.stopUpdatingLocation()
    }
    
    func getCurrentLocation() {
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            locationManager.requestLocation()
        } else {
            requestLocationPermission()
        }
    }
    
    func reverseGeocode(location: CLLocation) {
        geocoder.reverseGeocodeLocation(location) { [weak self] placemarks, error in
            guard let self = self else { return }
            
            if let error = error {
                print("Reverse geocoding error: \(error.localizedDescription)")
                self.currentAddress = "Unable to fetch address"
                return
            }
            
            if let placemark = placemarks?.first {
                self.currentAddress = self.formatAddress(from: placemark)
            }
        }
    }
    
    func searchAddress(query: String, completion: @escaping ([MKMapItem]) -> Void) {
        isSearching = true
        
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        
        // Limit search to New York area
        let nyCoordinate = CLLocationCoordinate2D(latitude: 40.7128, longitude: -74.0060)
        request.region = MKCoordinateRegion(
            center: nyCoordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        )
        
        let search = MKLocalSearch(request: request)
        search.start { [weak self] response, error in
            guard let self = self else { return }
            self.isSearching = false
            
            if let error = error {
                print("Search error: \(error.localizedDescription)")
                completion([])
                return
            }
            
            let results = response?.mapItems ?? []
            self.searchResults = results
            completion(results)
        }
    }
    
    func formatAddress(from placemark: CLPlacemark) -> String {
        var addressComponents: [String] = []
        
        if let streetNumber = placemark.subThoroughfare {
            addressComponents.append(streetNumber)
        }
        if let street = placemark.thoroughfare {
            addressComponents.append(street)
        }
        if let city = placemark.locality {
            addressComponents.append(city)
        }
        if let state = placemark.administrativeArea {
            addressComponents.append(state)
        }
        if let zipCode = placemark.postalCode {
            addressComponents.append(zipCode)
        }
        
        return addressComponents.joined(separator: ", ")
    }
    
    func formatShortAddress(from placemark: CLPlacemark) -> String {
        var components: [String] = []
        
        if let neighborhood = placemark.subLocality {
            components.append(neighborhood)
        } else if let city = placemark.locality {
            components.append(city)
        }
        
        return components.isEmpty ? "Current Location" : components.joined(separator: ", ")
    }
}

extension LocationManager: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            locationManager.requestLocation()
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        currentLocation = location
        reverseGeocode(location: location)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
        currentAddress = "Unable to fetch location"
    }
}
