// ============================================================
// firebase.js
// Configuração e inicialização do Firebase.
// Preencha os valores abaixo com os dados do SEU projeto Firebase.
// (Console do Firebase > Configurações do projeto > Seus apps > SDK)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAsYFOURvAA4ZWrVnznh8A7ucu7F2VPR6E",
  authDomain: "casalist-d13c3.firebaseapp.com",
  projectId: "casalist-d13c3",
  storageBucket: "casalist-d13c3.firebasestorage.app",
  messagingSenderId: "562942648670",
  appId: "1:562942648670:web:786a8d1206398882982fcf",
  measurementId: "G-2NG3G8C1GP"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Persistência offline: a lista continua aparecendo mesmo sem internet.
// Se falhar (ex: várias abas abertas), o app segue funcionando normalmente,
// só sem o cache offline.
enableIndexedDbPersistence(db).catch(() => {});

// Garante que existe um usuário autenticado (anônimo) antes de
// qualquer leitura/escrita no Firestore — sem nenhuma tela de login visível.
export function garantirAutenticacao() {
  return new Promise((resolve, reject) => {
    const cancelar = onAuthStateChanged(
      auth,
      (user) => {
        cancelar();
        if (user) {
          resolve(user);
        } else {
          signInAnonymously(auth)
            .then((credencial) => resolve(credencial.user))
            .catch(reject);
        }
      },
      reject
    );
  });
}
