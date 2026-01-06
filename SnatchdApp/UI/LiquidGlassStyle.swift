import SwiftUI

struct LiquidGlassBubble: View {
    var body: some View {
        ZStack {
            // Base Blur Layer
            VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
            
            // Glass Tint
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.white.opacity(0.25),
                    Color.white.opacity(0.05)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // Refractive Edge
            RoundedRectangle(cornerRadius: 30)
                .stroke(
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: .white.opacity(0.6), location: 0.0),
                            .init(color: .white.opacity(0.1), location: 0.3),
                            .init(color: .cyan.opacity(0.3), location: 0.5),
                            .init(color: .white.opacity(0.1), location: 0.7),
                            .init(color: .white.opacity(0.5), location: 1.0)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1.5
                )
                .padding(1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 30))
        .shadow(color: Color.black.opacity(0.2), radius: 5, x: 0, y: 2)
    }
}

extension View {
    func liquidGlassBackground() -> some View {
        self
            .padding(.vertical, 5)
            .padding(.horizontal, 12)
            .background(
                ZStack {
                    // Pure frosted glass blur - dark to match black background
                    VisualEffectBlur(blurStyle: .systemUltraThinMaterialDark)
                    
                    // Subtle gradient border for light reflection
                    RoundedRectangle(cornerRadius: 25)
                        .strokeBorder(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.white.opacity(0.5),
                                    Color.white.opacity(0.2),
                                    Color.white.opacity(0.1),
                                    Color.white.opacity(0.3)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1.5
                        )
                }
                .clipShape(RoundedRectangle(cornerRadius: 25))
                .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)
            )
    }
}
