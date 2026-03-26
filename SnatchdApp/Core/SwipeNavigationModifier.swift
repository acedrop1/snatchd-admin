import SwiftUI
import UIKit

// MARK: - enableSwipeBack()
// For views pushed via NavigationLink.
// UINavigationController+Extensions.swift handles the gesture globally —
// this just ensures the recogniser stays enabled on the current nav controller.

extension View {
    func enableSwipeBack() -> some View {
        self.background(SwipeBackEnabler())
    }
}

private struct SwipeBackEnabler: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController { UIViewController() }
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        DispatchQueue.main.async {
            uiViewController.navigationController?.interactivePopGestureRecognizer?.isEnabled = true
        }
    }
}

// MARK: - swipeToDismiss(onDismiss:)
// For fullScreenCover views (no UINavigationController).
// Tracks the drag in real-time so the screen follows the finger.
// Horizontal swipe from the left edge only — doesn't conflict with
// vertical scroll views or sheet gestures.

extension View {
    func swipeToDismiss(onDismiss: @escaping () -> Void) -> some View {
        self.modifier(SwipeToDismissModifier(onDismiss: onDismiss))
    }
}

struct SwipeToDismissModifier: ViewModifier {
    let onDismiss: () -> Void
    @State private var offsetX: CGFloat = 0
    @State private var active = false

    private let screenWidth = UIScreen.main.bounds.width

    var dismissProgress: CGFloat { min(max(offsetX, 0) / screenWidth, 1) }

    func body(content: Content) -> some View {
        content
            .offset(x: max(0, offsetX))
            .opacity(1 - dismissProgress * 0.35)
            .animation(.interactiveSpring(response: 0.25, dampingFraction: 0.86), value: offsetX)
            .gesture(
                DragGesture(minimumDistance: 8, coordinateSpace: .global)
                    .onChanged { v in
                        let dx = v.translation.width
                        let dy = abs(v.translation.height)
                        // Activate only when swipe starts within 60 pts of left edge
                        // and is more horizontal than vertical
                        if !active {
                            guard v.startLocation.x < 60, dx > 0, dx > dy else { return }
                            active = true
                        }
                        offsetX = max(0, dx)
                    }
                    .onEnded { v in
                        guard active else { return }
                        active = false
                        let dx = v.translation.width
                        let vel = v.predictedEndTranslation.width - v.translation.width
                        if dx > screenWidth * 0.3 || vel > screenWidth * 0.4 {
                            // Fly off screen then dismiss
                            withAnimation(.easeOut(duration: 0.18)) { offsetX = screenWidth }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
                                var t = Transaction(); t.disablesAnimations = true
                                withTransaction(t) { onDismiss() }
                                offsetX = 0
                            }
                        } else {
                            withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) { offsetX = 0 }
                        }
                    }
            )
    }
}
