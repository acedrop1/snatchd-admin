import SwiftUI
import Combine

// MARK: - Card Type Enum
enum CardType: String, Codable {
    case visa = "Visa"
    case mastercard = "Mastercard"
    case amex = "American Express"
    case discover = "Discover"
    case unknown = "Unknown"
    
    var icon: String {
        switch self {
        case .visa: return "creditcard.fill"
        case .mastercard: return "creditcard.fill"
        case .amex: return "creditcard.fill"
        case .discover: return "creditcard.fill"
        case .unknown: return "creditcard"
        }
    }
}

// MARK: - Payment Method Model
struct PaymentMethod: Identifiable, Codable {
    let id: UUID
    var cardNumber: String // Last 4 digits only
    var cardholderName: String
    var expirationMonth: Int
    var expirationYear: Int
    var cardType: CardType
    var isDefault: Bool
    
    var maskedNumber: String {
        "**** **** **** \(cardNumber)"
    }
    
    var expirationString: String {
        String(format: "%02d/%02d", expirationMonth, expirationYear % 100)
    }
}

// MARK: - Payment Manager
class PaymentManager: ObservableObject {
    @Published var paymentMethods: [PaymentMethod] = []
    
    private let userDefaultsKey = "paymentMethods"
    
    init() {
        loadPaymentMethods()
    }
    
    private func loadPaymentMethods() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([PaymentMethod].self, from: data) {
            self.paymentMethods = decoded
        } else {
            // Default payment methods
            self.paymentMethods = [
                PaymentMethod(
                    id: UUID(),
                    cardNumber: "4242",
                    cardholderName: "John Doe",
                    expirationMonth: 12,
                    expirationYear: 2025,
                    cardType: .visa,
                    isDefault: true
                ),
                PaymentMethod(
                    id: UUID(),
                    cardNumber: "5555",
                    cardholderName: "John Doe",
                    expirationMonth: 8,
                    expirationYear: 2026,
                    cardType: .mastercard,
                    isDefault: false
                )
            ]
        }
    }
    
    private func savePaymentMethods() {
        if let encoded = try? JSONEncoder().encode(paymentMethods) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
    }
    
    func addPaymentMethod(_ method: PaymentMethod) {
        var newMethod = method
        // If this is set as default, unset others
        if newMethod.isDefault {
            for index in paymentMethods.indices {
                paymentMethods[index].isDefault = false
            }
        }
        paymentMethods.append(newMethod)
        savePaymentMethods()
    }
    
    func deletePaymentMethod(_ method: PaymentMethod) {
        paymentMethods.removeAll { $0.id == method.id }
        // If deleted method was default, set first method as default
        if method.isDefault && !paymentMethods.isEmpty {
            paymentMethods[0].isDefault = true
        }
        savePaymentMethods()
    }
    
    func setDefaultPaymentMethod(_ method: PaymentMethod) {
        for index in paymentMethods.indices {
            paymentMethods[index].isDefault = (paymentMethods[index].id == method.id)
        }
        savePaymentMethods()
    }
    
    // Card validation using Luhn algorithm
    func isValidCardNumber(_ number: String) -> Bool {
        let digits = number.filter { $0.isNumber }
        guard digits.count >= 13 && digits.count <= 19 else { return false }
        
        var sum = 0
        let reversedDigits = digits.reversed().compactMap { Int(String($0)) }
        
        // Ensure all digits were successfully converted
        guard reversedDigits.count == digits.count else { return false }
        
        for (index, digit) in reversedDigits.enumerated() {
            if index % 2 == 1 {
                let doubled = digit * 2
                sum += doubled > 9 ? doubled - 9 : doubled
            } else {
                sum += digit
            }
        }
        
        return sum % 10 == 0
    }
    
    // Detect card type from number
    func detectCardType(_ number: String) -> CardType {
        let digits = number.filter { $0.isNumber }
        guard !digits.isEmpty else { return .unknown }
        
        let firstDigit = String(digits.prefix(1))
        let firstTwo = String(digits.prefix(2))
        
        if firstDigit == "4" {
            return .visa
        } else if ["51", "52", "53", "54", "55"].contains(firstTwo) {
            return .mastercard
        } else if ["34", "37"].contains(firstTwo) {
            return .amex
        } else if firstTwo == "60" || firstTwo == "65" {
            return .discover
        }
        
        return .unknown
    }
}
