import SwiftUI
import CryptoKit
import AuthenticationServices
import GoogleSignIn
import FirebaseAuth

struct AuthView: View {
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var authManager: AuthManager
    @Namespace private var animation

    @State private var isSignUp: Bool
    @State private var firstName = ""
    @State private var lastName  = ""
    @State private var email     = ""
    @State private var password  = ""
    @State private var currentNonce: String?

    enum Field: Hashable { case firstName, lastName, email, password }
    @FocusState private var focused: Field?

    init(initialTab: Bool = true) {
        _isSignUp = State(initialValue: initialTab)
    }

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {

                // ── Back button ─────────────────────────────────────────────
                HStack {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.white)
                            .padding()
                    }
                    Spacer()
                }

                // ── Logo ────────────────────────────────────────────────────
                Image("whitelogo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 20)
                    .padding(.top, 5)

                Spacer().frame(height: 24)

                // ── Sign Up / Login toggle ──────────────────────────────────
                HStack(spacing: 0) {
                    ForEach([("Sign Up", true), ("Login", false)], id: \.0) { label, tab in
                        Button(action: {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                                isSignUp = tab
                                authManager.errorMessage = nil
                            }
                        }) {
                            ZStack {
                                if isSignUp == tab {
                                    Capsule()
                                        .fill(Color.white.opacity(0.2))
                                        .overlay(Capsule().stroke(Color.white.opacity(0.3), lineWidth: 1))
                                        .matchedGeometryEffect(id: "tab", in: animation)
                                }
                                Text(label)
                                    .font(.custom("Montserrat-Bold", size: 16))
                                    .foregroundColor(.white)
                            }
                            .frame(height: 50)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(4)
                .glassEffect(in: Capsule())
                .padding(.horizontal, 20)

                Spacer().frame(height: 28)

                // ── Scrollable form ─────────────────────────────────────────
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {

                        // Social buttons — Apple first (App Store rule)
                        VStack(spacing: 12) {
                            // Apple
                            Button(action: startAppleLogin) {
                                HStack(spacing: 10) {
                                    Image(systemName: "applelogo")
                                        .font(.system(size: 17, weight: .semibold))
                                    Text(isSignUp ? "Sign up with Apple" : "Sign in with Apple")
                                        .font(.custom("Montserrat-SemiBold", size: 15))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                            }

                            // Google
                            Button(action: handleGoogleLogin) {
                                HStack(spacing: 10) {
                                    Image(systemName: "g.circle.fill")
                                        .font(.system(size: 17))
                                    Text(isSignUp ? "Sign up with Google" : "Sign in with Google")
                                        .font(.custom("Montserrat-SemiBold", size: 15))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                            }
                        }
                        .padding(.horizontal, 20)

                        // ── Divider ──────────────────────────────────────────
                        HStack(spacing: 12) {
                            Rectangle().fill(Color.white.opacity(0.15)).frame(height: 1)
                            Text("or")
                                .font(.custom("Montserrat-Regular", size: 12))
                                .foregroundColor(.white.opacity(0.4))
                            Rectangle().fill(Color.white.opacity(0.15)).frame(height: 1)
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 22)

                        // ── Email form ───────────────────────────────────────
                        VStack(alignment: .leading, spacing: 14) {

                            if isSignUp {
                                // Name row
                                HStack(spacing: 12) {
                                    AuthField(label: "First Name", placeholder: "First", text: $firstName,
                                              contentType: .givenName, field: .firstName, focused: $focused,
                                              next: .lastName)
                                    AuthField(label: "Last Name", placeholder: "Last", text: $lastName,
                                              contentType: .familyName, field: .lastName, focused: $focused,
                                              next: .email)
                                }
                            }

                            // Email
                            AuthField(label: "Email", placeholder: "Enter email", text: $email,
                                      contentType: .emailAddress, field: .email, focused: $focused,
                                      next: .password, keyboard: .emailAddress)

                            // Password
                            AuthField(label: isSignUp ? "Create Password" : "Password",
                                      placeholder: "Enter password", text: $password,
                                      contentType: isSignUp ? .newPassword : .password,
                                      field: .password, focused: $focused,
                                      isSecure: true, submitAction: handleEmailAuth)

                            if isSignUp {
                                Text("Min 6 chars, 1 number, 1 capital letter.")
                                    .font(.custom("Montserrat-Regular", size: 11))
                                    .foregroundColor(.white.opacity(0.35))
                                    .padding(.leading, 4)
                            }

                            // Error
                            if let error = authManager.errorMessage {
                                Text(error)
                                    .font(.custom("Montserrat-Regular", size: 12))
                                    .foregroundColor(.red.opacity(0.9))
                                    .padding(.top, 2)
                            }

                            // Action button
                            Button(action: handleEmailAuth) {
                                ZStack {
                                    if authManager.isLoading {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text(isSignUp ? "Create Account" : "Sign In")
                                            .font(.custom("Montserrat-Bold", size: 17))
                                            .foregroundColor(.white)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                            }
                            .disabled(authManager.isLoading)
                            .padding(.top, 4)
                        }
                        .padding(.horizontal, 20)

                        // Terms
                        Text("By continuing, you agree to Snatchd's Terms of Service and Privacy Policy.")
                            .font(.custom("Montserrat-Regular", size: 10))
                            .foregroundColor(.white.opacity(0.3))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 30)
                            .padding(.top, 20)
                            .padding(.bottom, 40)
                    }
                }
            }
        }
        .navigationBarHidden(true)
    }

    // MARK: - Email Auth

    func handleEmailAuth() {
        focused = nil
        authManager.errorMessage = nil

        if isSignUp {
            guard !firstName.isEmpty, !lastName.isEmpty else {
                authManager.errorMessage = "Please enter your name."
                return
            }
            guard !email.isEmpty else {
                authManager.errorMessage = "Please enter your email."
                return
            }
            guard isPasswordValid(password) else {
                authManager.errorMessage = "Password must be at least 6 characters, contain 1 number and 1 capital."
                return
            }
            authManager.createAccount(email: email, password: password,
                                       firstName: firstName, lastName: lastName) { _ in }
        } else {
            guard !email.isEmpty, !password.isEmpty else {
                authManager.errorMessage = "Please enter your email and password."
                return
            }
            authManager.login(email: email, password: password) { _ in }
        }
    }

    func isPasswordValid(_ pwd: String) -> Bool {
        NSPredicate(format: "SELF MATCHES %@", "^(?=.*[A-Z])(?=.*[0-9]).{6,}$").evaluate(with: pwd)
    }

    // MARK: - Google

    func handleGoogleLogin() {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else { return }
        authManager.signInWithGoogle(presenting: rootVC) { _ in }
    }

    // MARK: - Apple

    func startAppleLogin() {
        let nonce = randomNonceString()
        currentNonce = nonce
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = makeCoordinator()
        controller.presentationContextProvider = makeCoordinator()
        controller.performRequests()
    }

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    class Coordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        var parent: AuthView
        init(parent: AuthView) { self.parent = parent }

        func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
            UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first?.windows.first { $0.isKeyWindow } ?? UIWindow()
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let nonce = parent.currentNonce,
                  let tokenData = credential.identityToken,
                  let tokenString = String(data: tokenData, encoding: .utf8) else { return }

            parent.authManager.signInWithApple(idTokenString: tokenString,
                                               nonce: nonce,
                                               fullName: credential.fullName) { _ in }
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
            print("Apple Sign-In error: \(error.localizedDescription)")
        }
    }

    // MARK: - Crypto helpers

    func randomNonceString(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            (0..<16).map { _ -> UInt8 in
                var b: UInt8 = 0
                SecRandomCopyBytes(kSecRandomDefault, 1, &b)
                return b
            }.forEach { b in
                guard remaining > 0 else { return }
                if b < charset.count { result.append(charset[Int(b)]); remaining -= 1 }
            }
        }
        return result
    }

    func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Reusable field component

