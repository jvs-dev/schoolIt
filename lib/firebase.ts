import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
const firebaseConfig = {
  apiKey: "AIzaSyAl-5wT3Q56mG1aMaT9G8wG0rgXFUm4FZE",
  authDomain: "schoolit-ef810.firebaseapp.com",
  projectId: "schoolit-ef810",
  storageBucket: "schoolit-ef810.firebasestorage.app",
  messagingSenderId: "122657769691",
  appId: "1:122657769691:web:303a88816ec20a92e224fe"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;