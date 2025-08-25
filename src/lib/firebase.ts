
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
