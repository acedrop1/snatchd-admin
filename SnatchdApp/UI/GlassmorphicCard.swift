import SwiftUI

// MARK: - Apple iOS 18+ Liquid Glass Implementation
// Using Apple's native glassEffect(_:in:) API as per:
// https://developer.apple.com/documentation/SwiftUI/View/glassEffect(_:in:)

extension View {
    /// Glass effect modifier that applies Apple's Liquid Glass within a shape
    /// Uses native glassEffect(_:in:) on iOS 18+, falls back to custom implementation for iOS < 18
    @ViewBuilder
    func glassEffect<S: Shape>(in shape: S) -> some View {
        if #available(iOS 18.0, *) {
            // Use Apple's native glassEffect API with .regular style
            // This is the official Liquid Glass implementation
            self.glassEffect(.regular, in: shape)
        } else {
            // Fallback for iOS < 18
            self
                .background(
                    ZStack {
                        VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                        Color.glassBackground
                    }
                    .clipShape(shape)
                )
                .overlay(
                    shape
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.white.opacity(0.5),
                                    Color.white.opacity(0.1),
                                    Color.white.opacity(0.3)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1.5
                        )
                )
                .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
        }
    }
    
    /// Glass effect modifier without shape parameter
    /// Uses Apple's native glassEffect on iOS 18+, fallback for earlier versions
    @ViewBuilder
    func glassEffect() -> some View {
        if #available(iOS 18.0, *) {
            // Use Apple's native glassEffect API with default shape
            self.glassEffect(.regular, in: RoundedRectangle(cornerRadius: 20))
        } else {
            // Fallback for iOS < 18 - use custom implementation with default shape
            self
                .background(
                    ZStack {
                        VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                        Color.glassBackground
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.white.opacity(0.5),
                                    Color.white.opacity(0.1),
                                    Color.white.opacity(0.3)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1.5
                        )
                )
                .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
        }
    }
    
    /// Legacy glassmorphic modifier (kept for compatibility)
    func glassmorphic() -> some View {
        self.glassEffect()
    }
}

// Helper for Blur Effect (used as fallback for iOS < 18)
struct VisualEffectBlur: UIViewRepresentable {
    var blurStyle: UIBlurEffect.Style
    
    func makeUIView(context: Context) -> UIVisualEffectView {
        return UIVisualEffectView(effect: UIBlurEffect(style: blurStyle))
    }
    
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        uiView.effect = UIBlurEffect(style: blurStyle)
    }
}
