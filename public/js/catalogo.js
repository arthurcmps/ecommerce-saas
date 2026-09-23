// js/catalogo.js
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { db, auth } from "./firebase-config.js";

const productsList = document.getElementById('marketplace-products');
const navLogin = document.getElementById('nav-login');

onAuthStateChanged(auth, (user) => {
    if (user) {
        navLogin.innerText = "Sair da Conta";
        navLogin.href = "#";
        navLogin.onclick = async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.reload();
            } catch (error) {
                console.error('Erro ao sair:', error);
            }
        };
    } else {
        navLogin.innerText = "Entrar";
        navLogin.href = "login-cliente.html";
        navLogin.onclick = null;
    }
});

async function loadMarketplace() {
    productsList.innerHTML = '<p style="text-align: center; width: 100%; color: #718096;">Carregando o catálogo...</p>';

    try {
        const storesSnapshot = await getDocs(collection(db, 'stores'));
        const allProducts = [];

        for (const storeDoc of storesSnapshot.docs) {
            const storeId = storeDoc.id;
            const storeData = storeDoc.data();

            if (storeData.status && storeData.status !== 'active') continue;

            const productsRef = collection(db, 'stores', storeId, 'products');
            const productsSnap = await getDocs(productsRef);

            productsSnap.forEach((prodDoc) => {
                const prodData = prodDoc.data();
                const stock = Number(prodData.stock) || 0;

                if (prodData.is_active !== false && stock > 0) {
                    allProducts.push({
                        id: prodDoc.id,
                        storeId,
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

        allProducts.sort(() => Math.random() - 0.5);

        allProducts.forEach((prod) => {
            const name = String(prod.name || 'Produto');
            const description = String(prod.description || '');
            const price = Number(prod.price) || 0;

            const imgHtml = prod.image_url
                ? `<img src="${prod.image_url}" alt="${name}" style="width: 100%; height: 250px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px; margin: -1.5rem -1.5rem 1rem -1.5rem;">`
                : `<div style="width: calc(100% + 3rem); height: 250px; background-color: #e2e8f0; border-top-left-radius: 8px; border-top-right-radius: 8px; margin: -1.5rem -1.5rem 1rem -1.5rem; display: flex; align-items: center; justify-content: center; color: #a0aec0;">Sem foto</div>`;

            const card = document.createElement('div');
            card.className = 'public-product-card';
            card.innerHTML = `
                ${imgHtml}
                <span class="store-badge">Vendido por: ${prod.storeName}</span>
                <h4>${name}</h4>
                <span class="price">${price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <p class="desc">${description.length > 60 ? `${description.substring(0, 60)}...` : description}</p>
                <button class="btn-buy" type="button">Visitar Loja</button>
            `;

            card.querySelector('.btn-buy').addEventListener('click', () => {
                window.location.href = `loja.html?id=${encodeURIComponent(prod.storeId)}`;
            });

            productsList.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar o marketplace:", error);
        productsList.innerHTML = '<p style="text-align:center; width: 100%; color:#e53e3e;">Erro ao carregar os produtos.</p>';
    }
}

loadMarketplace();
