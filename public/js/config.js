// public/js/config.js
// public/js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6v7gixtp5NPqjrsigCV01Kwfhd3It568",
  authDomain: "omnicards-29e53.firebaseapp.com",
  projectId: "omnicards-29e53",
  storageBucket: "omnicards-29e53.firebasestorage.app",
  messagingSenderId: "434284287206",
  appId: "1:434284287206:web:2f53d1f8b7a342ca6a5727"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const appId = "default-app-id"; // Oder deine ID Logik falls vorhanden

