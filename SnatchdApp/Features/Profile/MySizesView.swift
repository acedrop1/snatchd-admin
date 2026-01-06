import SwiftUI

struct MySizesView: View {
    @StateObject private var sizeManager = UserSizeManager()
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { presentationMode.wrappedValue.dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.title2)
                            .foregroundColor(.white)
                    }
                    Spacer()
                    Text("My Sizes")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Spacer()
                    Image(systemName: "chevron.left")
                        .font(.title2)
                        .foregroundColor(.clear)
                }
                .padding()
                .background(Color.black)
                
                ScrollView {
                    VStack(spacing: 20) {
                        Text("Save your sizes to get better recommendations.")
                            .font(.custom("Montserrat-Regular", size: 14))
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.top)
                        
                        VStack(spacing: 15) {
                            ForEach(SizeCategory.allCases, id: \.self) { category in
                                SizeSelectorRow(category: category, sizeManager: sizeManager)
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
    }
}

struct SizeSelectorRow: View {
    let category: SizeCategory
    @ObservedObject var sizeManager: UserSizeManager
    
    var body: some View {
        HStack {
            HStack(spacing: 15) {
                Image(systemName: category.icon)
                    .font(.title2)
                    .foregroundColor(.white)
                    .frame(width: 30)
                
                Text(category.rawValue)
                    .font(.custom("Montserrat-Medium", size: 16))
                    .foregroundColor(.white)
            }
            
            Spacer()
            
            Menu {
                ForEach(category.options, id: \.self) { size in
                    Button(action: {
                        sizeManager.updateSize(for: category, size: size)
                    }) {
                        Text(size)
                    }
                }
            } label: {
                HStack {
                    Text(sizeManager.getSize(for: category))
                        .font(.custom("Montserrat-SemiBold", size: 16))
                        .foregroundColor(.blue)
                    Image(systemName: "chevron.down")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(10)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(15)
        .overlay(
            RoundedRectangle(cornerRadius: 15)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

#Preview {
    MySizesView()
        .preferredColorScheme(.dark)
}
