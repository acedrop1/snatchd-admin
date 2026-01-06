import Foundation

struct AppConfig {
    // API Endpoints
    static let stockCheckServiceURL = "https://checkstock-jkfmw4mdua-uc.a.run.app"
    
    // Default Location (NYC Times Square) - Used as fallback when location unavailable
    static let defaultLatitude: Double = 40.7580
    static let defaultLongitude: Double = -73.9855
    
    // Default Location Name
    static let defaultLocationName = "SoHo"
    
    // Cart Persistence Key
    static let cartPersistenceKey = "savedCart"
    
    // UserDefaults Keys
    static let authVerificationIDKey = "authVerificationID"
}
