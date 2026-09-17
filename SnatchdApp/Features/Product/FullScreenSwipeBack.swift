import SwiftUI
import UIKit

// MARK: - Public modifier

extension View {
    /// Replaces the edge-only interactivePopGestureRecognizer with a full-screen
    /// UIPanGestureRecognizer that drives the same native UINavigationController
    /// interactive-pop transition — so the previous screen slides in from the left
    /// exactly like the built-in swipe-back, but from anywhere on screen.
    func fullScreenSwipeBack() -> some View {
        background(FullScreenSwipeBackInstaller())
    }
}

// MARK: - UIViewRepresentable

private struct FullScreenSwipeBackInstaller: UIViewRepresentable {

    func makeUIView(context: Context) -> UIView {
        let v = PassthroughView()
        v.backgroundColor = .clear
        v.isUserInteractionEnabled = false
        return v
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        // Defer until the view is in the hierarchy so we can walk the responder chain.
        DispatchQueue.main.async {
            guard
                let nav = uiView.firstParentNavigationController(),
                nav.viewControllers.count > 1,
                let builtIn = nav.interactivePopGestureRecognizer,
                let interactiveTransition = builtIn.delegate
            else { return }

            // Don't install twice.
            if nav.view.gestureRecognizers?.contains(where: { $0 is FullWidthPopPan }) == true {
                return
            }

            // The private selector that drives the interactive pop transition.
            let sel = NSSelectorFromString("handleNavigationTransition:")
            guard interactiveTransition.responds(to: sel) else { return }

            let pan = FullWidthPopPan(target: interactiveTransition, action: sel)
            pan.maximumNumberOfTouches = 1
            pan.delegate = context.coordinator
            nav.view.addGestureRecognizer(pan)

            context.coordinator.nav = nav
            context.coordinator.builtIn = builtIn

            // Disable the edge-only recognizer; ours covers the full screen.
            builtIn.isEnabled = false
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    // MARK: Coordinator

    class Coordinator: NSObject, UIGestureRecognizerDelegate {
        weak var nav: UINavigationController?
        weak var builtIn: UIGestureRecognizer?

        /// Only begin when there's somewhere to pop to and the finger moves right.
        func gestureRecognizerShouldBegin(_ gr: UIGestureRecognizer) -> Bool {
            guard
                let nav,
                nav.viewControllers.count > 1,
                let pan = gr as? UIPanGestureRecognizer,
                let view = pan.view
            else { return false }

            let vel = pan.velocity(in: view)
            // Require a clearly rightward, mostly-horizontal swipe.
            return vel.x > 0 && vel.x > abs(vel.y) * 1.2
        }

        /// Allow simultaneous recognition with UIScrollView pan recognizers so vertical
        /// scrolling in the image area has no delay.
        func gestureRecognizer(
            _ gr: UIGestureRecognizer,
            shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer
        ) -> Bool { other.view is UIScrollView }

        func gestureRecognizer(
            _ gr: UIGestureRecognizer,
            shouldRequireFailureOf other: UIGestureRecognizer
        ) -> Bool { false }

        /// For SwiftUI DragGesture recognizers (the card's highPriorityGesture), make them
        /// wait for our pan to resolve instead of competing with it.
        /// - Our pan succeeds (rightward swipe) → SwiftUI pan is cancelled, pop completes.
        /// - Our pan fails (vertical/leftward) → SwiftUI pan fires normally (sheet expands/collapses).
        func gestureRecognizer(
            _ gr: UIGestureRecognizer,
            shouldBeRequiredToFailBy other: UIGestureRecognizer
        ) -> Bool {
            guard other is UIPanGestureRecognizer else { return false }
            // Scroll views already handled via simultaneous recognition — don't apply here.
            return !(other.view is UIScrollView)
        }
    }
}

// MARK: - Helpers

/// Subclass so we can identify our recognizer later.
private class FullWidthPopPan: UIPanGestureRecognizer {}

/// A UIView that passes all hit-tests through to the layer beneath it.
private class PassthroughView: UIView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        let hit = super.hitTest(point, with: event)
        return hit == self ? nil : hit
    }
}

private extension UIView {
    func firstParentNavigationController() -> UINavigationController? {
        var responder: UIResponder? = next
        while let current = responder {
            if let vc = current as? UIViewController {
                return vc.navigationController
            }
            responder = current.next
        }
        return nil
    }
}
