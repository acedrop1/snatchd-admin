import SwiftUI



// MARK: - Order History
struct OrderHistoryView: View {
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack {
                CustomNavBar(title: "Order History")
                
                ScrollView {
                    VStack(spacing: 20) {
                        Spacer().frame(height: 50)
                        
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 60))
                            .foregroundColor(.gray.opacity(0.5))
                        
                        Text("No past orders")
                            .font(.custom("Montserrat-SemiBold", size: 20))
                            .foregroundColor(.white)
                        
                        Text("Your past orders will appear here once you've completed a purchase.")
                            .font(.custom("Montserrat-Regular", size: 14))
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 50)
                }
            }
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
    }
}

// MARK: - Helper Views

struct ToggleRow: View {
    let title: String
    @Binding var isOn: Bool
    
    var body: some View {
        HStack {
            Text(title)
                .font(.custom("Montserrat-Medium", size: 16))
                .foregroundColor(.white)
            Spacer()
            Toggle("", isOn: $isOn)
                .toggleStyle(SwitchToggleStyle(tint: .white))
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(15)
    }
}

// MARK: - Static Views (Help, Terms, Privacy)
struct StaticContentView: View {
    let title: String
    let content: String
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            VStack {
                CustomNavBar(title: title)
                
                ScrollView {
                    Text(content)
                        .font(.custom("Montserrat-Regular", size: 14))
                        .foregroundColor(.gray)
                        .padding()
                        .lineSpacing(5)
                }
            }
        }
        .navigationBarHidden(true)
        .enableSwipeBack()
    }
}

// MARK: - Helper Components

struct CustomNavBar: View {
    let title: String
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        HStack {
            Button(action: {
                presentationMode.wrappedValue.dismiss()
            }) {
                Image(systemName: "chevron.left")
                    .font(.title2)
                    .foregroundColor(.white)
                    .padding()
                    .background(Circle().fill(Color.white.opacity(0.1)))
            }
            
            Spacer()
            
            Text(title)
                .font(.custom("Montserrat-Bold", size: 18))
                .foregroundColor(.white)
            
            Spacer()
            
            // Invisible spacer to balance title
            Image(systemName: "chevron.left")
                .font(.title2)
                .foregroundColor(.clear)
                .padding()
        }
        .padding(.horizontal)
        .padding(.top, 10)
    }
}

struct CustomTextField: View {
    let placeholder: String
    @Binding var text: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(placeholder)
                .font(.custom("Montserrat-Medium", size: 12))
                .foregroundColor(.gray)
            
            TextField("", text: $text)
                .font(.custom("Montserrat-Regular", size: 16))
                .foregroundColor(.white)
                .padding()
                .background(Color.white.opacity(0.05))
                .cornerRadius(10)
        }
    }
}
