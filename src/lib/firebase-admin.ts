import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

/**
 * @returns {admin.app.App} The initialized Firebase Admin app instance.
 */
export function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return admin.app();
  }

  // When running in a Google Cloud environment (like Firebase App Hosting),
  // the SDK automatically discovers the service account credentials.
  // We explicitly provide the project ID to ensure it connects to the correct project.
  return admin.initializeApp({
    projectId: 'receiptrocket-h9b5k',
  });
}
