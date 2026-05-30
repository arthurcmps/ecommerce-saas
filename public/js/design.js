import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { renderSidebar, updateSidebarData } from "./sidebar.js";

const dashboardContent = document.getElementById('dashboard-content');
const designForm = document.getElementById('design-form');
const primaryColorInput = document.getElementById('primary-color');
const secondaryColorInput = document.getElementById('secondary-color');
const primaryHexDisplay = document.getElementById('primary-hex');
const secondaryHexDisplay = document.getElementById('secondary-hex');
const vitrineStyleSelect = document.getElementById('vitrine-style');
const btnSaveDesign = document.getElementById('btn-save-design');

let currentUserId = null;

renderSidebar('design');

primaryColorInput.addEventListener('input', (e) => primaryHexDisplay.innerText = e.target.value);
secondaryColorInput.addEventListener('input', (e) => secondaryHexDisplay.innerText = e.target.value);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        dashboardContent.style.display = 'flex';

        try {
            const storeDocRef = doc(db, 'stores', currentUserId);
            const storeDoc = await getDoc(storeDocRef);
            
            if (storeDoc.exists()) {
                const storeData = storeDoc.data();
                updateSidebarData(storeData.name, user.uid);

                if (storeData.theme_config) {
                    primaryColorInput.value = storeData.theme_config.primary_color || "#1A202C";
                    primaryHexDisplay.innerText = primaryColorInput.value;
                    
                    secondaryColorInput.value = storeData.theme_config.secondary_color || "#ED8936";
                    secondaryHexDisplay.innerText = secondaryColorInput.value;

                    if (storeData.theme_config.home_layout) {
                        vitrineStyleSelect.value = storeData.theme_config.home_layout.vitrine_style || "grid";
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao carregar as configurações de design:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

designForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalText = btnSaveDesign.innerText;
    btnSaveDesign.innerText = "A guardar...";
    btnSaveDesign.disabled = true;

    try {
        const storeDocRef = doc(db, 'stores', currentUserId);
        
        await updateDoc(storeDocRef, {
            theme_config: {
                primary_color: primaryColorInput.value,
                secondary_color: secondaryColorInput.value,
                home_layout: {
                    vitrine_style: vitrineStyleSelect.value
                }
            }
        });

        alert("Design atualizado com sucesso!");
    } catch (error) {
        console.error("Erro ao atualizar o design:", error);
        alert("Ocorreu um erro ao guardar as alterações.");
    } finally {
        btnSaveDesign.innerText = originalText;
        btnSaveDesign.disabled = false;
    }
});