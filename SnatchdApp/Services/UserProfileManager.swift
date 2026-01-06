import SwiftUI
import Combine

// MARK: - User Profile Model
struct UserProfile: Codable {
    var firstName: String
    var lastName: String
    var email: String
    var phoneNumber: String
    
    var fullName: String {
        "\(firstName) \(lastName)"
    }
}

// MARK: - User Profile Manager
class UserProfileManager: ObservableObject {
    @Published var profile: UserProfile
    @Published var profileImage: UIImage?
    
    private let userDefaultsKey = "userProfile"
    private let profileImageFileName = "profile_photo.jpg"
    
    init() {
        // Load from UserDefaults or use default
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode(UserProfile.self, from: data) {
            self.profile = decoded
        } else {
            // Default profile
            self.profile = UserProfile(
                firstName: "John",
                lastName: "Doe",
                email: "johndoe@gmail.com",
                phoneNumber: "+1 (555) 123-4567"
            )
        }
        
        loadProfileImage()
    }
    
    func updateProfile(firstName: String, lastName: String, email: String, phoneNumber: String) {
        profile.firstName = firstName
        profile.lastName = lastName
        profile.email = email
        profile.phoneNumber = phoneNumber
        saveProfile()
    }
    
    private func saveProfile() {
        if let encoded = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
    }
    
    // MARK: - Profile Image Persistence
    
    func saveProfileImage(_ image: UIImage) {
        guard let data = image.jpegData(compressionQuality: 0.8) else { return }
        
        let fileURL = getDocumentsDirectory().appendingPathComponent(profileImageFileName)
        
        do {
            try data.write(to: fileURL)
            self.profileImage = image
        } catch {
            print("Error saving profile image: \(error.localizedDescription)")
        }
    }
    
    func loadProfileImage() {
        let fileURL = getDocumentsDirectory().appendingPathComponent(profileImageFileName)
        
        if let data = try? Data(contentsOf: fileURL), let image = UIImage(data: data) {
            self.profileImage = image
        }
    }
    
    func deleteProfileImage() {
        let fileURL = getDocumentsDirectory().appendingPathComponent(profileImageFileName)
        
        do {
            try FileManager.default.removeItem(at: fileURL)
            self.profileImage = nil
        } catch {
            print("Error deleting profile image: \(error.localizedDescription)")
        }
    }
    
    private func getDocumentsDirectory() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    
    // Validation
    func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    func isValidName(_ name: String) -> Bool {
        return name.count >= 2 && name.count <= 50
    }
}
