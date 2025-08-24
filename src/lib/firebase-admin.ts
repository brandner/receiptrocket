import admin from 'firebase-admin';

/**
 * @returns {admin.app.App} The initialized Firebase Admin app instance.
 */
export function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When running in a Google Cloud environment (like Firebase App Hosting),
  // the SDK automatically discovers the service account credentials.
  // The projectId is also automatically inferred.
  return admin.initializeApp();
}
