# Placement Management Platform

Full-stack placement coordination app built with React, TypeScript, Vite, Tailwind, Radix UI, React Router, React Query, and Firebase (Auth, Firestore, Storage).

## Features

- Role-based flows for students, placement admins, and institution admins
- Drive creation and management with application tracking
- Student onboarding, profile, offers, and placed-students views
- Auth with Firebase; form validation with React Hook Form + Zod
- Themed UI built on Tailwind and Radix primitives
- Charts and dashboards for drive status and outcomes

## Tech Stack

- React 18 + TypeScript, Vite
- Styling: Tailwind CSS, tailwind-merge, Radix UI components
- State/data: React Query, React Hook Form, Zod, React Router
- Backend: Firebase (Auth, Firestore, Storage) via client SDK

## Getting Started

Prerequisites: Node 18+ and npm.

1. Install dependencies

```bash
npm install
```

2. Configure environment

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=your-app-id
```

Keep `.env` private (already ignored). See [src/lib/firebase.ts](src/lib/firebase.ts) for usage.

3. Run the app

```bash
npm run dev
```

Open the printed localhost URL.

## Scripts

- npm run dev - start Vite dev server
- npm run build - type-check then build for production
- npm run preview - preview the production build
- npm run lint - run ESLint

## Project Structure (high level)

- src/pages - routed pages (dashboards, onboarding, drives, profile, etc.)
- src/components - shared and UI components (Radix-based)
- src/services - Firebase data access (auth, drives, applications, storage)
- src/lib - firebase initialization, utilities, validation
- src/contexts - app/state contexts (auth, theme)

## Firebase Setup (summary)

1. Create a Firebase project and enable Firestore.
2. Add a web app in Firebase console and copy the config into `.env` as above.
3. (Optional) Adjust Firestore security rules for your auth model. See FIREBASE_SETUP.md for details and next steps.

## Deployment

Build then serve the dist output (any static host works):

```bash
npm run build
npm run preview  # quick local check
```

## Troubleshooting

- Env keys missing: ensure `.env` matches the VITE_ variables and restart dev server after changes.
- Firebase permission errors: review Firestore rules and authenticated user claims/roles.
- Line ending warnings on Windows are harmless; Git will normalize per repo settings.