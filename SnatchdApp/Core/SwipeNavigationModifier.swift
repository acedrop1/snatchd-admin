import SwiftUI
import UIKit

// MARK: - enableSwipeBack()
// For views pushed via NavigationLink.
// UINavigationController+Extensions.swift handles the gesture globally;
// this just makes sure the recogniser stays enabled on the current nav controller.

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
// For views presented via fullScreenCover (no UINavigationController involved).
// Uses UIScreenEdgePanGestureRecognizer — a UIKit recogniser designed specifically
// for left-edge pans — so it never conflicts with scroll views or other gestures.

extension View {
    func swipeToDismiss(onDismiss: @escaping () -> Void) -> some View {
        self.background(SwipeToDismissHandler(onDismiss: onDismiss))
    }
}

private struct SwipeToDismissHandler: UIViewControllerRepresentable {
    let onDismiss: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onDismiss: onDismiss) }

    func makeUIViewController(context: Context) -> UIViewController {
        let vc = UIViewController()
        vc.view.backgroundColor = .clear
        vc.view.isUserInteractionEnabled = false
        return vc
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        context.coordinator.onDismiss = onDismiss
        guard context.coordinator.gesture == nil else { return }

        DispatchQueue.main.async {
            // Walk the parent chain to reach the UIHostingController that
            // owns this fullScreenCover — it has no further parent.
            var root: UIViewController = uiViewController
            while let p = root.parent { root = p }

            let gesture = UIScreenEdgePanGestureRecognizer(
                target: context.coordinator,
                action: #selector(Coordinator.handleEdgePan(_:))
            )
            gesture.edges = .left
            root.view.addGestureRecognizer(gesture)
            context.coordinator.gesture = gesture
        }
    }

    class Coordinator: NSObject {
        var onDismiss: () -> Void
        weak var gesture: UIScreenEdgePanGestureRecognizer?

        init(onDismiss: @escaping () -> Void) {
            self.onDismiss = onDismiss
        }

        @objc func handleEdgePan(_ gesture: UIScreenEdgePanGestureRecognizer) {
            guard gesture.state == .ended else { return }
            let translation = gesture.translation(in: gesture.view)
            let velocity = gesture.velocity(in: gesture.view)
            // Dismiss if dragged ≥25% of screen width OR flicked fast enough
            let threshold = UIScreen.main.bounds.width * 0.25
            if translation.x > threshold || velocity.x > 600 {
                DispatchQueue.main.async { self.onDismiss() }
            }
        }

        deinit {
            if let g = gesture { g.view?.removeGestureRecognizer(g) }
        }
    }
}
