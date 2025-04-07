// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBUCq01nBf4EgXY-MKfJANYZXf6OHxvlDE",
    authDomain: "maukoffieorderingapp.firebaseapp.com",
    projectId: "maukoffieorderingapp",
    storageBucket: "maukoffieorderingapp.firebasestorage.app",
    messagingSenderId: "813502962253",
    appId: "1:813502962253:web:0a4c36d8f9581019f45a04",
    measurementId: "G-5X44FV755T"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);