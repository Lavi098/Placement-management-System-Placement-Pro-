# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. Enable **Firestore Database**:
   - Go to Firestore Database in the left sidebar
   - Click "Create database"
   - Choose "Start in test mode" (we'll add security rules later)
   - Select a location closest to your users

## Step 2: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app
5. Register your app (you can skip hosting for now)
6. Copy the `firebaseConfig` object

## Step 3: Add Environment Variables

Create a `.env` file in the root of your project with:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

Replace the values with your actual Firebase config values.

## Step 4: Firestore Security Rules (Optional but Recommended)

Go to Firestore Database > Rules and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to drives collection
    match /drives/{driveId} {
      allow read, write: if true; // For now, allow all access
      // TODO: Add proper authentication rules later
    }
  }
}
```

**Note:** The above rules allow anyone to read/write. For production, you should add authentication and proper security rules.

## Step 5: Test the Integration

1. Start your dev server: `npm run dev`
2. Go to `/admin/create-drive`
3. Fill out the form and create a drive
4. Check Firebase Console > Firestore Database to see your data
5. Go to `/admin` to see your drives loaded from Firebase

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Check that your `.env` file has the correct values
- Make sure the `.env` file is in the root directory
- Restart your dev server after creating/updating `.env`

### "Permission denied" errors
- Check your Firestore security rules
- Make sure Firestore is enabled in Firebase Console

### Data not showing up
- Check browser console for errors
- Verify your Firebase config values are correct
- Check Firestore Database in Firebase Console to see if data was saved

## Next Steps

- [ ] Add Firebase Authentication for admin/student login
- [ ] Add security rules based on user roles
- [ ] Set up real-time listeners for live updates
- [ ] Add file storage for resumes/documents
- [ ] Set up Firebase Cloud Functions for server-side logic

