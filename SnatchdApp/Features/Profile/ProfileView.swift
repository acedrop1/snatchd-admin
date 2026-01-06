import SwiftUI
import PhotosUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var profileManager = UserProfileManager()
    @State private var showImagePicker = false
    @State private var showActionSheet = false
    @State private var showFullImage = false
    @State private var showLogoutConfirmation = false
    @State private var selectedImage: UIImage?
    var navID: UUID
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                ScrollView {
                    VStack(spacing: 25) {
                        // Header
                        Text("My Profile")
                            .font(.custom("Montserrat-Bold", size: 20))
                            .foregroundColor(.white)
                            .padding(.top, 20)
                        
                        // Avatar & Name
                        VStack(spacing: 10) {
                            // Profile Photo
                            ZStack(alignment: .center) {
                                if let profileImage = profileManager.profileImage {
                                    Image(uiImage: profileImage)
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 100, height: 100)
                                        .clipShape(Circle())
                                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
                                } else {
                                    ZStack {
                                        Circle()
                                            .fill(Color.white.opacity(0.1))
                                            .frame(width: 100, height: 100)
                                            .overlay(Circle().stroke(Color.white, lineWidth: 2))
                                        
                                        VStack(spacing: 4) {
                                            Image(systemName: "camera.fill")
                                                .font(.system(size: 24))
                                                .foregroundColor(.white.opacity(0.6))
                                            Text("Add Photo")
                                                .font(.custom("Montserrat-Medium", size: 11))
                                                .foregroundColor(.white.opacity(0.6))
                                        }
                                    }
                                }
                            }
                            .onTapGesture {
                                if profileManager.profileImage == nil {
                                    showImagePicker = true
                                } else {
                                    showActionSheet = true
                                }
                            }
                            
                            Text(profileManager.profile.fullName)
                                .font(.custom("Montserrat-Bold", size: 20))
                                .foregroundColor(.white)
                            
                            Text(profileManager.profile.email)
                                .font(.custom("Montserrat-Regular", size: 14))
                                .foregroundColor(.gray)
                        }
                        
                        // Quick Links
                        HStack(spacing: 15) {
                            NavigationLink(destination: MySizesView()) {
                                QuickLinkCard(icon: "ruler", title: "My Sizes")
                            }
                            NavigationLink(destination: OrderHistoryView()) {
                                QuickLinkCard(icon: "clock.arrow.circlepath", title: "Order History")
                            }
                        }
                        .padding(.horizontal)
                        
                        // Manage Account
                        VStack(alignment: .leading, spacing: 15) {
                            Text("Manage Account")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.white)
                                .padding(.horizontal)
                            
                            VStack(spacing: 0) {
                                NavigationLink(destination: PersonalInfoView()) {
                                    SettingsRow(title: "Personal Information")
                                }
                                Divider().background(Color.gray.opacity(0.3))
                                NavigationLink(destination: SavedAddressesView()) {
                                    SettingsRow(title: "Saved Addresses")
                                }
                                Divider().background(Color.gray.opacity(0.3))
                                NavigationLink(destination: PaymentMethodsView()) {
                                    SettingsRow(title: "Payment Methods")
                                }
                            }
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(15)
                            .padding(.horizontal)
                        }
                        
                        // App Settings
                        VStack(alignment: .leading, spacing: 15) {
                            Text("App Settings")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.white)
                                .padding(.horizontal)
                            
                            VStack(spacing: 0) {
                                NavigationLink(destination: SecurityView()) {
                                    SettingsRow(title: "Security")
                                }
                                Divider().background(Color.gray.opacity(0.3))
                                NavigationLink(destination: NotificationPreferencesView()) {
                                    SettingsRow(title: "Notification Preferences")
                                }
                            }
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(15)
                            .padding(.horizontal)
                        }
                        
                        // Support & Legal
                        VStack(spacing: 0) {
                            NavigationLink(destination: StaticContentView(title: "Help & Info", content: "Need assistance? Our support team is here to help.\n\nContact us via email at support@snatchd.com.\n\nFAQs:\n\nQ: How do I track my order?\nA: Go to the Orders tab and select 'Active Orders' to view live tracking.\n\nQ: What payment methods do you accept?\nA: We accept all major credit cards and Apple Pay.")) {
                                SettingsRow(title: "Help and Information")
                            }
                            Divider().background(Color.gray.opacity(0.3))
                            NavigationLink(destination: StaticContentView(title: "Terms of Service", content: "Terms of Service\n\nLast Updated: December 2024\n\n1. Acceptance of Terms\nBy accessing and using Snatchd, you accept and agree to be bound by the terms and provision of this agreement.\n\n2. Use License\nPermission is granted to temporarily download one copy of the materials (information or software) on Snatchd's application for personal, non-commercial transitory viewing only.\n\n3. Disclaimer\nThe materials on Snatchd's application are provided 'as is'. Snatchd makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.")) {
                                SettingsRow(title: "Terms of Service")
                            }
                            Divider().background(Color.gray.opacity(0.3))
                            NavigationLink(destination: StaticContentView(title: "Privacy Policy", content: "Privacy Policy\n\nLast Updated: December 2024\n\n1. Information Collection\nWe collect information efficiently to provide you with the best experience. This includes personal information provided during registration and usage data.\n\n2. Use of Information\nWe use the information we collect to operate and maintain our application, send you marketing communications, and respond to your comments and questions.\n\n3. Data Security\nWe implement a variety of security measures to maintain the safety of your personal information when you place an order or enter, submit, or access your personal information.")) {
                                SettingsRow(title: "Privacy Policy")
                            }
                        }
                        .background(Color.white.opacity(0.05))
                        .cornerRadius(15)
                        .padding(.horizontal)
                        
                        // Developer Tools (Temporary)
                        VStack(spacing: 0) {
                            NavigationLink(destination: FirestoreSeederView()) {
                                SettingsRow(title: "Developer Tools (Seeder)")
                            }
                        }
                        .background(Color.white.opacity(0.05))
                        .cornerRadius(15)
                        .padding(.horizontal)
                        
                            // Log Out
                        Button(action: {
                            showLogoutConfirmation = true
                        }) {
                            Text("Log Out")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .overlay(
                                    RoundedRectangle(cornerRadius: 25)
                                        .stroke(Color.white.opacity(0.3), lineWidth: 1)
                                )
                                .cornerRadius(25)
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 100) // Space for Tab Bar
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showImagePicker) {
                ImagePicker(image: $selectedImage)
                    .onDisappear {
                        if let selectedImage = selectedImage {
                            profileManager.saveProfileImage(selectedImage)
                        }
                    }
            }
            .confirmationDialog("Profile Photo", isPresented: $showActionSheet, titleVisibility: .visible) {
                Button("View Photo") {
                    showFullImage = true
                }
                Button("Change Photo") {
                    showImagePicker = true
                }
                Button("Remove Photo", role: .destructive) {
                    profileManager.deleteProfileImage()
                }
                Button("Cancel", role: .cancel) {}
            }
            .alert(isPresented: $showLogoutConfirmation) {
                Alert(
                    title: Text("Sign Out"),
                    message: Text("Are you sure you want to sign out?"),
                    primaryButton: .destructive(Text("Sign Out")) {
                        authManager.logout()
                    },
                    secondaryButton: .cancel()
                )
            }
            .fullScreenCover(isPresented: $showFullImage) {
                if let profileImage = profileManager.profileImage {
                    FullScreenImageView(image: profileImage, isPresented: $showFullImage)
                }
            }
        }
        .id(navID)
    }
}

struct QuickLinkCard: View {
    let icon: String
    let title: String
    
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
            Text(title)
                .font(.custom("Montserrat-Medium", size: 14))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color.white.opacity(0.05))
        .cornerRadius(15)
        .overlay(
            RoundedRectangle(cornerRadius: 15)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

struct SettingsRow: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.custom("Montserrat-Medium", size: 16))
                .foregroundColor(.white)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .contentShape(Rectangle()) // Ensure whole row is tappable
    }
}

// MARK: - ImagePicker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.presentationMode) var presentationMode
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.allowsEditing = true
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let editedImage = info[.editedImage] as? UIImage {
                parent.image = editedImage
            } else if let originalImage = info[.originalImage] as? UIImage {
                parent.image = originalImage
            }
            parent.presentationMode.wrappedValue.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.presentationMode.wrappedValue.dismiss()
        }
    }
}

// MARK: - FullScreenImageView
struct FullScreenImageView: View {
    let image: UIImage
    @Binding var isPresented: Bool
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        isPresented = false
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                            .padding()
                    }
                }
                Spacer()
            }
        }
    }
}

#Preview {
    ProfileView(navID: UUID())
        .preferredColorScheme(.dark)
}
