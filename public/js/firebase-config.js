import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// SUAS CHAVES AQUI
const firebaseConfig = {
  apiKey: "AIzaSyDhdK_l9kA8KlgTlTqYTaa1ZNX1V24XPd4",
  authDomain: "ecommerce-saas-f1982.firebaseapp.com",
  projectId: "ecommerce-saas-f1982",
  storageBucket: "ecommerce-saas-f1982.firebasestorage.app",
  messagingSenderId: "4314555916",
  appId: "1:4314555916:web:8876b97b05bdcb038b7029",
  measurementId: "G-S8740W71E5"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);