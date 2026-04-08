import SwiftUI
import UIKit

// MARK: - enableSwipeBack()
// For NavigationLink-pushed views.

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
// For fullScreenCover views (e.g. CheckoutView). Left-edge horizontal swipe only.

extension View {
    func swipeToDismiss(onDismiss: @escaping () -> Void) -> some View {
        self.modifier(SwipeToDismissModifier(onDismiss: onDismiss))
    }
}

private struct SwipeToDismissModifier: ViewModifier {
    let onDismiss: () -> Void
    @GestureState private var dragX: CGFloat = 0
    private let screenWidth: CGFloat = (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.screen.bounds.width ?? 390

    func body(content: Content) -> some View {
        content
            .offset(x: max(0, dragX))
            .gesture(
                DragGesture(minimumDistance: 10, coordinateSpace: .global)
                    .updating($dragX) { value, state, _ in
                        let dx: CGFloat = value.translation.width
                        let dy: CGFloat = abs(value.translation.height)
                        guard value.startLocation.x < 80, dx > 0, dx > dy else { return }
                        state = dx
                    }
                    .onEnded { value in
                        let dx: CGFloat = value.translation.width
                        let predicted: CGFloat = value.predictedEndTranslation.width
                        guard value.startLocation.x < 80, dx > 0 else { return }
                        if dx > screenWidth * 0.35 || predicted > screenWidth * 0.65 {
                            onDismiss()
                        }
                    }
            )
    }
}
