import SwiftUI
import UIKit

// MARK: - enableSwipeBack()
// For views pushed via NavigationLink (inside NavigationView / NavigationStack).
// UINavigationController+Extensions.swift already sets the gesture delegate globally,
// so this just ensures the recogniser is enabled for the current nav controller.

extension View {
    func enableSwipeBack() -> some View {
        self.background(SwipeBackEnabler())
    }
}

private struct SwipeBackEnabler: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        UIViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        DispatchQueue.main.async {
            uiViewController.navigationController?.interactivePopGestureRecognizer?.isEnabled = true
        }
    }
}

// MARK: - swipeToDismiss()
// For views presented via fullScreenCover (no UINavigationController involved).
// Detects a right-swipe that starts within 60 pts of the left edge and travels
// at least 100 pts horizontally with less vertical drift than horizontal movement.
// Also slides the view slightly with the finger for a native feel.

extension View {
    func swipeToDismiss(onDismiss: @escaping () -> Void) -> some View {
        self.modifier(SwipeToDismissModifier(onDismiss: onDismiss))
    }
}

private struct SwipeToDismissModifier: ViewModifier {
    let onDismiss: () -> Void
    @State private var dragOffset: CGFloat = 0
    @State private var isDragging = false

    func body(content: Content) -> some View {
        content
            .offset(x: max(0, dragOffset))
            .animation(.interactiveSpring(response: 0.3, dampingFraction: 0.8), value: dragOffset)
            .gesture(
                DragGesture(minimumDistance: 20, coordinateSpace: .global)
                    .onChanged { value in
                        guard value.startLocation.x < 60 else {
                            return
                        }
                        let horizontal = value.translation.width
                        let vertical = abs(value.translation.height)
                        guard horizontal > 0, vertical < horizontal else {
                            dragOffset = 0
                            return
                        }
                        isDragging = true
                        dragOffset = horizontal
                    }
                    .onEnded { value in
                        guard isDragging else { return }
                        isDragging = false
                        let horizontal = value.translation.width
                        let velocity = value.predictedEndTranslation.width
                        if horizontal > 100 || velocity > 400 {
                            onDismiss()
                        }
                        withAnimation(.spring()) {
                            dragOffset = 0
                        }
                    }
            )
    }
}
