import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth

// MARK: - Saved Address Model (Updated)
struct SavedAddress: Identifiable, Codable {
    var id: String?
    var label: String
    var street: String
    var apartment: String
    var city: String
    var state: String
    var zipCode: String
    var isDefault: Bool
    
    var address: String {
        var components = [street]
        if !apartment.isEmpty {
            components.append(apartment)
        }
        components.append("\(city), \(state) \(zipCode)")
        return components.joined(separator: ", ")
    }
}

// MARK: - Address Manager
class AddressManager: ObservableObject {
    @Published var addresses: [SavedAddress] = []
    
    private var db = Firestore.firestore()
    private var listenerRegistration: ListenerRegistration?
    private var userID: String?
    
    init() {
        // Listen for Auth changes to update userID
        Auth.auth().addStateDidChangeListener { [weak self] _, user in
            self?.userID = user?.uid
            if let uid = user?.uid {
                self?.listenToAddresses(uid: uid)
            } else {
                self?.addresses = [] // Clear addresses on logout
                self?.listenerRegistration?.remove()
            }
        }
    }
    
    deinit {
        listenerRegistration?.remove()
    }
    
    private func listenToAddresses(uid: String) {
        listenerRegistration?.remove() // Remove previous listener if any
        
        listenerRegistration = db.collection("users").document(uid).collection("addresses")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                guard let documents = snapshot?.documents else {
                    print("Error fetching addresses: \(error?.localizedDescription ?? "Unknown error")")
                    return
                }
                
                self.addresses = documents.compactMap { doc -> SavedAddress? in
                    try? doc.data(as: SavedAddress.self)
                }
            }
    }
    
    func addAddress(_ address: SavedAddress) {
        guard let uid = userID else { return }
        
        var newAddress = address
        // If no ID, Firestore generates one. But we can let Firestore generate it.
        // If set as default, we need to unset others first.
        // Note: Firestore writes are async. For "unset others", deeper logic needed or cloud function.
        // For simplicity: Update local logic via batch write.
        
        let batch = db.batch()
        let newDocRef = db.collection("users").document(uid).collection("addresses").document()
        newAddress.id = newDocRef.documentID // Assign generated ID
        
        if newAddress.isDefault {
            // Unset other defaults
            for existing in addresses where existing.isDefault {
                if let existingID = existing.id {
                    let ref = db.collection("users").document(uid).collection("addresses").document(existingID)
                    batch.updateData(["isDefault": false], forDocument: ref)
                }
            }
        }
        
        do {
            try batch.setData(from: newAddress, forDocument: newDocRef)
            batch.commit { error in
                if let error = error {
                    print("Error adding address: \(error)")
                }
            }
        } catch {
            print("Error encoding address: \(error)")
        }
    }
    
    func updateAddress(_ address: SavedAddress) {
        guard let uid = userID, let id = address.id else { return }
        
        let batch = db.batch()
        let ref = db.collection("users").document(uid).collection("addresses").document(id)
        
        if address.isDefault {
            // Unset other defaults
            for existing in addresses where existing.isDefault && existing.id != id {
                if let existingID = existing.id {
                    let otherRef = db.collection("users").document(uid).collection("addresses").document(existingID)
                    batch.updateData(["isDefault": false], forDocument: otherRef)
                }
            }
        }
        
        do {
            try batch.setData(from: address, forDocument: ref) // Overwrite
            batch.commit { error in
                if let error = error {
                    print("Error updating address: \(error)")
                }
            }
        } catch {
            print("Error encoding address: \(error)")
        }
    }
    
    func deleteAddress(_ address: SavedAddress) {
        guard let uid = userID, let id = address.id else { return }
        db.collection("users").document(uid).collection("addresses").document(id).delete()
    }
    
    func setDefaultAddress(_ address: SavedAddress) {
        guard let uid = userID, let id = address.id else { return }
        
        let batch = db.batch()
        
        // Unset all existing defaults
        for existing in addresses where existing.isDefault {
            if let existingID = existing.id {
                let ref = db.collection("users").document(uid).collection("addresses").document(existingID)
                batch.updateData(["isDefault": false], forDocument: ref)
            }
        }
        
        // Set new default
        let targetRef = db.collection("users").document(uid).collection("addresses").document(id)
        batch.updateData(["isDefault": true], forDocument: targetRef)
        
        batch.commit()
    }
    
    // Helper NOT needed for Firestore (IDs are UUIDs)
    // func getNextId() -> Int { ... }
}
