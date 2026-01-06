import SwiftUI

struct SplashScreenView: View {
    @State private var isActive = false
    @State private var opacity = 1.0
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        if isActive {
            // Main App Entry
            if authManager.isAuthenticated {
                ContentView()
                    .transition(.opacity.animation(.easeOut(duration: 0.5)))
            } else {
                LandingView()
                    .transition(.opacity.animation(.easeOut(duration: 0.5)))
            }
        } else {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                VStack {
                    Image("SplashLogoFixed")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: 175, maxHeight: 175)
                        .padding(.bottom, 10) // Move 10px higher
                }
                .opacity(opacity)
                .onAppear {
                    // Hold for 1.5 seconds then fade out
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        withAnimation(.easeOut(duration: 0.5)) {
                            self.isActive = true
                        }
                    }
                }
            }
        }
    }
}
