# Configuration for ReceiptRocket

This document details the necessary Firebase and Google Cloud configuration to run the ReceiptRocket application locally.

## 1. Firebase Project Setup

You need a Firebase project to run this application. If you don't have one, create one at the [Firebase Console](https://console.firebase.google.com/).

## 2. Environment Variables

Create a `.env` file in the root of the project. This file holds your Firebase project's public and private credentials.

**You must populate all values in this file for the app to work.**

```
# --- Server-Side Admin Credentials (for Server Actions) ---
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-private-key...\\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"

# --- Client-Side App Credentials (for the browser) ---
NEXT_PUBLIC_FIREBASE_API_KEY="your-public-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-web-app-id"

# --- Genkit AI Credentials ---
GEMINI_API_KEY="your-gemini-api-key"
```

### How to get Server-Side Admin Credentials:

1.  In your Firebase project, go to **Project settings** (the gear icon).
2.  Go to the **Service accounts** tab.
3.  Click **Generate new private key**. A JSON file will be downloaded.
4.  Open the JSON file and find the corresponding values:
    *   `project_id` -> `FIREBASE_PROJECT_ID`
    *   `client_email` -> `FIREBASE_CLIENT_EMAIL`
    *   `private_key` -> `FIREBASE_PRIVATE_KEY` (Important: Ensure the private key is enclosed in double quotes and newlines are escaped as `\n`).

### How to get Client-Side App Credentials:

1.  In your Firebase project, go to **Project settings** (the gear icon).
2.  In the **General** tab, scroll down to the **Your apps** section.
3.  If you haven't created a web app yet, click the `</>` (Web) icon to create one.
4.  Once you have a web app, select it.
5.  Choose **Config** as the view option.
6.  You will see a `firebaseConfig` object. Copy the values from this object into the corresponding `NEXT_PUBLIC_` variables in your `.env` file.
    *   `apiKey` -> `NEXT_PUBLIC_FIREBASE_API_KEY`
    *   `authDomain` -> `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    *   `projectId` -> `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    *   `storageBucket` -> `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    *   `messagingSenderId` -> `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    *   `appId` -> `NEXT_PUBLIC_FIREBASE_APP_ID`

### How to get Genkit (Gemini) API Credentials:

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Click the **Get API key** button.
4.  Click **Create API key in new project**.
5.  Copy the generated API key.
6.  Paste the key into the `GEMINI_API_KEY` variable in your `.env` file.

## 3. Enable Firebase Services

In the Firebase Console for your project, you must enable the following services:

1.  **Authentication**:
    *   Go to the **Authentication** section.
    *   Click the **Sign-in method** tab.
    *   Select **Google** from the list of providers and enable it.

2.  **Firestore Database**:
    *   Go to the **Firestore Database** section.
    *   Click **Create database**.
    *   Choose **Start in production mode**.
    *   Select a location for your database.

3.  **Cloud Storage**:
    *   Go to the **Storage** section.
    *   Click **Get started**.
    *   Follow the prompts to enable Cloud Storage.

## 4. (Recommended) Deploy Firestore Security Rules

As a critical security step, you should deploy the provided security rules to your Firestore database. These rules ensure that users can only access their own data.

### Easiest Method: Copy and Paste into Firebase Console

1.  Open the `firestore.rules` file that is included in this project.
2.  Copy the entire contents of the file.
3.  Go to the [Firebase Console](https://console.firebase.google.com/) and navigate to your project.
4.  In the left-hand menu, click **Build > Firestore Database**.
5.  At the top of the page, click the **Rules** tab.
6.  Delete all the text in the editor and paste the rules you copied from the `firestore.rules` file.
7.  Click the **Publish** button.

Your database is now protected. The rules ensure that a user must be authenticated, and that the `userId` on the receipt document they are trying to access matches their own user ID.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read and write their own receipts.
    match /receipts/{receiptId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```
