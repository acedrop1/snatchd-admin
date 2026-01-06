import SwiftUI
import Combine

struct VerifyPhoneView: View {
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var authManager: AuthManager
    @State private var otpCode = ["", "", "", "", "", ""] // 6 digits for Firebase
    @FocusState private var focusedField: Int?
    @State private var timeRemaining = 30
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    // Params passed from AuthView
    var firstName: String = ""
    var lastName: String = ""
    var email: String = ""
    var password: String = ""
    var verificationID: String = ""
    
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
                
                ScrollView {
                    VStack(spacing: 30) {
                        Spacer().frame(height: 40)
                        
                        VStack(spacing: 10) {
                            Text("Verify Phone Number")
                                .font(.custom("Montserrat-Bold", size: 24))
                                .foregroundColor(.white)
                            
                            Text("Enter the 6-digit code sent to your phone")
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.horizontal, 40)
                        
                        // OTP Fields
                        HStack(spacing: 10) {
                            ForEach(0..<6, id: \.self) { index in
                                TextField("", text: $otpCode[index])
                                    .focused($focusedField, equals: index)
                                    .keyboardType(.numberPad)
                                    .multilineTextAlignment(.center)
                                    .font(.custom("Montserrat-Bold", size: 24))
                                    .foregroundColor(.white)
                                    .frame(width: 45, height: 60)
                                    .glassEffect(in: RoundedRectangle(cornerRadius: 10))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(focusedField == index ? Color.white : Color.clear, lineWidth: 1)
                                    )
                                    .onChange(of: otpCode[index]) { newValue in
                                        if newValue.count > 1 {
                                            otpCode[index] = String(newValue.last!)
                                        }
                                        if !newValue.isEmpty {
                                            if index < 5 {
                                                focusedField = index + 1
                                            } else {
                                                focusedField = nil
                                                // Optional: Auto-submit
                                            }
                                        } else {
                                            if newValue.isEmpty && index > 0 {
                                                 focusedField = index - 1
                                            }
                                        }
                                    }
                            }
                        }
                        .padding(.vertical, 20)
                        
                        // Timer
                        if timeRemaining > 0 {
                            Text("(\(String(format: "%02d:%02d", timeRemaining / 60, timeRemaining % 60)))")
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.gray)
                        }
                        
                        if let error = authManager.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                        
                        // Confirm Button
                        Button(action: {
                            let code = otpCode.joined()
                            guard code.count == 6 else { return }
                            
                            // Use the verificationID passed from AuthView, or fallback to UserDefaults for safety
                            let verID = verificationID.isEmpty ? UserDefaults.standard.string(forKey: AppConfig.authVerificationIDKey) ?? "" : verificationID
                            
                            authManager.verifyCodeAndCreateAccount(
                                verificationID: verID,
                                code: code,
                                email: email,
                                password: password,
                                firstName: firstName,
                                lastName: lastName
                            ) { success in
                                if success {
                                    // Root view will switch to ContentView due to auth state change
                                    // presentationMode.wrappedValue.dismiss() // Not strictly needed but clean
                                }
                            }
                        }) {
                            if authManager.isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Confirm")
                                    .font(.custom("Montserrat-Bold", size: 18))
                                    .foregroundColor(.white)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                        .padding(.horizontal, 40)
                        .padding(.top, 20)
                        
                        // Send Again
                        Button(action: {
                            // Reset timer
                            timeRemaining = 30
                        }) {
                            Text("Send Again")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.white)
                        }
                        .padding(.top, 10)
                        
                        Spacer().frame(height: 60)
                        
                        // Logo at Bottom
                        Image("whitelogo")
                            .resizable()
                            .scaledToFit()
                            .frame(height: 20)
                            .padding(.bottom, 40)
                    }
                }
            }
        }
        .onReceive(timer) { _ in
            if timeRemaining > 0 {
                timeRemaining -= 1
            }
        }
        .navigationBarHidden(true)
    }
}

#Preview {
    VerifyPhoneView()
        .preferredColorScheme(.dark)
}
