# Development and Design Decisions for ReceiptRocket

This document summarizes the key decisions and development steps taken to build the ReceiptRocket application, based on a conversational development process.

## 1. Initial State & Core Problem

The project began with a functional UI but had a critical runtime error related to React's `useActionState` hook.

-   **Problem**: An async function connected to `useActionState` was being called imperatively inside a `.then()` block, which is not the intended usage. This caused a "called outside of a transition" error and prevented UI states like `isPending` from updating correctly.
-   **Decision**: Refactor the form submission logic to be declarative. The `formAction` returned by the hook should be passed directly to the `<form>` element's `action` or `formAction` prop. This allows React to manage the submission lifecycle, which fixes the error and enables UI feedback like loading indicators on buttons.

## 2. Firebase Storage Bucket Configuration

A persistent issue during development was the "invalid bucket name" error when uploading receipts. This was resolved through several iterations.

-   **Attempt 1 (Incorrect)**: The bucket name was initially constructed from the Firebase Project ID. This was unreliable.
-   **Attempt 2 (Incorrect)**: The bucket name was hardcoded in the server action file. This worked but is poor practice for managing configuration.
-   **Attempt 3 (Incorrect Format)**: Following best practices, the bucket name was moved to a `.env` file. However, an incorrect default format (`.appspot.com` instead of `.firebasestorage.app`) was used.
-   **Decision (Correct)**: The final, correct solution was to store the proper bucket name (`receiptrocket-h9b5k.firebasestorage.app`) in a `FIREBASE_STORAGE_BUCKET` variable within the `.env` file and ensure it was correctly passed to the Firebase Admin SDK initialization.

## 3. Image Handling and Security

Several key decisions were made regarding the handling and security of receipt images.

-   **Image Domain Configuration**: The app initially crashed when trying to display uploaded receipts because the `next/image` component requires remote image domains to be explicitly trusted.
    -   **Decision**: Add `storage.googleapis.com` to the `images.remotePatterns` array in `next.config.ts` to authorize Next.js to optimize images from Firebase Storage.

-   **Filename Security**: The initial implementation used `Date.now()` to generate filenames, which is predictable and not secure.
    -   **Decision**: Switch to using cryptographically secure UUIDs for filenames. The `randomUUID` function from Node.js's `crypto` module was implemented in the server action to ensure that every uploaded receipt has a unique, unguessable filename. This prevents enumeration attacks.

-   **Image URL Accessibility**: A question was raised about whether the image URLs were public.
    -   **Explanation**: The application uses Firebase Storage signed URLs. These URLs contain a long, unguessable token that grants access. While the underlying objects in the bucket are not public, the URLs themselves are configured with a very long expiration date, making them effectively permanent public links.
    -   **Decision**: Based on this understanding and a user request, the public image URL was added as a column to the CSV export feature for better data portability.

## 4. Authentication and Authorization

The application was enhanced from a single-user tool to a multi-tenant application with secure user authentication.

-   **Technology Choice**: Firebase Authentication with Google Sign-In was chosen for its ease of implementation and robust security.
-   **Implementation**:
    1.  A client-side Firebase configuration was added in `src/lib/firebase.ts`.
    2.  A React Context (`useAuth`) was created to manage the global authentication state.
    3.  An `AuthButton` component was added to the UI for login and logout.
    4.  All server actions (`getReceipts`, `deleteReceipt`, `processAndSaveReceipt`) were updated to be user-aware. They now verify the user's ID token and associate all data with that `userId`. This ensures users can only ever access their own receipts.

-   **Technical Issue (Infinite Loop)**: A "Maximum call stack size exceeded" error occurred after implementing auth. This was caused by incorrectly "monkey-patching" the global `fetch` API, where the custom fetch function was calling itself recursively.
    -   **Decision**: The logic was corrected by storing a reference to the original `fetch` function before overwriting it, and then calling that original reference from within the custom fetch function. This broke the infinite loop.

## 5. Final Polish and Next Steps

With the core functionality complete and stable, the final step was to document the project.

-   **Decision**: A comprehensive `README.md` was generated to summarize the project's features and technology stack. This `prompts.md` file was also created to document the development journey.
-   **Next Steps Recommendation**: The primary recommendation for future work is to implement **Firestore Security Rules** as a "defense-in-depth" measure to complement the existing server-side authorization checks.
