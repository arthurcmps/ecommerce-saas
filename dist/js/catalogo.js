// js/catalogo.js
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { db, auth } from "./firebase-config.js";

const productsList = document.getElementById('marketplace-products');
const navLogin = document.getElementById('nav-login');

// Controla o estado de login no cabeçalho
onAuthStateChanged(auth, (user) => {
    if (user) {
        navLogin.innerText = "Sair da Conta";
        navLogin.href = "#";
        navLogin.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => window.location.reload());
        });
    } else {
        navLogin.innerText = "Entrar";
        navLogin.href = "login-cliente.html";
    }
});

async function loadMarketplace() {
    productsList.innerHTML = '<p style="text-align: center; width: 100%; color: #718096;">A carregar o catálogo...</p>';
    
    try {
        // 1. Vai buscar todas as lojas
        const storesSnapshot = await getDocs(collection(db, 'stores'));
        let allProducts = [];

        // 2. Para cada loja, recolhe os produtos
        for (const storeDoc of storesSnapshot.docs) {
            const storeId = storeDoc.id;
            const storeData = storeDoc.data();

            const productsRef = collection(db, 'stores', storeId, 'products');
            const productsSnap = await getDocs(productsRef);

            productsSnap.forEach((prodDoc) => {
                const prodData = prodDoc.data();
                
                if (prodData.is_active !== false) {
                    allProducts.push({
                        id: prodDoc.id,
                        storeId: storeId,
                        storeName: storeData.name || "Loja Parceira",
                        ...prodData
                    });
                }
            });
        }

        productsList.innerHTML = '';

        if (allProducts.length === 0) {
            productsList.innerHTML = '<p style="text-align:center; width: 100%; color:#718096;">Nenhum produto disponível no momento.</p>';
            return;
        }

        // 3. Baralha os produtos para a vitrine ser dinâmica
        allProducts.sort(() => Math.random() - 0.5);

        // 4. Constrói a interface visual
        allProducts.forEach((prod) => {
            const imgHtml = prod.image_url 
                ? `<img src="${prod.image_url}" alt="${prod.name}" style="width: 100%; height: 250px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px; margin: -1.5rem -1.5rem 1rem -1.5rem;">`
                : `<div style="width: calc(100% + 3rem); height: 250px; background-color: #e2e8f0; border-top-left-radius: 8px; border-top-right-radius: 8px; margin: -1.5rem -1.5rem 1rem -1.5rem; display: flex; align-items: center; justify-content: center; color: #a0aec0;">Sem foto</div>`;

            const card = document.createElement('div');
            card.className = 'public-product-card';
            
            card.innerHTML = `
                ${imgHtml}
                <span class="store-badge">Vendido por: ${prod.storeName}</span>
                <h4>${prod.name}</h4>
                <span class="price">${parseFloat(prod.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <p class="desc">${prod.description.substring(0, 60)}...</p>
                <button class="btn-buy" onclick="window.location.href='loja.html?id=${prod.storeId}'">Visitar Loja</button>
            `;
            productsList.appendChild(card);
        });

    } catch (error) {
        console.error("Erro ao carregar o marketplace:", error);
        productsList.innerHTML = '<p style="text-align:center; width: 100%; color:#e53e3e;">Erro ao carregar os produtos.</p>';
    }
}

loadMarketplace();