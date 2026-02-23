import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBG-ANXjDpWc9O8qs3G_ZYUtGPhleBANEo",
  authDomain: "cloud5-7c2cd.firebaseapp.com",
  projectId: "cloud5-7c2cd",
  storageBucket: "cloud5-7c2cd.firebasestorage.app",
  messagingSenderId: "932774809248",
  appId: "1:932774809248:web:9da2bf33d984d5246143c5",
  measurementId: "G-7G27BF4T4M"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app); 

export { app, auth, db }; 