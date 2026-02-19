# 🌍 Safarnama: Your Ultimate Travel Companion

Safarnama is a feature-rich, community-driven travel blogging platform designed to empower travelers. Whether you're documenting your own journeys or looking for inspiration, Safarnama provides the tools to create, share, and connect in a modern, AI-enhanced environment.

---

## 🚀 Key Features

### 🔐 Secure Authentication
- **Multi-method Login**: Sign up or log in using local email/password or seamless OAuth integration with **Google** and **GitHub**.
- **Secure Sessions**: Powered by JWT and Passport.js for a safe browsing experience.

### 🤖 AI-Powered Content Creation
- **Instant Blog Generation**: Use the built-in AI to generate high-quality travel blogs.
  - **From Topics**: Simply provide a keyword or title.
  - **From PDFs**: Upload a travel brochure or document and let the AI extract the essence.
  - **From Links**: Paste a URL to summarize and re-imagine travel articles.
- **Content Editor**: A powerful editor with support for cover images and multimedia attachments.

### 👥 Social & Community Interaction
- **Personalized Profiles**: Showcase your travel stories and manage your content through a custom user dashboard.
- **Social Connect**: Follow your favorite travelers to stay updated on their latest adventures.
- **Engagement Tools**: Express yourself by liking or disliking posts and engaging in real-time discussion via comments.

### 💬 Real-time Communication
- **P2P Chat**: Connect directly with other travelers to share tips and experiences.
- **AI Travel Assistant**: A real-time chatbot (powered by Groq AI) available to answer your travel queries 24/7.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Frontend**: EJS (Embedded JavaScript Templates), Vanilla CSS
- **AI Integration**: Groq AI
- **Real-time**: Socket.io
- **Security**: Helmet, JWT, Cookie-parser
- **File Handling**: Multer

---

## 📂 Project Structure

```text
├── config/             # Passport and configuration files
├── gateway/            # Socket.io logic
├── middlewares/        # Custom Express middlewares
├── models/             # Mongoose schemas (User, Blog, Comment, Chat)
├── public/             # Static assets (CSS, JS, Uploads, Images)
├── routes/             # API and Page routes
├── services/           # Business logic services
├── views/              # EJS templates for the UI
├── index.js            # Main entry point
└── package.json        # Dependencies and scripts
```

---

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Shriharipise18/Safarnama.git
   cd Safarnama
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   ```env
   PORT=8000
   MONGO_URL=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_google_gemini_api_key
   GOOGLE_CLIENT_ID=your_google_oauth_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_secret
   GITHUB_CLIENT_ID=your_github_oauth_id
   GITHUB_CLIENT_SECRET=your_github_oauth_secret
   ```

4. **Run the application**:
   ```bash
   # For development
   npm run dev

   # For production
   npm start
   ```

---

## 🔮 Future Enhancements
- **Interactive Maps**: Visualize travel routes directly on the blog.
- **Offline Support**: Draft blogs even without an internet connection.
- **Advanced Social Features**: Shareable travel itineraries and group trips.

---

Made with ❤️ for Travelers.
