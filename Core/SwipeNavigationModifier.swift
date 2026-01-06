import SwiftUI

struct SwipeNavigationModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(SwipeNavigationHandler())
    }
}

struct SwipeNavigationHandler: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = UIViewController()
        controller.view.backgroundColor = .clear
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        context.coordinator.controller = uiViewController
        
        // Use main queue to ensure navigation controller is attached
        DispatchQueue.main.async {
            if let navigationController = uiViewController.navigationController {
                navigationController.interactivePopGestureRecognizer?.delegate = context.coordinator
                navigationController.interactivePopGestureRecognizer?.isEnabled = true
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, UIGestureRecognizerDelegate {
        weak var controller: UIViewController?
        
        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            return controller?.navigationController?.viewControllers.count ?? 0 > 1
        }
        
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
            return true
        }
    }
}

extension View {
    func enableSwipeBack() -> some View {
        self.modifier(SwipeNavigationModifier())
    }
}
