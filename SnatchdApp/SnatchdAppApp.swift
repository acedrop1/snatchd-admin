//
//  SnatchdAppApp.swift
//  SnatchdApp
//
//  Created by Adam Shehab on 11/18/25.
//

import SwiftUI
import FirebaseCore
import FirebaseAuth
import GoogleSignIn

@main
struct SnatchdAppApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var cartManager = CartManager()
    @StateObject private var authManager = AuthManager()
    @StateObject private var addressManager = AddressManager()
    
    init() {
        // Register custom fonts if needed
        // Font.registerFonts()
    }
    
    var body: some Scene {
        WindowGroup {
            SplashScreenView()
                .preferredColorScheme(.dark)
                .tint(.white) // brand is black/white — never let system blue through
                .environmentObject(cartManager)
                .environmentObject(authManager)
                .environmentObject(addressManager)
                .onOpenURL { url in
                    print("Received URL: \(url)")
                    // Handle Google Sign In
                    if GIDSignIn.sharedInstance.handle(url) { return }
                    // Handle Firebase reCAPTCHA
                    if Auth.auth().canHandle(url) { return }
                }
        }
    }
}
