import SwiftUI
import Combine
import FirebaseCore
import FirebaseAuth
import Firebase
import FirebaseFirestore
import GoogleSignIn
import AuthenticationServices
import CryptoKit

class AuthManager: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private var db = Firestore.firestore()
    
    init() {
        // Listen for Auth state changes
        Auth.auth().addStateDidChangeListener { [weak self] _, user in
            DispatchQueue.main.async {
                self?.isAuthenticated = (user != nil)
            }
        }
    }
    
    // MARK: - Login (Email & Password)
    func login(email: String, password: String, completion: @escaping (Bool) -> Void) {
        isLoading = true
        errorMessage = nil
        
        Auth.auth().signIn(withEmail: email, password: password) { [weak self] result, error in
            DispatchQueue.main.async {
                self?.isLoading = false
            }
            if let error = error {
                self?.errorMessage = error.localizedDescription
                completion(false)
                return
            }
            completion(true)
        }
    }
    
    // MARK: - Sign Up Flow: Step 1 (Request SMS)
    func verifyPhoneNumber(phoneNumber: String, completion: @escaping (String?) -> Void) {
        isLoading = true
        errorMessage = nil
        
        // Ensure phone number has area code (simple logic for now, UI handles formatting)
        let formattedNumber = phoneNumber.starts(with: "+") ? phoneNumber : "+1\(phoneNumber)"
        
        PhoneAuthProvider.provider().verifyPhoneNumber(formattedNumber, uiDelegate: nil) { [weak self] verificationID, error in
            DispatchQueue.main.async {
                self?.isLoading = false
            }
            if let error = error {
                self?.errorMessage = error.localizedDescription
                completion(nil)
                return
            }
            // Save verificationID to UserDefaults for persistence
            UserDefaults.standard.set(verificationID, forKey: AppConfig.authVerificationIDKey)
            completion(verificationID)
        }
    }
    
    // MARK: - Sign Up Flow: Step 2 (Verify SMS & Create Account)
    // This authenticates via Phone, then links Email/Password and creates Firestore profile
    func verifyCodeAndCreateAccount(verificationID: String, code: String, 
                                    email: String, password: String,
                                    firstName: String, lastName: String,
                                    completion: @escaping (Bool) -> Void) {
        isLoading = true
        errorMessage = nil
        
        let credential = PhoneAuthProvider.provider().credential(withVerificationID: verificationID, verificationCode: code)
        
        // 1. Sign in with Phone Credential
        Auth.auth().signIn(with: credential) { [weak self] authResult, error in
            if let error = error {
                self?.handleError(error: error, completion: completion)
                return
            }
            
            guard let user = authResult?.user else {
                self?.handleError(error: NSError(domain: "Auth", code: -1, userInfo: [NSLocalizedDescriptionKey: "No user found"]), completion: completion)
                return
            }
            
            // 2. Update Email (Link Email to Phone Account)
            user.updateEmail(to: email) { error in
                if let error = error {
                    // Note: If email is already in use, this will fail. 
                    // Handling that edge case requires complex merging, simpler for now to report error.
                    self?.handleError(error: error, completion: completion)
                    return
                }
                
                // 3. Update Password
                user.updatePassword(to: password) { error in
                    if let error = error {
                        self?.handleError(error: error, completion: completion)
                        return
                    }
                    
                    // 4. Create Firestore Profile
                    self?.createUserProfile(user: user, firstName: firstName, lastName: lastName, completion: completion)
                }
            }
        }
    }
    
    private func createUserProfile(user: User, firstName: String, lastName: String, completion: @escaping (Bool) -> Void) {
        let userData: [String: Any] = [
            "uid": user.uid,
            "phoneNumber": user.phoneNumber ?? "",
            "email": user.email ?? "",
            "firstName": firstName,
            "lastName": lastName,
            "fullName": "\(firstName) \(lastName)",
            "createdAt": FieldValue.serverTimestamp()
        ]
        
        db.collection("users").document(user.uid).setData(userData) { [weak self] error in
            DispatchQueue.main.async {
                self?.isLoading = false
            }
            if let error = error {
                self?.errorMessage = "Failed to save profile: \(error.localizedDescription)"
                completion(false)
            } else {
                completion(true)
            }
        }
    }
    
    private func handleError(error: Error, completion: @escaping (Bool) -> Void) {
        DispatchQueue.main.async {
            self.isLoading = false
            print("Auth Error: \(error)") // Print full error to console
            print("Error Code: \((error as NSError).code)")
            print("Error Domain: \((error as NSError).domain)")
            self.errorMessage = error.localizedDescription
            completion(false)
        }
    }
    
    // MARK: - Social Login (Google)
    // Note: Depends on GoogleSignIn package
    func signInWithGoogle(presenting viewController: UIViewController, completion: @escaping (Bool) -> Void) {
        isLoading = true
        errorMessage = nil
        
        guard let clientID = FirebaseApp.app()?.options.clientID else { return }
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        GIDSignIn.sharedInstance.signIn(withPresenting: viewController) { [weak self] result, error in
             DispatchQueue.main.async {
                 if let error = error {
                     self?.isLoading = false
                     self?.errorMessage = error.localizedDescription
                     completion(false)
                     return
                 }
                 
                 guard let user = result?.user,
                       let idToken = user.idToken?.tokenString else {
                     self?.isLoading = false
                     completion(false)
                     return
                 }
                 
                 let credential = GoogleAuthProvider.credential(withIDToken: idToken,
                                                                accessToken: user.accessToken.tokenString)
                 
                 Auth.auth().signIn(with: credential) { authResult, error in
                     self?.isLoading = false
                     if let error = error {
                         self?.errorMessage = error.localizedDescription
                         completion(false)
                         return
                     }
                     // Check if profile exists, if not create it
                     if let firebaseUser = authResult?.user {
                        let docRef = self?.db.collection("users").document(firebaseUser.uid)
                         docRef?.getDocument { document, error in
                             if let document = document, !document.exists {
                                 // Create profile from Google info
                                 self?.createUserProfile(user: firebaseUser, 
                                                         firstName: user.profile?.givenName ?? "",
                                                         lastName: user.profile?.familyName ?? "",
                                                         completion: completion)
                             } else {
                                 completion(true)
                             }
                         }
                     }
                 }
             }
        }
    }
    
    // MARK: - Social Login (Apple)
    func signInWithApple(idTokenString: String, nonce: String, fullName: PersonNameComponents?, completion: @escaping (Bool) -> Void) {
        isLoading = true
        errorMessage = nil
        
        // Fallback to generic OAuthProvider
        // FIXME: Apple Auth Credential unavailable in this SDK version. Temporarily disabled.
        /*
        let credential = OAuthProvider.credential(withProviderID: "apple.com",
                                                  idToken: idTokenString,
                                                  rawNonce: nonce)
        
        Auth.auth().signIn(with: credential) { [weak self] authResult, error in
            DispatchQueue.main.async {
                self?.isLoading = false
            }
            if let error = error {
                self?.errorMessage = error.localizedDescription
                completion(false)
                return
            }
             
            if let firebaseUser = authResult?.user {
                let docRef = self?.db.collection("users").document(firebaseUser.uid)
                docRef?.getDocument { document, error in
                     if let document = document, !document.exists {
                         // Create profile from Apple info (only available on first sign in)
                         let firstName = fullName?.givenName ?? ""
                         let lastName = fullName?.familyName ?? ""
                         self?.createUserProfile(user: firebaseUser, firstName: firstName, lastName: lastName, completion: completion)
                     } else {
                         completion(true)
                     }
                }
            }
        }
        */
        print("Apple Sign In temporarily disabled due to SDK conflict")
        completion(false)

    }

    func logout() {
        try? Auth.auth().signOut()
        isAuthenticated = false
    }
}