private struct AuthField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var contentType: UITextContentType = .emailAddress
    var field: AuthView.Field
    @FocusState.Binding var focused: AuthView.Field?
    var next: AuthView.Field? = nil
    var keyboard: UIKeyboardType = .default
    var isSecure: Bool = false
    var submitAction: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.custom("Montserrat-Medium", size: 12))
                .foregroundColor(.white.opacity(0.45))

            ZStack {
                RoundedRectangle(cornerRadius: 25)
                    .fill(Color.white.opacity(0.08))
                    .overlay(RoundedRectangle(cornerRadius: 25)
                        .stroke(focused == field ? Color.white.opacity(0.4) : Color.white.opacity(0.15), lineWidth: 1))
                    .allowsHitTesting(false)

                Group {
                    if isSecure {
                        SecureField(placeholder, text: $text)
                            .textContentType(contentType)
                            .submitLabel(next == nil ? .done : .next)
                            .onSubmit { if let n = next { focused = n } else { submitAction?() } }
                    } else {
                        TextField(placeholder, text: $text)
                            .textContentType(contentType)
                            .keyboardType(keyboard)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                            .submitLabel(next == nil ? .done : .next)
                            .onSubmit { if let n = next { focused = n } else { submitAction?() } }
                    }
                }
                .focused($focused, equals: field)
                .font(.custom("Montserrat-Regular", size: 15))
                .foregroundColor(.white)
                .padding(.vertical, 15)
                .padding(.horizontal, 16)
            }
            .frame(height: 50)
        }
    }
}

#Preview {
    AuthView()
        .environmentObject(AuthManager())
        .preferredColorScheme(.dark)
}
