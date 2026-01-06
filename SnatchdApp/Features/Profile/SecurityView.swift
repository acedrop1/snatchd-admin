import SwiftUI
import LocalAuthentication

struct SecurityView: View {
    @Environment(\.presentationMode) var presentationMode
    
    @AppStorage("biometricEnabled") private var biometricEnabled = false
    @AppStorage("twoFactorEnabled") private var twoFactorEnabled = false
    
    @State private var showChangePassword = false
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var showPasswordFields = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            ScrollView {
                VStack(spacing: 25) {
                    // Header
                    HStack {
                        Button(action: {
                            presentationMode.wrappedValue.dismiss()
                        }) {
                            Image(systemName: "chevron.left")
                                .font(.title2)
                                .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        Text("Security")
                            .font(.custom("Montserrat-Bold", size: 20))
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        // Placeholder for symmetry
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.clear)
                    }
                    .padding(.horizontal)
                    .padding(.top, 20)
                    
                    // Success Message
                    if let success = successMessage {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text(success)
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.white)
                        }
                        .padding()
                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal)
                    }
                    
                    // Error Message
                    if let error = errorMessage {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text(error)
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.white)
                        }
                        .padding()
                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal)
                    }
                    
                    // Change Password Section
                    VStack(alignment: .leading, spacing: 15) {
                        Text("Password")
                            .font(.custom("Montserrat-SemiBold", size: 16))
                            .foregroundColor(.white)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            Button(action: {
                                withAnimation {
                                    showPasswordFields.toggle()
                                }
                            }) {
                                HStack {
                                    Text("Change Password")
                                        .font(.custom("Montserrat-Medium", size: 16))
                                        .foregroundColor(.white)
                                    Spacer()
                                    Image(systemName: showPasswordFields ? "chevron.up" : "chevron.right")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                                .padding()
                            }
                            
                            if showPasswordFields {
                                VStack(spacing: 15) {
                                    Divider().background(Color.gray.opacity(0.3))
                                    
                                    SecureField("Current Password", text: $currentPassword)
                                        .font(.custom("Montserrat-Regular", size: 16))
                                        .foregroundColor(.white)
                                        .padding()
                                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                                        .padding(.horizontal)
                                    
                                    SecureField("New Password", text: $newPassword)
                                        .font(.custom("Montserrat-Regular", size: 16))
                                        .foregroundColor(.white)
                                        .padding()
                                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                                        .padding(.horizontal)
                                    
                                    SecureField("Confirm New Password", text: $confirmPassword)
                                        .font(.custom("Montserrat-Regular", size: 16))
                                        .foregroundColor(.white)
                                        .padding()
                                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                                        .padding(.horizontal)
                                    
                                    // Password Requirements
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Password must contain:")
                                            .font(.custom("Montserrat-Medium", size: 12))
                                            .foregroundColor(.gray)
                                        
                                        PasswordRequirement(text: "At least 8 characters", met: newPassword.count >= 8)
                                        PasswordRequirement(text: "One uppercase letter", met: newPassword.contains(where: { $0.isUppercase }))
                                        PasswordRequirement(text: "One number", met: newPassword.contains(where: { $0.isNumber }))
                                    }
                                    .padding(.horizontal)
                                    
                                    Button(action: changePassword) {
                                        Text("Update Password")
                                            .font(.custom("Montserrat-SemiBold", size: 16))
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding()
                                    }
                                    .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 25)
                                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                    )
                                    .padding(.horizontal)
                                    .padding(.bottom)
                                }
                            }
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 15))
                        .padding(.horizontal)
                    }
                    
                    // Biometric Authentication
                    VStack(alignment: .leading, spacing: 15) {
                        Text("Authentication")
                            .font(.custom("Montserrat-SemiBold", size: 16))
                            .foregroundColor(.white)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            Toggle(isOn: $biometricEnabled) {
                                HStack {
                                    Image(systemName: "faceid")
                                        .foregroundColor(.blue)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Face ID / Touch ID")
                                            .font(.custom("Montserrat-Medium", size: 16))
                                            .foregroundColor(.white)
                                        Text("Use biometrics to unlock app")
                                            .font(.custom("Montserrat-Regular", size: 12))
                                            .foregroundColor(.gray)
                                    }
                                }
                            }
                            .padding()
                            
                            Divider().background(Color.gray.opacity(0.3))
                            
                            Toggle(isOn: $twoFactorEnabled) {
                                HStack {
                                    Image(systemName: "shield.checkered")
                                        .foregroundColor(.green)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Two-Factor Authentication")
                                            .font(.custom("Montserrat-Medium", size: 16))
                                            .foregroundColor(.white)
                                        Text("Add extra layer of security")
                                            .font(.custom("Montserrat-Regular", size: 12))
                                            .foregroundColor(.gray)
                                    }
                                }
                            }
                            .padding()
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 15))
                        .padding(.horizontal)
                    }
                    
                    Spacer(minLength: 100)
                }
            }
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
    }
    
    private func changePassword() {
        errorMessage = nil
        successMessage = nil
        
        guard !currentPassword.isEmpty else {
            errorMessage = "Current password is required"
            return
        }
        
        guard newPassword.count >= 8 else {
            errorMessage = "Password must be at least 8 characters"
            return
        }
        
        guard newPassword.contains(where: { $0.isUppercase }) else {
            errorMessage = "Password must contain an uppercase letter"
            return
        }
        
        guard newPassword.contains(where: { $0.isNumber }) else {
            errorMessage = "Password must contain a number"
            return
        }
        
        guard newPassword == confirmPassword else {
            errorMessage = "Passwords do not match"
            return
        }
        
        // In a real app, this would call an API
        // For now, just show success
        currentPassword = ""
        newPassword = ""
        confirmPassword = ""
        showPasswordFields = false
        successMessage = "Password updated successfully!"
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            successMessage = nil
        }
    }
}

struct PasswordRequirement: View {
    let text: String
    let met: Bool
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: met ? "checkmark.circle.fill" : "circle")
                .foregroundColor(met ? .green : .gray)
                .font(.caption)
            Text(text)
                .font(.custom("Montserrat-Regular", size: 12))
                .foregroundColor(met ? .green : .gray)
        }
    }
}

#Preview {
    SecurityView()
        .preferredColorScheme(.dark)
}
