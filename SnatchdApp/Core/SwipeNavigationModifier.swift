import SwiftUI
import UIKit

extension View {
    func enableSwipeBack() -> some View {
        self.modifier(SwipeBackModifier())
    }
}

struct SwipeBackModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .onAppear {
                // Enable swipe back gesture when view appears
                DispatchQueue.main.async {
                    if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                       let window = windowScene.windows.first,
                       let rootViewController = window.rootViewController {
                        
                        // Find the navigation controller
                        if let navController = findNavigationController(from: rootViewController) {
                            navController.interactivePopGestureRecognizer?.isEnabled = true
                            navController.interactivePopGestureRecognizer?.delegate = nil
                        }
                    }
                }
            }
    }
    
    private func findNavigationController(from viewController: UIViewController) -> UINavigationController? {
        if let navController = viewController as? UINavigationController {
            return navController
        }
        
        for child in viewController.children {
            if let navController = findNavigationController(from: child) {
                return navController
            }
        }
        
        if let presented = viewController.presentedViewController {
            return findNavigationController(from: presented)
        }
        
        return nil
    }
}
