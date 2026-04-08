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
    private var authStateListener: AuthStateDidChangeListenerHandle?

    init() {
        // Listen for Auth state changes
        authStateListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            DispatchQueue.main.async {
                self?.isAuthenticated = (user != nil)
            }
        }
    }

    deinit {
        if let authListener = authStateListener {
            Auth.auth().removeStateDidChangeListener(authListener)
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
    
    // MARK: - Direct Email Sign-Up (no phone OTP required)
    func createAccount(email: String, password: String,
                       firstName: String, lastName: String,
                       completion: @escaping (Bool) -> Void) {
        isLoading = true
        errorMessage = nil

        Auth.auth().createUser(withEmail: email, password: password) { [weak self] result, error in
            if let error = error {
                self?.handleError(error: error, completion: completion)
                return
            }
            guard let user = result?.user else {
                self?.handleError(
                    error: NSError(domain: "Auth", code: -1,
                                   userInfo: [NSLocalizedDescriptionKey: "Account creation failed"]),
                    completion: completion
                )
                return
            }
            // Persist display name in Firebase Auth profile
            let changeRequest = user.createProfileChangeRequest()
            changeRequest.displayName = "\(firstName) \(lastName)"
            changeRequest.commitChanges { _ in }

            self?.createUserProfile(user: user, firstName: firstName, lastName: lastName, completion: completion)
        }
    }

    // MARK: - Social Login (Apple)
    func signInWithApple(idTokenString: String, nonce: String, fullName: PersonNameComponents?, completion: @escaping (Bool) -> Void) {
        isLoading = true
        errorMessage = nil

        let credential = OAuthProvider.appleCredential(
            withIDToken: idTokenString,
            rawNonce: nonce,
            fullName: fullName
        )

        Auth.auth().signIn(with: credential) { [weak self] authResult, error in
            DispatchQueue.main.async { self?.isLoading = false }
            if let error = error {
                self?.errorMessage = error.localizedDescription
                completion(false)
                return
            }
            guard let firebaseUser = authResult?.user else { completion(false); return }

            let docRef = self?.db.collection("users").document(firebaseUser.uid)
            docRef?.getDocument { document, _ in
                if let document = document, !document.exists {
                    self?.createUserProfile(user: firebaseUser,
                                            firstName: fullName?.givenName ?? "",
                                            lastName: fullName?.familyName ?? "",
                                            completion: completion)
                } else {
                    completion(true)
                }
            }
        }
    }

    func logout() {
        try? Auth.auth().signOut()
        isAuthenticated = false
    }
}
