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
  // initializing with applicationDefault() credentials allows the SDK to
  // automatically discover the service account credentials.
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'receiptrocket-h9b5k',
  });
}
