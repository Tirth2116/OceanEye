# BlueGuard Setup Guide

## Quick Start (Without Firebase)

To run the app locally without Firebase setup:

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the UI. Authentication and data features won't work without Firebase, but you can see the design and layout.

## Complete Setup (With Firebase)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: "blueguard" (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication

1. In Firebase Console, click "Authentication" in left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password":
   - Click on it
   - Toggle "Enable"
   - Click "Save"
5. Enable "Google":
   - Click on it
   - Toggle "Enable"
   - Add support email
   - Click "Save"

### Step 3: Create Firestore Database

1. Click "Firestore Database" in left sidebar
2. Click "Create database"
3. Select "Start in test mode" (you can update rules later)
4. Choose a location closest to your users
5. Click "Enable"

### Step 4: Set Up Storage

1. Click "Storage" in left sidebar
2. Click "Get started"
3. Select "Start in test mode"
4. Use the same location as Firestore
5. Click "Done"

### Step 5: Get Firebase Config

1. Click the gear icon (⚙️) next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Register app with nickname "BlueGuard Web"
6. Copy the configuration object

### Step 6: Configure Environment Variables

1. In your project, copy the example file:
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

2. Open `.env.local` and paste your Firebase config values:
   \`\`\`env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123...
   \`\`\`

3. Save the file

### Step 7: Run the App

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) and test all features!

## Testing the App

1. **Sign Up**: Create a new account with email/password or Google
2. **Classify Waste**: Upload an image to test classification
3. **Log Cleanup**: Click on the map to add a cleanup location
4. **Share Art**: Upload a recycled art creation
5. **View Profile**: Check your stats and badges

## Troubleshooting

### "Firebase not configured" error
- Check that `.env.local` exists in your project root
- Verify all environment variables are set correctly
- Restart the dev server after changing environment variables

### Map not loading
- Check your internet connection (needs to load OpenStreetMap tiles)
- Make sure you're not blocking external resources

### Images not uploading
- Verify Firebase Storage is enabled
- Check Storage rules in Firebase Console
- Ensure file size is reasonable (< 10MB)

### Authentication errors
- Verify Authentication providers are enabled in Firebase
- Check that email/password or Google auth is active
- Clear browser cache and try again

## Firebase Security Rules (Production)

Before deploying to production, update your Firebase rules:

### Firestore Rules
\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /classifications/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /cleanupPoints/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /artworks/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
\`\`\`

### Storage Rules
\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /waste-images/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /artworks/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
\`\`\`

## Next Steps

- Customize the design colors in `app/globals.css`
- Add more waste categories in the classification page
- Implement real AI classification (integrate with vision APIs)
- Add social features (comments, following, etc.)
- Deploy to Vercel for production use
