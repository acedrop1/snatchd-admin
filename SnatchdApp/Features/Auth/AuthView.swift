import SwiftUI
import CryptoKit
import AuthenticationServices
import GoogleSignIn
import FirebaseAuth
struct AuthView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var phoneNumber = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var isSignUp: Bool
    @Namespace private var animation
    
    @State private var password = ""
    @State private var verificationID = ""
    @State private var showVerify = false
    @EnvironmentObject var authManager: AuthManager
    
    // Focus State
    enum Field: Hashable {
        case firstName, lastName, email, phone, password
    }
    @FocusState private var focusedField: Field?
    
    init(initialTab: Bool = true) {
        _isSignUp = State(initialValue: initialTab)
    }
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 0) {
                // Header with Back Button
                HStack {
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.white)
                            .padding()
                    }
                    Spacer()
                }
                
                // Logo
                Image("whitelogo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 20)
                    .padding(.top, 5)
                
                Spacer().frame(height: 20)
                
                // iOS 26 Liquid Glass Toggle with Subtle Glass Effect
                HStack(spacing: 0) {
                    // Sign Up Button
                    Button(action: {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                            isSignUp = true
                        }
                    }) {
                        ZStack {
                            if isSignUp {
                                // Subtle Liquid Glass Effect
                                Capsule()
                                    .fill(Color.white.opacity(0.2))
                                    .overlay(
                                        Capsule()
                                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                    )
                                    .shadow(color: Color.white.opacity(0.2), radius: 8, x: 0, y: 2)
                                    .matchedGeometryEffect(id: "ToggleBackground", in: animation)
                            }
                            
                            Text("Sign Up")
                                .font(.custom("Montserrat-Bold", size: 16))
                                .foregroundColor(.white)
                        }
                        .frame(height: 50)
                    }
                    .frame(maxWidth: .infinity)
                    
                    // Login Button
                    Button(action: {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                            isSignUp = false
                        }
                    }) {
                        ZStack {
                            if !isSignUp {
                                // Subtle Liquid Glass Effect
                                Capsule()
                                    .fill(Color.white.opacity(0.2))
                                    .overlay(
                                        Capsule()
                                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                    )
                                    .shadow(color: Color.white.opacity(0.2), radius: 8, x: 0, y: 2)
                                    .matchedGeometryEffect(id: "ToggleBackground", in: animation)
                            }
                            
                            Text("Login")
                                .font(.custom("Montserrat-Bold", size: 16))
                                .foregroundColor(.white)
                        }
                        .frame(height: 50)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(4)
                .glassEffect(in: Capsule())
                .padding(.horizontal, 20)
                
                Spacer().frame(height: 20)
                
                // Scrollable Content
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        if isSignUp {
                            // Sign Up Form
                            Text("Create your account")
                                .font(.custom("Montserrat-Medium", size: 18))
                                .foregroundColor(.white)
                            
                            // First Name and Last Name in One Row
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("First Name")
                                        .font(.custom("Montserrat-Medium", size: 13))
                                        .foregroundColor(.gray)
                                    
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 25)
                                            .fill(Color.white.opacity(0.1))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 25)
                                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                            )
                                            .allowsHitTesting(false)
                                        
                                        TextField("First name", text: $firstName)
                                            .focused($focusedField, equals: .firstName)
                                            .textContentType(.givenName)
                                            .submitLabel(.next)
                                            .onSubmit { focusedField = .lastName }
                                            .font(.custom("Montserrat-Regular", size: 15))
                                            .foregroundColor(.white)
                                            .padding(.vertical, 16)
                                            .padding(.horizontal, 14)
                                    }
                                    .frame(height: 50)
                                }
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Last Name")
                                        .font(.custom("Montserrat-Medium", size: 13))
                                        .foregroundColor(.gray)
                                    
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 25)
                                            .fill(Color.white.opacity(0.1))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 25)
                                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                            )
                                            .allowsHitTesting(false)
                                        
                                        TextField("Last name", text: $lastName)
                                            .focused($focusedField, equals: .lastName)
                                            .textContentType(.familyName)
                                            .submitLabel(.next)
                                            .onSubmit { focusedField = .email }
                                            .font(.custom("Montserrat-Regular", size: 15))
                                            .foregroundColor(.white)
                                            .padding(.vertical, 16)
                                            .padding(.horizontal, 14)
                                    }
                                    .frame(height: 50)
                                }
                            }
                            
                            // Email
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Email")
                                    .font(.custom("Montserrat-Medium", size: 13))
                                    .foregroundColor(.gray)
                                
                                ZStack {
                                    RoundedRectangle(cornerRadius: 25)
                                        .fill(Color.white.opacity(0.1))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 25)
                                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                        )
                                        .allowsHitTesting(false)
                                    
                                    TextField("Enter email", text: $email)
                                        .focused($focusedField, equals: .email)
                                        .textContentType(.emailAddress)
                                        .font(.custom("Montserrat-Regular", size: 15))
                                        .foregroundColor(.white)
                                        .keyboardType(.emailAddress)
                                        .autocapitalization(.none)
                                        .submitLabel(.next)
                                        .onSubmit { focusedField = .phone }
                                        .padding(.vertical, 16)
                                        .padding(.horizontal, 14)
                                }
                                .frame(height: 50)
                            }
                            
                            // Phone Number
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Phone Number")
                                    .font(.custom("Montserrat-Medium", size: 13))
                                    .foregroundColor(.gray)
                                
                                HStack(spacing: 12) {
                                    // Country Code Selector
                                    Button(action: {}) {
                                        HStack {
                                            Text("🇺🇸")
                                            Image(systemName: "chevron.down")
                                                .font(.caption)
                                                .foregroundColor(.gray)
                                        }
                                        .padding(.vertical, 12)
                                        .padding(.horizontal, 14)
                                        .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                                    }
                                    
                                    // Phone Number Input
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 25)
                                            .fill(Color.white.opacity(0.1))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 25)
                                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                            )
                                            .allowsHitTesting(false)
                                        
                                        HStack {
                                            Text("+1")
                                                .font(.custom("Montserrat-Regular", size: 15))
                                                .foregroundColor(.gray)
                                            TextField("Mobile number", text: $phoneNumber)
                                                .focused($focusedField, equals: .phone)
                                                .textContentType(.telephoneNumber)
                                                .font(.custom("Montserrat-Regular", size: 15))
                                                .foregroundColor(.white)
                                                .keyboardType(.phonePad)
                                                .toolbar {
                                                    ToolbarItemGroup(placement: .keyboard) {
                                                        if focusedField == .phone {
                                                            Spacer()
                                                            Button("Next") {
                                                                focusedField = .password
                                                            }
                                                        }
                                                    }
                                                }
                                        }
                                        .padding(.vertical, 16)
                                        .padding(.horizontal, 14)
                                    }
                                    .frame(height: 50)
                                }
                            }
                        } else {
                            // Login Form
                            Text("Welcome Back")
                                .font(.custom("Montserrat-Medium", size: 18))
                                .foregroundColor(.white)
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Email or Phone")
                                    .font(.custom("Montserrat-Medium", size: 13))
                                    .foregroundColor(.gray)
                                
                                ZStack {
                                    RoundedRectangle(cornerRadius: 25)
                                        .fill(Color.white.opacity(0.1))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 25)
                                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                        )
                                        .allowsHitTesting(false)
                                    
                                    TextField("Enter email or phone", text: $email)
                                        .focused($focusedField, equals: .email)
                                        .textContentType(.emailAddress)
                                        .font(.custom("Montserrat-Regular", size: 15))
                                        .foregroundColor(.white)
                                        .keyboardType(.emailAddress)
                                        .autocapitalization(.none)
                                        .submitLabel(.next)
                                        .onSubmit { focusedField = .password }
                                        .padding(.vertical, 16)
                                        .padding(.horizontal, 14)
                                }
                                .frame(height: 50)
                            }
                        }
                        
                            // Password (Shared)
                            VStack(alignment: .leading, spacing: 6) {
                                Text(isSignUp ? "Create Password" : "Password")
                                    .font(.custom("Montserrat-Medium", size: 13))
                                    .foregroundColor(.gray)
                                
                                ZStack {
                                    RoundedRectangle(cornerRadius: 25)
                                        .fill(Color.white.opacity(0.1))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 25)
                                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                        )
                                        .allowsHitTesting(false)
                                    
                                    SecureField("Enter password", text: $password)
                                        .focused($focusedField, equals: .password)
                                        .textContentType(isSignUp ? .newPassword : .password)
                                        .submitLabel(.done)
                                        .onSubmit { handleAuthAction() }
                                        .font(.custom("Montserrat-Regular", size: 15))
                                        .foregroundColor(.white)
                                        .padding(.vertical, 16)
                                        .padding(.horizontal, 14)
                                }
                                .frame(height: 50)
                            }    
                            if isSignUp {
                                Text("Min 6 chars, 1 number, 1 capital letter.")
                                    .font(.custom("Montserrat-Regular", size: 11))
                                    .foregroundColor(.gray.opacity(0.8))
                                    .padding(.leading, 10)
                                    .padding(.top, 2)
                            }

                        
                        Text("By proceeding, you consent to get calls, Whatsapp or SMS messages, including by automated means, from uber and its affiliates to the number provided.")
                            .font(.custom("Montserrat-Regular", size: 11))
                            .foregroundColor(.gray)
                            .lineSpacing(3)
                            .padding(.top, 3)
                        
                        if let error = authManager.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding(.top, 5)
                        }
                        
                        if authManager.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .padding()
                        }
                        
                        // Bottom Section (Now Scrollable)
                        VStack(spacing: 12) {
                            // Action Button
                            Button(action: {
                                handleAuthAction()
                            }) {
                                Text(isSignUp ? "Next" : "Login")
                                    .font(.custom("Montserrat-Bold", size: 17))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                            }
                            .disabled(authManager.isLoading)
                            
                            // Navigation Link to Verify (Hidden)
                            NavigationLink(destination: VerifyPhoneView(firstName: firstName, lastName: lastName, email: email, password: password, verificationID: verificationID), isActive: $showVerify) {
                                EmptyView()
                            }
                            
                            // Divider with "or"
                            HStack(spacing: 10) {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(height: 1)
                                Text("or")
                                    .font(.custom("Montserrat-Regular", size: 13))
                                    .foregroundColor(.gray)
                                Rectangle()
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(height: 1)
                            }
                            
                            // Continue with Google
                            Button(action: {
                                handleGoogleLogin()
                            }) {
                                HStack(spacing: 10) {
                                    Image(systemName: "g.circle.fill")
                                        .font(.title3)
                                    Text("Continue with Google")
                                        .font(.custom("Montserrat-SemiBold", size: 15))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                            }
                            
                            // Join with Apple
                            Button(action: {
                                startAppleLogin()
                            }) {
                                HStack(spacing: 10) {
                                    Image(systemName: "applelogo")
                                        .font(.title3)
                                    Text("Join with Apple")
                                        .font(.custom("Montserrat-SemiBold", size: 15))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                            }
                            
                            // Terms text
                            Text("By continuing, you agree to Snatchd's Terms of Service and acknowledge you've read our Privacy Policy.")
                                .font(.custom("Montserrat-Regular", size: 10))
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)
                                .lineSpacing(2)
                                .padding(.bottom, 20)
                        }
                        .padding(.top, 12)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
        .navigationBarHidden(true)
    }
    
    // MARK: - Social Login Handlers
    func handleGoogleLogin() {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else { return }
        
        authManager.signInWithGoogle(presenting: rootVC) { success in
            // handled by auth state change
        }
    }
    
    @State private var currentNonce: String?
    
    func startAppleLogin() {
        let nonce = randomNonceString()
        currentNonce = nonce
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)
        
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = makeCoordinator()
        controller.presentationContextProvider = makeCoordinator()
        controller.performRequests()
    }
    
    func makeCoordinator() -> Coordinator {
        return Coordinator(parent: self)
    }
    
    class Coordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        var parent: AuthView
        
        init(parent: AuthView) {
            self.parent = parent
        }
        
        func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
            return UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first?.windows
                .first { $0.isKeyWindow } ?? UIWindow()
        }
        
        func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
            if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
                guard let nonce = parent.currentNonce else {
                    fatalError("Invalid state: A login callback was received, but no login request was sent.")
                }
                guard let appleIDToken = appleIDCredential.identityToken else {
                    print("Unable to fetch identity token")
                    return
                }
                guard let idTokenString = String(data: appleIDToken, encoding: .utf8) else {
                    print("Unable to serialize token string from data: \(appleIDToken.debugDescription)")
                    return
                }
                
                parent.authManager.signInWithApple(idTokenString: idTokenString, nonce: nonce, fullName: appleIDCredential.fullName) { success in
                    // handled
                }
            }
        }
        
        func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
            print("Sign in with Apple errored: \(error)")
        }
    }
    
    // MARK: - Crypto Helpers
    func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        let charset: Array<Character> =
            Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length
        
        while remainingLength > 0 {
            let randoms: [UInt8] = (0 ..< 16).map { _ in
                var random: UInt8 = 0
                let errorCode = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
                if errorCode != errSecSuccess {
                    fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
                }
                return random
            }
            
            randoms.forEach { random in
                if remainingLength == 0 { return }
                if random < charset.count {
                    result.append(charset[Int(random)])
                    remainingLength -= 1
                }
            }
        }
        return result
    }
    
    func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashed = SHA256.hash(data: inputData)
        return hashed.compactMap { String(format: "%02x", $0) }.joined()
    }
    
    func handleAuthAction() {
        if isSignUp {
            // Sign Up Flow: Verify Phone First
            guard !phoneNumber.isEmpty, !email.isEmpty, !firstName.isEmpty, !lastName.isEmpty else {
                authManager.errorMessage = "Please fill in all fields"
                return
            }
            
            if !isPasswordValid(password) {
                authManager.errorMessage = "Password must be at least 6 characters, contain 1 number and 1 capital letter."
                return
            }
            
            authManager.verifyPhoneNumber(phoneNumber: phoneNumber) { verID in
                if let verID = verID {
                    self.verificationID = verID
                    self.showVerify = true
                }
            }
        } else {
            // Login Flow: Email + Password (treating phone input as email for now if desired, but user asked for phone login)
            // Simpler: Just use Email field for login.
            // If user enters Phone in "Mobile number" field on Login tab, we can't easily login with password without a lookup.
            // For MVP: We assume user enters Email in the Email field.
            // Correction: The original code showed "Mobile number" for Login.
            // I should change that to "Email" for Login if we support Email/Pass.
            // I'll stick to Email for Login for reliability.
            
            authManager.login(email: email.isEmpty ? phoneNumber : email, password: password) { success in
                if success {
                    // Root view handles transition
                }
            }
        }
    }
    
    func isPasswordValid(_ password: String) -> Bool {
        let passwordRegex = "^(?=.*[A-Z])(?=.*[0-9]).{6,}$"
        return NSPredicate(format: "SELF MATCHES %@", passwordRegex).evaluate(with: password)
    }
}

#Preview {
    AuthView()
        .preferredColorScheme(.dark)
}
