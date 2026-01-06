import UIKit
import SwiftUI
import FirebaseCore
import FirebaseAuth
import GoogleSignIn

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        
        // Use Firebase library to configure APIs
        FirebaseApp.configure()
        
        // Configure navigation bar appearance to support swipe back
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        
        return true
    }
    
    // MARK: - URL Handling (Google Sign In & Firebase Auth)
    func application(_ application: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        // Handle Google Sign In
        if GIDSignIn.sharedInstance.handle(url) {
            return true
        }
        
        // Handle Firebase Auth (Phone Auth reCAPTCHA)
        if Auth.auth().canHandle(url) {
            return true
        }
        
        return false
    }
    
    // MARK: - Firebase Auth Notifications
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Auth.auth().setAPNSToken(deviceToken, type: .prod)
    }
    
    func application(_ application: UIApplication, didReceiveRemoteNotification notification: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        if Auth.auth().canHandleNotification(notification) {
            completionHandler(.noData)
            return
        }
        completionHandler(.noData)
    }
    
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let sceneConfig = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        sceneConfig.delegateClass = SceneDelegate.self
        return sceneConfig
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // Enable swipe back for all navigation controllers
        if let windowScene = scene as? UIWindowScene {
            DispatchQueue.main.async {
                self.enableSwipeBack(in: windowScene)
            }
        }
    }
    
    func sceneDidBecomeActive(_ scene: UIScene) {
        // Re-enable swipe back when scene becomes active
        if let windowScene = scene as? UIWindowScene {
            enableSwipeBack(in: windowScene)
        }
    }
    
    private func enableSwipeBack(in windowScene: UIWindowScene) {
        for window in windowScene.windows {
            enableSwipeBack(in: window.rootViewController)
        }
    }
    
    private func enableSwipeBack(in viewController: UIViewController?) {
        guard let viewController = viewController else { return }
        
        if let navController = viewController as? UINavigationController {
            navController.interactivePopGestureRecognizer?.isEnabled = true
            navController.interactivePopGestureRecognizer?.delegate = nil
        }
        
        for child in viewController.children {
            enableSwipeBack(in: child)
        }
        
        if let presented = viewController.presentedViewController {
            enableSwipeBack(in: presented)
        }
    }
}
