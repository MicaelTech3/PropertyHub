import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do Firebase fornecida pelo usuário
export const firebaseConfig = {
  apiKey: "AIzaSyDT1TYAEhat5X6_dZ2BDI8R0PxQ5Co4hdQ",
  authDomain: "hub-propertydev.firebaseapp.com",
  projectId: "hub-propertydev",
  storageBucket: "hub-propertydev.firebasestorage.app",
  messagingSenderId: "507337816440",
  appId: "1:507337816440:web:06a1e480bc66d9ade4308d",
  measurementId: "G-78EB0WDCPV",
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
