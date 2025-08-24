import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  projectId: "receiptrocket-h9b5k",
  appId: "1:496558310903:web:4202e84340a0d1ecb39af2",
  storageBucket: "receiptrocket-h9b5k.firebasestorage.app",
  apiKey: "AIzaSyCjApwkvKAOCONGyipL7YWgYe_Ucp2-RZo",
  authDomain: "receiptrocket-h9b5k.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "496558310903"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
