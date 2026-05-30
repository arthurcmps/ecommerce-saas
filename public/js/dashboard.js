// js/dashboard.js
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const dashboardContent = document.getElementById('dashboard-content');
const storeNameDisplay = document.getElementById('store-name-display');
const userEmailDisplay = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const linkMyStore = document.getElementById('link-my-store');

// Esta função é acionada assim que a página abre
onAuthStateChanged(auth, async (user) => {

    if (user) {
        // Se houver utilizador, mostramos a interface do dashboard
        dashboardContent.style.display = 'flex';
        userEmailDisplay.innerText = user.email;

        // CORREÇÃO: Montamos o link da loja aqui dentro, usando o user.uid diretamente
        if (linkMyStore) {
            linkMyStore.href = `loja.html?id=${user.uid}`;
        }

        try {
            // Vamos buscar os detalhes da loja ao Firestore usando o UID do utilizador
            const storeDocRef = doc(db, 'stores', user.uid);
            const storeDoc = await getDoc(storeDocRef);

            if (storeDoc.exists()) {
                const storeData = storeDoc.data();
                storeNameDisplay.innerText = storeData.name; // Injeta o nome da loja no menu
            } else {
                storeNameDisplay.innerText = "Loja não encontrada";
            }
        } catch (error) {
            console.error("Erro ao consultar a loja:", error);
            storeNameDisplay.innerText = "Erro ao carregar";
        }

    } else {
        // Se o utilizador tentar aceder sem estar logado, é recambiado para o login
        window.location.href = "index.html";
    }

});

// Lógica para terminar sessão
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // O onAuthStateChanged ali em cima deteta a saída automaticamente e redireciona
    } catch (error) {
        console.error("Erro ao terminar sessão:", error);
    }
});