import SwiftUI

struct PaymentMethodsView: View {
    @StateObject private var paymentManager = PaymentManager()
    @Environment(\.presentationMode) var presentationMode
    @State private var showAddCard = false
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    Text("Payment Methods")
                        .font(.custom("Montserrat-Bold", size: 20))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    Button(action: {
                        showAddCard = true
                    }) {
                        Image(systemName: "plus")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }
                .padding()
                
                // Payment Methods List
                if paymentManager.paymentMethods.isEmpty {
                    // Empty State
                    VStack(spacing: 20) {
                        Spacer()
                        Image(systemName: "creditcard.slash")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("No Payment Methods")
                            .font(.custom("Montserrat-Bold", size: 20))
                            .foregroundColor(.white)
                        Text("Add a card to make purchases")
                            .font(.custom("Montserrat-Regular", size: 14))
                            .foregroundColor(.gray)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 15) {
                            ForEach(paymentManager.paymentMethods) { method in
                                PaymentMethodCard(
                                    method: method,
                                    onSetDefault: {
                                        paymentManager.setDefaultPaymentMethod(method)
                                    },
                                    onDelete: {
                                        paymentManager.deletePaymentMethod(method)
                                    }
                                )
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
        .sheet(isPresented: $showAddCard) {
            AddPaymentMethodView(paymentManager: paymentManager)
        }
    }
}

// MARK: - Payment Method Card
struct PaymentMethodCard: View {
    let method: PaymentMethod
    let onSetDefault: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: method.cardType.icon)
                    .font(.title2)
                    .foregroundColor(.white)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(method.cardType.rawValue)
                        .font(.custom("Montserrat-SemiBold", size: 16))
                        .foregroundColor(.white)
                    Text(method.maskedNumber)
                        .font(.custom("Montserrat-Regular", size: 14))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                if method.isDefault {
                    Text("DEFAULT")
                        .font(.custom("Montserrat-Bold", size: 10))
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue)
                        .cornerRadius(4)
                }
            }
            
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Cardholder")
                        .font(.custom("Montserrat-Regular", size: 11))
                        .foregroundColor(.gray)
                    Text(method.cardholderName)
                        .font(.custom("Montserrat-Medium", size: 13))
                        .foregroundColor(.white)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Expires")
                        .font(.custom("Montserrat-Regular", size: 11))
                        .foregroundColor(.gray)
                    Text(method.expirationString)
                        .font(.custom("Montserrat-Medium", size: 13))
                        .foregroundColor(.white)
                }
            }
            
            HStack(spacing: 15) {
                if !method.isDefault {
                    Button(action: onSetDefault) {
                        Text("Set as Default")
                            .font(.custom("Montserrat-Medium", size: 12))
                            .foregroundColor(.blue)
                    }
                }
                
                Spacer()
                
                Button(action: onDelete) {
                    HStack(spacing: 4) {
                        Image(systemName: "trash")
                        Text("Delete")
                    }
                    .font(.custom("Montserrat-Medium", size: 12))
                    .foregroundColor(.red)
                }
            }
        }
        .padding()
        .glassEffect(in: RoundedRectangle(cornerRadius: 15))
    }
}

#Preview {
    PaymentMethodsView()
        .preferredColorScheme(.dark)
}
