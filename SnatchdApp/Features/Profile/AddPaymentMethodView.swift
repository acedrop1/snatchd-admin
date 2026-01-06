import SwiftUI

struct AddPaymentMethodView: View {
    @ObservedObject var paymentManager: PaymentManager
    @Environment(\.presentationMode) var presentationMode
    
    @State private var cardNumber: String = ""
    @State private var cardholderName: String = ""
    @State private var expirationMonth: String = ""
    @State private var expirationYear: String = ""
    @State private var cvv: String = ""
    @State private var billingZip: String = ""
    @State private var isDefault: Bool = false
    
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Error Message
                        if let error = errorMessage {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(error)
                                    .font(.custom("Montserrat-Medium", size: 14))
                                    .foregroundColor(.white)
                            }
                            .padding()
                            .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Card Number
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Card Number")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.gray)
                            
                            TextField("1234 5678 9012 3456", text: $cardNumber)
                                .font(.custom("Montserrat-Regular", size: 16))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .keyboardType(.numberPad)
                                .onChange(of: cardNumber) { newValue in
                                    cardNumber = formatCardNumber(newValue)
                                }
                                .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Cardholder Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Cardholder Name")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.gray)
                            
                            TextField("John Doe", text: $cardholderName)
                                .font(.custom("Montserrat-Regular", size: 16))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .autocapitalization(.words)
                                .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Expiration & CVV
                        HStack(spacing: 15) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Expiration")
                                    .font(.custom("Montserrat-Medium", size: 14))
                                    .foregroundColor(.gray)
                                
                                HStack(spacing: 8) {
                                    TextField("MM", text: $expirationMonth)
                                        .font(.custom("Montserrat-Regular", size: 16))
                                        .foregroundColor(.white)
                                        .padding(.vertical, 16)
                                        .padding(.horizontal, 16)
                                        .keyboardType(.numberPad)
                                        .onChange(of: expirationMonth) { newValue in
                                            if newValue.count > 2 {
                                                expirationMonth = String(newValue.prefix(2))
                                            }
                                        }
                                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                                    
                                    Text("/")
                                        .foregroundColor(.gray)
                                    
                                    TextField("YY", text: $expirationYear)
                                        .font(.custom("Montserrat-Regular", size: 16))
                                        .foregroundColor(.white)
                                        .padding(.vertical, 16)
                                        .padding(.horizontal, 16)
                                        .keyboardType(.numberPad)
                                        .onChange(of: expirationYear) { newValue in
                                            if newValue.count > 2 {
                                                expirationYear = String(newValue.prefix(2))
                                            }
                                        }
                                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                                }
                            }
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("CVV")
                                    .font(.custom("Montserrat-Medium", size: 14))
                                    .foregroundColor(.gray)
                                
                                TextField("123", text: $cvv)
                                    .font(.custom("Montserrat-Regular", size: 16))
                                    .foregroundColor(.white)
                                    .padding(.vertical, 16)
                                    .padding(.horizontal, 16)
                                    .keyboardType(.numberPad)
                                    .onChange(of: cvv) { newValue in
                                        if newValue.count > 4 {
                                            cvv = String(newValue.prefix(4))
                                        }
                                    }
                                    .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        
                        // Billing ZIP
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Billing ZIP Code")
                                .font(.custom("Montserrat-Medium", size: 14))
                                .foregroundColor(.gray)
                            
                            TextField("10012", text: $billingZip)
                                .font(.custom("Montserrat-Regular", size: 16))
                                .foregroundColor(.white)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 16)
                                .keyboardType(.numberPad)
                                .onChange(of: billingZip) { newValue in
                                    if newValue.count > 5 {
                                        billingZip = String(newValue.prefix(5))
                                    }
                                }
                                .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        }
                        
                        // Set as Default
                        Toggle(isOn: $isDefault) {
                            Text("Set as default payment method")
                                .font(.custom("Montserrat-Medium", size: 16))
                                .foregroundColor(.white)
                        }
                        .padding()
                        .glassEffect(in: RoundedRectangle(cornerRadius: 12))
                        
                        // Add Button
                        Button(action: addCard) {
                            Text("Add Card")
                                .font(.custom("Montserrat-SemiBold", size: 18))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 25))
                        .overlay(
                            RoundedRectangle(cornerRadius: 25)
                                .stroke(Color.white.opacity(0.3), lineWidth: 1)
                        )
                        
                        Spacer(minLength: 50)
                    }
                    .padding()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.white)
                }
                
                ToolbarItem(placement: .principal) {
                    Text("Add Payment Method")
                        .font(.custom("Montserrat-Bold", size: 18))
                        .foregroundColor(.white)
                }
            }
        }
    }
    
    private func formatCardNumber(_ input: String) -> String {
        let digits = input.filter { $0.isNumber }
        var formatted = ""
        for (index, char) in digits.enumerated() {
            if index > 0 && index % 4 == 0 {
                formatted += " "
            }
            formatted.append(char)
            if formatted.count >= 19 { break } // Max 16 digits + 3 spaces
        }
        return formatted
    }
    
    private func addCard() {
        // Validation
        errorMessage = nil
        
        let cleanCardNumber = cardNumber.filter { $0.isNumber }
        
        guard paymentManager.isValidCardNumber(cleanCardNumber) else {
            errorMessage = "Invalid card number"
            return
        }
        
        guard !cardholderName.isEmpty else {
            errorMessage = "Cardholder name is required"
            return
        }
        
        guard let month = Int(expirationMonth), month >= 1 && month <= 12 else {
            errorMessage = "Invalid expiration month"
            return
        }
        
        guard let year = Int(expirationYear), year >= 0 else {
            errorMessage = "Invalid expiration year"
            return
        }
        
        guard cvv.count >= 3 && cvv.count <= 4 else {
            errorMessage = "CVV must be 3-4 digits"
            return
        }
        
        guard billingZip.count == 5 else {
            errorMessage = "ZIP code must be 5 digits"
            return
        }
        
        // Create payment method
        let cardType = paymentManager.detectCardType(cleanCardNumber)
        let last4 = String(cleanCardNumber.suffix(4))
        
        let newMethod = PaymentMethod(
            id: UUID(),
            cardNumber: last4,
            cardholderName: cardholderName,
            expirationMonth: month,
            expirationYear: 2000 + year,
            cardType: cardType,
            isDefault: isDefault
        )
        
        paymentManager.addPaymentMethod(newMethod)
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    AddPaymentMethodView(paymentManager: PaymentManager())
        .preferredColorScheme(.dark)
}
