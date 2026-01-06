import SwiftUI
import WebKit

struct LandingView: View {
    var body: some View {
        NavigationView {
            ZStack {
                // Background GIF
                Color.black.ignoresSafeArea() // Fallback/Base
                
                GifView(gifName: "welcome_bg")
                    .ignoresSafeArea()
                    .opacity(0.5) // Adjust opacity if needed
                
                // Overlay Gradient
                LinearGradient(gradient: Gradient(colors: [Color.black.opacity(0.3), Color.black]), startPoint: .top, endPoint: .bottom)
                    .ignoresSafeArea()
                
                VStack {
                    // Logo
                    Image("whitelogo")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 20)
                        .padding(.top, 60)
                    
                    Spacer()
                    
                    // Main Text
                    VStack(spacing: 10) {
                        Text("The City's\nFinest,\nDelivered.")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                        
                        Text("Shop Manhattan's luxury stores from your phone. Our white-glove couriers deliver your selections to you, instantly")
                            .font(.body)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .padding(.top, 10)
                    }
                    
                    // Pagination Dots
                    HStack(spacing: 8) {
                        Circle().fill(Color.white).frame(width: 8, height: 8)
                        Circle().stroke(Color.white).frame(width: 8, height: 8)
                        Circle().stroke(Color.white).frame(width: 8, height: 8)
                    }
                    .padding(.vertical, 30)
                    
                    Spacer()
                }
                
                
                // Fixed Bottom Section
                VStack {
                    Spacer()
                    
                    VStack(spacing: 15) {
                        NavigationLink(destination: AuthView()) {
                            Text("Create an account")
                                .font(.custom("Montserrat-Bold", size: 18))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                        }
                        
                        NavigationLink(destination: AuthView(initialTab: false)) {
                            Text("Or Sign in")
                                .font(.custom("Montserrat-SemiBold", size: 16))
                                .foregroundColor(.white)
                        }
                    }
                    .padding(.horizontal, 30)
                    .padding(.bottom, 40)
                }
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
        .accentColor(.white)
    }
}

struct GifView: UIViewRepresentable {
    let gifName: String

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.scrollView.isScrollEnabled = false
        webView.isUserInteractionEnabled = false
        webView.backgroundColor = .clear
        webView.isOpaque = false
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        guard let url = Bundle.main.url(forResource: gifName, withExtension: "gif") else { return }
        
        // Create HTML wrapper that scales the GIF to fill the screen
        let html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                }
                html, body {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    background: transparent;
                }
                img {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    min-width: 100%;
                    min-height: 100%;
                    width: auto;
                    height: auto;
                    transform: translate(-50%, -50%);
                    object-fit: cover;
                }
            </style>
        </head>
        <body>
            <img src="\(url.lastPathComponent)" />
        </body>
        </html>
        """
        
        uiView.loadHTMLString(html, baseURL: url.deletingLastPathComponent())
    }
}


#Preview {
    LandingView()
        .preferredColorScheme(.dark)
}
