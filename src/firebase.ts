import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do Firebase lendo variáveis de ambiente (.env / Vercel) com fallback seguro
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDT1TYAEhat5X6_dZ2BDI8R0PxQ5Co4hdQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hub-propertydev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hub-propertydev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hub-propertydev.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "507337816440",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:507337816440:web:06a1e480bc66d9ade4308d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-78EB0WDCPV",
};

// Inicializa Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Inicializa Analytics com segurança
export const initAnalytics = async () => {
  try {
    if (typeof window !== "undefined" && (await isSupported())) {
      return getAnalytics(app);
    }
  } catch (err) {
    console.warn("Analytics não pôde ser iniciado:", err);
  }
  return null;
};
