import SwiftUI

struct PersonalInfoView: View {
    @StateObject private var profileManager = UserProfileManager()
    @Environment(\.presentationMode) var presentationMode
    
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var email: String = ""
    @State private var phoneNumber: String = ""
    
    @State private var isEditing = false
    @State private var showSuccessMessage = false
    @State private var errorMessage: String?
    
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
                        
                        Text("Personal Information")
                            .font(.custom("Montserrat-Bold", size: 20))
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        Button(action: {
                            if isEditing {
                                saveChanges()
                            } else {
                                isEditing = true
                            }
                        }) {
                            Text(isEditing ? "Save" : "Edit")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top, 20)
                    
                    // Success Message
                    if showSuccessMessage {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("Profile updated successfully!")
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
                    
                    // Form Fields
                    VStack(spacing: 20) {
                        // First Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("First Name")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.gray)
                            
                            TextField("", text: $firstName)
                                .font(.custom("Montserrat-Regular", size: 16))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .disabled(!isEditing)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Last Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Last Name")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.gray)
                            
                            TextField("", text: $lastName)
                                .font(.custom("Montserrat-Regular", size: 16))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .disabled(!isEditing)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Email
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.gray)
                            
                            TextField("", text: $email)
                                .font(.custom("Montserrat-Regular", size: 16))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .disabled(!isEditing)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Phone Number
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Phone Number")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.gray)
                            
                            TextField("", text: $phoneNumber)
                                .font(.custom("Montserrat-Regular", size: 16))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .disabled(!isEditing)
                                .keyboardType(.phonePad)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding(.horizontal)
                    
                    // Cancel Button (only show when editing)
                    if isEditing {
                        Button(action: {
                            cancelEditing()
                        }) {
                            Text("Cancel")
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
                    }
                    
                    Spacer(minLength: 100)
                }
            }
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
        .onAppear {
            loadProfile()
        }
    }
    
    private func loadProfile() {
        firstName = profileManager.profile.firstName
        lastName = profileManager.profile.lastName
        email = profileManager.profile.email
        phoneNumber = profileManager.profile.phoneNumber
    }
    
    private func saveChanges() {
        // Validate
        errorMessage = nil
        
        guard profileManager.isValidName(firstName) else {
            errorMessage = "First name must be 2-50 characters"
            return
        }
        
        guard profileManager.isValidName(lastName) else {
            errorMessage = "Last name must be 2-50 characters"
            return
        }
        
        guard profileManager.isValidEmail(email) else {
            errorMessage = "Please enter a valid email address"
            return
        }
        
        // Save
        profileManager.updateProfile(
            firstName: firstName,
            lastName: lastName,
            email: email,
            phoneNumber: phoneNumber
        )
        
        isEditing = false
        showSuccessMessage = true
        
        // Hide success message after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            showSuccessMessage = false
        }
    }
    
    private func cancelEditing() {
        loadProfile()
        isEditing = false
        errorMessage = nil
    }
}

#Preview {
    PersonalInfoView()
        .preferredColorScheme(.dark)
}
