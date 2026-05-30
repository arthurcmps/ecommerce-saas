// js/loja.js
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Captura o parâmetro '?id=' da URL
const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get('id');

const storeNameElement = document.getElementById('public-store-name');
const productsList = document.getElementById('public-products-list');

async function initStore() {
    if (!storeId) {
        document.body.innerHTML = '<h1 style="text-align:center; margin-top:100px; color:#2d3748;">Erro: ID da loja não especificado na hiperligação.</h1>';
        return;
    }

    try {
        // 1. Carregar Dados e Design da Loja
        const storeDoc = await getDoc(doc(db, 'stores', storeId));
        
        if (!storeDoc.exists()) {
            document.body.innerHTML = '<h1 style="text-align:center; margin-top:100px; color:#2d3748;">Loja não encontrada.</h1>';
            return;
        }

        const storeData = storeDoc.data();
        storeNameElement.innerText = storeData.name;
        document.title = `${storeData.name} - Loja Oficial`;

        // 2. Aplicar a Identidade Visual (White-label)
        if (storeData.theme_config) {
            const root = document.documentElement;
            
            // Injeta as cores escolhidas pelo lojista nas variáveis do CSS
            if(storeData.theme_config.primary_color) {
                root.style.setProperty('--primary-color', storeData.theme_config.primary_color);
            }
            if(storeData.theme_config.secondary_color) {
                root.style.setProperty('--secondary-color', storeData.theme_config.secondary_color);
            }

            // Define o layout (Grelha ou Carrossel)
            if (storeData.theme_config.home_layout && storeData.theme_config.home_layout.vitrine_style === 'carousel') {
                productsList.className = 'vitrine-carousel';
            } else {
                productsList.className = 'vitrine-grid';
            }
        }

        // 3. Carregar os Produtos
        await loadPublicProducts();

    } catch (error) {
        console.error("Erro ao carregar a loja:", error);
    }
}

async function loadPublicProducts() {
    try {
        const productsRef = collection(db, 'stores', storeId, 'products');
        const snapshot = await getDocs(productsRef);

        productsList.innerHTML = '';

        if (snapshot.empty) {
            productsList.innerHTML = '<p style="text-align:center; width: 100%; color:#718096;">Esta loja ainda não tem produtos disponíveis.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            
            // Renderiza apenas se o produto estiver marcado como ativo
            if (prod.is_active !== false) {
                const card = document.createElement('div');
                card.className = 'public-product-card';
                card.innerHTML = `
                    <h4>${prod.name}</h4>
                    <span class="price">${parseFloat(prod.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <p class="desc">${prod.description}</p>
                    <button class="btn-buy" onclick="alert('Funcionalidade de carrinho em desenvolvimento!')">Adicionar ao Carrinho</button>
                `;
                productsList.appendChild(card);
            }
        });
    } catch (error) {
        console.error("Erro ao carregar os produtos:", error);
        productsList.innerHTML = '<p style="text-align:center;">Erro ao carregar o catálogo de produtos.</p>';
    }
}

// Inicia o processo mal o ficheiro é carregado
initStore();