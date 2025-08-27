# Configuration for ReceiptRocket

This document details the necessary Firebase and Google Cloud configuration to run the ReceiptRocket application locally.

## 1. Firebase Project Setup

You need a Firebase project to run this application. If you don't have one, create one at the [Firebase Console](https://console.firebase.google.com/).

## 2. Environment Variables

Create a `.env` file in the root of the project. This file will hold your Firebase project's credentials. Populate it with the following keys.

**Example `.env`:**
```
# Firebase Service Account Credentials
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...your-private-key...\\n-----END PRIVATE KEY-----\\n"

# Firebase Storage Bucket URL
FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
```

### How to get these values:

1.  Navigate to **Project settings** (the gear icon) in your Firebase project console.
2.  Go to the **Service accounts** tab.
3.  Click **Generate new private key**. A JSON file will be downloaded.
4.  Open the JSON file and find the corresponding values:
    *   `project_id` -> `FIREBASE_PROJECT_ID`
    *   `client_email` -> `FIREBASE_CLIENT_EMAIL`
    *   `private_key` -> `FIREBASE_PRIVATE_KEY` (Important: Ensure the private key is enclosed in double quotes and newlines are escaped as `\n`).
5.  For `FIREBASE_STORAGE_BUCKET`, navigate to the **Storage** section in your Firebase console. The bucket URL (e.g., `your-project-id.appspot.com`) will be listed at the top of the Files tab.

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

## 4. (Recommended) Firestore Security Rules

As a critical next step for any production application, you should secure your database with Firestore Security Rules. The application currently relies on server-side checks, but rules provide a vital, non-bypassable layer of security.

You can add the following rules in **Firestore Database > Rules** tab in your Firebase console:

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
