import SwiftUI

struct SavedAddressesView: View {
    @EnvironmentObject var addressManager: AddressManager
    @Environment(\.presentationMode) var presentationMode
    @State private var showAddAddress = false
    @State private var editingAddress: SavedAddress?
    
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
                    
                    Text("Saved Addresses")
                        .font(.custom("Montserrat-Bold", size: 20))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    Button(action: {
                        showAddAddress = true
                    }) {
                        Image(systemName: "plus")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }
                .padding()
                
                // Address List
                if addressManager.addresses.isEmpty {
                    // Empty State
                    VStack(spacing: 20) {
                        Spacer()
                        Image(systemName: "mappin.slash")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("No Saved Addresses")
                            .font(.custom("Montserrat-Bold", size: 20))
                            .foregroundColor(.white)
                        Text("Add your first address to get started")
                            .font(.custom("Montserrat-Regular", size: 14))
                            .foregroundColor(.gray)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 15) {
                            ForEach(addressManager.addresses) { address in
                                AddressCard(
                                    address: address,
                                    onTap: {
                                        editingAddress = address
                                    },
                                    onSetDefault: {
                                        addressManager.setDefaultAddress(address)
                                    },
                                    onDelete: {
                                        addressManager.deleteAddress(address)
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
        .sheet(isPresented: $showAddAddress) {
            AddEditAddressView(addressManager: addressManager)
        }
        .sheet(item: $editingAddress) { address in
            AddEditAddressView(addressManager: addressManager, existingAddress: address)
        }
    }
}

// MARK: - Address Card
struct AddressCard: View {
    let address: SavedAddress
    let onTap: () -> Void
    let onSetDefault: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: iconName)
                            .foregroundColor(iconColor)
                        Text(address.label)
                            .font(.custom("Montserrat-SemiBold", size: 16))
                            .foregroundColor(.white)
                    }
                    
                    Spacer()
                    
                    if address.isDefault {
                        Text("DEFAULT")
                            .font(.custom("Montserrat-Bold", size: 10))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue)
                            .cornerRadius(4)
                    }
                }
                
                Text(address.address)
                    .font(.custom("Montserrat-Regular", size: 14))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.leading)
                
                HStack(spacing: 15) {
                    if !address.isDefault {
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
        }
        .glassEffect(in: RoundedRectangle(cornerRadius: 15))
    }
    
    var iconName: String {
        switch address.label {
        case "Home": return "house.fill"
        case "Work": return "briefcase.fill"
        default: return "mappin.circle.fill"
        }
    }
    
    var iconColor: Color {
        switch address.label {
        case "Home": return .blue
        case "Work": return .orange
        default: return .green
        }
    }
}

#Preview {
    SavedAddressesView()
        .preferredColorScheme(.dark)
}
