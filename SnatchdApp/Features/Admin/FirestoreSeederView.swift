import SwiftUI
import FirebaseFirestore

struct FirestoreSeederView: View {
    @State private var status = "Ready to Seed"
    @State private var isSeeding = false
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 30) {
                Text("Database Seeder")
                    .font(.custom("Montserrat-Bold", size: 24))
                    .foregroundColor(.white)
                
                Text(status)
                    .font(.custom("Montserrat-Regular", size: 16))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding()
                
                Button(action: seedDatabase) {
                    HStack {
                        if isSeeding {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .black))
                        } else {
                            Image(systemName: "cloud.upload")
                        }
                        Text(isSeeding ? "Uploading..." : "Upload Mock Data")
                    }
                    .font(.custom("Montserrat-Bold", size: 16))
                    .foregroundColor(.black)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.white)
                    .cornerRadius(15)
                }
                .disabled(isSeeding)
            }
            .padding()
        }
    }
    
    func seedDatabase() {
        isSeeding = true
        status = "Starting..."
        
        let db = Firestore.firestore()
        let dispatchGroup = DispatchGroup()
        
        // 1. Upload Stores
        for store in MockDataService.shared.stores {
            dispatchGroup.enter()
            let data: [String: Any] = [
                "name": store.name,
                "category": store.category,
                "imageName": store.imageName,
                "deliveryTime": store.deliveryTime,
                "isSystemImage": store.isSystemImage
            ]
            
            db.collection("stores").addDocument(data: data) { error in
                if let error = error {
                    print("Error adding store: \(error)")
                }
                dispatchGroup.leave()
            }
        }
        
        // 2. Upload Products
        for product in MockDataService.shared.trendingProducts {
            dispatchGroup.enter()
            let data: [String: Any] = [
                "title": product.title,
                "brand": product.brand,
                "price": product.price,
                "imageName": product.imageName,
                "deliveryTime": product.deliveryTime,
                "category": product.category
            ]
            
            db.collection("products").addDocument(data: data) { error in
                if let error = error {
                    print("Error adding product: \(error)")
                }
                dispatchGroup.leave()
            }
        }
        
        dispatchGroup.notify(queue: .main) {
            isSeeding = false
            status = "Success! Uploaded \(MockDataService.shared.stores.count) stores and \(MockDataService.shared.trendingProducts.count) products."
        }
    }
}
