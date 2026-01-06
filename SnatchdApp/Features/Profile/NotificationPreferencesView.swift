import SwiftUI

struct NotificationPreferencesView: View {
    @Environment(\.presentationMode) var presentationMode
    
    @AppStorage("orderUpdatesEnabled") private var orderUpdatesEnabled = true
    @AppStorage("promotionalEmailsEnabled") private var promotionalEmailsEnabled = true
    @AppStorage("smsNotificationsEnabled") private var smsNotificationsEnabled = false
    @AppStorage("pushNotificationsEnabled") private var pushNotificationsEnabled = true
    @AppStorage("inAppNotificationsEnabled") private var inAppNotificationsEnabled = true
    
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
                        
                        Text("Notifications")
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
                    
                    // Order Updates
                    VStack(alignment: .leading, spacing: 15) {
                        Text("Order Updates")
                            .font(.custom("Montserrat-SemiBold", size: 16))
                            .foregroundColor(.white)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            Toggle(isOn: $orderUpdatesEnabled) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Order Status Updates")
                                        .font(.custom("Montserrat-Medium", size: 16))
                                        .foregroundColor(.white)
                                    Text("Get notified about your order status")
                                        .font(.custom("Montserrat-Regular", size: 12))
                                        .foregroundColor(.gray)
                                }
                            }
                            .padding()
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 15))
                        .padding(.horizontal)
                    }
                    
                    // Marketing
                    VStack(alignment: .leading, spacing: 15) {
                        Text("Marketing")
                            .font(.custom("Montserrat-SemiBold", size: 16))
                            .foregroundColor(.white)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            Toggle(isOn: $promotionalEmailsEnabled) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Promotional Emails")
                                        .font(.custom("Montserrat-Medium", size: 16))
                                        .foregroundColor(.white)
                                    Text("Receive special offers and promotions")
                                        .font(.custom("Montserrat-Regular", size: 12))
                                        .foregroundColor(.gray)
                                }
                            }
                            .padding()
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 15))
                        .padding(.horizontal)
                    }
                    
                    // Notification Channels
                    VStack(alignment: .leading, spacing: 15) {
                        Text("Notification Channels")
                            .font(.custom("Montserrat-SemiBold", size: 16))
                            .foregroundColor(.white)
                            .padding(.horizontal)
                        
                        VStack(spacing: 0) {
                            Toggle(isOn: $pushNotificationsEnabled) {
                                HStack {
                                    Image(systemName: "bell.badge.fill")
                                        .foregroundColor(.blue)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Push Notifications")
                                            .font(.custom("Montserrat-Medium", size: 16))
                                            .foregroundColor(.white)
                                        Text("Receive notifications on your device")
                                            .font(.custom("Montserrat-Regular", size: 12))
                                            .foregroundColor(.gray)
                                    }
                                }
                            }
                            .padding()
                            
                            Divider().background(Color.gray.opacity(0.3))
                            
                            Toggle(isOn: $smsNotificationsEnabled) {
                                HStack {
                                    Image(systemName: "message.fill")
                                        .foregroundColor(.green)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("SMS Notifications")
                                            .font(.custom("Montserrat-Medium", size: 16))
                                            .foregroundColor(.white)
                                        Text("Receive text messages for updates")
                                            .font(.custom("Montserrat-Regular", size: 12))
                                            .foregroundColor(.gray)
                                    }
                                }
                            }
                            .padding()
                            
                            Divider().background(Color.gray.opacity(0.3))
                            
                            Toggle(isOn: $inAppNotificationsEnabled) {
                                HStack {
                                    Image(systemName: "app.badge.fill")
                                        .foregroundColor(.orange)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("In-App Notifications")
                                            .font(.custom("Montserrat-Medium", size: 16))
                                            .foregroundColor(.white)
                                        Text("Show notifications while using the app")
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
}

#Preview {
    NotificationPreferencesView()
        .preferredColorScheme(.dark)
}
