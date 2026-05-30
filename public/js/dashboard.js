import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { renderSidebar, updateSidebarData } from "./sidebar.js";

const dashboardContent = document.getElementById('dashboard-content');
const userEmailDisplay = document.getElementById('user-email');

renderSidebar('dashboard');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        dashboardContent.style.display = 'flex';
        userEmailDisplay.innerText = user.email;

        try {
            const storeDocRef = doc(db, 'stores', user.uid);
            const storeDoc = await getDoc(storeDocRef);

            if (storeDoc.exists()) {
                const storeData = storeDoc.data();
                updateSidebarData(storeData.name, user.uid);
            } else {
                updateSidebarData("Loja não encontrada", null);
            }
        } catch (error) {
            console.error("Erro ao consultar a loja:", error);
            updateSidebarData("Erro ao carregar", null);
        }
    } else {
        window.location.href = "index.html";
    }
});