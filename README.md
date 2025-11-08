# BlueGuard - Ocean Conservation Platform

A React + Next.js application that helps users classify ocean waste, track cleanup points, and share recycled art creations.

## Features

- **Waste Classification**: Upload images of ocean waste and get AI-powered classification with recyclability status
- **Cleanup Tracking**: Log cleanup locations on an interactive map, earn points, and track environmental impact
- **Recycled Art Gallery**: Share creative artworks made from ocean waste and inspire the community
- **User Profiles**: Track personal statistics, achievements, badges, and progress levels
- **Firebase Authentication**: Secure login with email/password and Google OAuth

## Tech Stack

- **Frontend**: React 19 + Next.js 16 (App Router)
- **Styling**: TailwindCSS v4
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Maps**: React Leaflet + OpenStreetMap
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Firebase project ([Create one here](https://console.firebase.google.com/))

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd blueguard-app
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up Firebase**
   
   a. Go to [Firebase Console](https://console.firebase.google.com/)
   
   b. Create a new project or use an existing one
   
   c. Enable Authentication:
      - Go to Authentication > Sign-in method
      - Enable Email/Password and Google providers
   
   d. Create Firestore Database:
      - Go to Firestore Database > Create database
      - Start in test mode (you can update rules later)
   
   e. Set up Storage:
      - Go to Storage > Get started
      - Start in test mode

4. **Configure environment variables**
   
   a. Copy the example environment file:
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`
   
   b. Get your Firebase config:
      - In Firebase Console, go to Project Settings (gear icon)
      - Scroll down to "Your apps" section
      - Click on the Web app or create one
      - Copy the config values
   
   c. Update `.env.local` with your Firebase credentials

5. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

\`\`\`
blueguard-app/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Homepage
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── classify/          # Waste classification
│   ├── cleanup/           # Cleanup tracking map
│   ├── gallery/           # Recycled art gallery
│   ├── profile/           # User profile
│   ├── layout.tsx         # Root layout with navbar
│   └── globals.css        # Global styles with ocean theme
├── components/            # React components
│   └── Navbar.tsx         # Navigation bar
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── lib/                   # Utility functions
│   └── firebase.ts        # Firebase configuration
└── public/                # Static assets
\`\`\`

## Key Features Explained

### Authentication
Users can sign up and log in using:
- Email and password
- Google OAuth

All routes except home, login, and signup require authentication.

### Waste Classification
- Upload ocean waste images
- Get AI-powered classification (simulated)
- View recyclability status
- Auto-saves to Firebase Firestore

### Cleanup Tracking
- Interactive Leaflet map
- Click to select cleanup locations
- Log waste amount, types, and descriptions
- Earn points based on waste collected
- View recent community cleanups

### Art Gallery
- Upload recycled art creations
- Add title, description, and materials used
- Browse community artworks
- Like feature for engagement

### User Profile
- Personal statistics dashboard
- Achievement badges
- Progress levels (Beginner → Expert)
- Environmental impact metrics

## Firebase Collections Structure

### users
\`\`\`typescript
{
  userId: string
  displayName: string
  email: string
  createdAt: string (ISO)
  cleanupPoints: number
  wasteClassified: number
  artShared: number
}
\`\`\`

### classifications
\`\`\`typescript
{
  userId: string
  userName: string
  category: string
  confidence: number
  imageUrl: string
  timestamp: string (ISO)
}
\`\`\`

### cleanupPoints
\`\`\`typescript
{
  userId: string
  userName: string
  location: { lat: number, lng: number }
  description: string
  wasteAmount: string
  wasteTypes: string[]
  points: number
  timestamp: string (ISO)
}
\`\`\`

### artworks
\`\`\`typescript
{
  userId: string
  userName: string
  title: string
  description: string
  materials: string
  imageUrl: string
  likes: number
  timestamp: string (ISO)
}
\`\`\`

## Environment Variables

Create a `.env.local` file with your Firebase credentials:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

See `.env.local.example` for a template.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for ocean conservation
