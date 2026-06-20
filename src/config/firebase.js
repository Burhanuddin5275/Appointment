import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage"; // 🆕 Import Storage Engine

const firebaseConfig = {
  apiKey: "AIzaSyBD41idf0fHpzArzrSBnWfNdV7XcXNnZPU",
  authDomain: "appointment-dae60.firebaseapp.com",
  databaseURL: "https://appointment-dae60-default-rtdb.firebaseio.com",
  projectId: "appointment-dae60",
  storageBucket: "appointment-dae60.firebasestorage.app",
  messagingSenderId: "343482147133",
  appId: "1:343482147133:web:05994218185457cb4a2554"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app); // 🆕 Export Storage reference
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });