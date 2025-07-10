import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYv4q2dMLJE-Kllgvm5J73yQi6Pe0B0do",
  authDomain: "mucus-aeb30.firebaseapp.com",
  projectId: "mucus-aeb30",
  storageBucket: "mucus-aeb30.firebasestorage.app",
  messagingSenderId: "781785384393",
  appId: "1:781785384393:web:908ddccd6567008c7ad418",
  measurementId: "G-H0FZYER25N"
};

// Initialize Firebase only if not already initialized
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth - Expo SDK 53 specific fix
let auth;
try {
  // For Expo SDK 53, we need to use initializeAuth with proper persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If auth is already initialized, get the existing instance
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.error('Auth initialization error:', error);
    throw error;
  }
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage, app };