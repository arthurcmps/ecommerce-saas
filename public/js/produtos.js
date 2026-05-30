import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

const dashboardContent = document.getElementById('dashboard-content');
const storeNameDisplay = document.getElementById('store-name-display');
const logoutButton = document.getElementById('logout-button');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modal = document.getElementById('product-modal');
const addProductForm = document.getElementById('add-product-form');
const productsList = document.getElementById('products-list');
const modalTitle = document.getElementById('modal-title');

let currentUserId = null;
let loadedProducts = {}; // Guarda os produtos na memória para facilitar a edição
let editingProductId = null; // Controla se estamos adicionando ou editando

// Limpa o modal para Adicionar Novo
btnOpenModal.addEventListener('click', () => {
    editingProductId = null;
    addProductForm.reset();
    modalTitle.innerText = "Adicionar Novo Produto";
    modal.style.display = 'flex';
});

btnCloseModal.addEventListener('click', () => modal.style.display = 'none');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        dashboardContent.style.display = 'flex';

        const storeDoc = await getDoc(doc(db, 'stores', user.uid));
        if (storeDoc.exists()) {
            storeNameDisplay.innerText = storeDoc.data().name;
        }
        loadProducts();
    } else {
        window.location.href = "index.html";
    }
});

async function loadProducts() {
    productsList.innerHTML = '<p style="color: #a0aec0; text-align: center; grid-column: 1 / -1;">Carregando o estoque...</p>';
    loadedProducts = {}; // Reseta a memória

    try {
        const productsRef = collection(db, 'stores', currentUserId, 'products');
        const snapshot = await getDocs(productsRef);
        
        productsList.innerHTML = ''; 

        if (snapshot.empty) {
            productsList.innerHTML = '<p style="color: #a0aec0; grid-column: 1 / -1;">Você ainda não tem produtos cadastrados.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const prodId = docSnap.id;
            loadedProducts[prodId] = prod; // Salva o produto na memória pelo ID

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <h3>${prod.name}</h3>
                <span class="price">${parseFloat(prod.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span class="stock">Estoque: ${prod.stock} un.</span>
                <p style="color: #718096; font-size: 0.85rem; margin-top: 0.5rem; flex: 1;">${prod.description}</p>
                <div class="card-actions">
                    <button class="btn-edit" onclick="editProduct('${prodId}')">Editar</button>
                    <button class="btn-delete" onclick="deleteProduct('${prodId}')">Excluir</button>
                </div>
            `;
            productsList.appendChild(card);
        });

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        productsList.innerHTML = '<p style="color: #e53e3e; grid-column: 1 / -1;">Erro ao carregar os produtos.</p>';
    }
}

// Transformamos em globais (window) para funcionar com o onclick do HTML injetado
window.editProduct = (id) => {
    editingProductId = id;
    const prod = loadedProducts[id];

    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-stock').value = prod.stock;
    document.getElementById('prod-desc').value = prod.description;

    if(prod.shipping_dimensions) {
        document.getElementById('prod-weight').value = prod.shipping_dimensions.weight_kg;
        document.getElementById('prod-length').value = prod.shipping_dimensions.length_cm;
        document.getElementById('prod-width').value = prod.shipping_dimensions.width_cm;
        document.getElementById('prod-height').value = prod.shipping_dimensions.height_cm;
    }

    modalTitle.innerText = "Editar Produto";
    modal.style.display = 'flex';
};

window.deleteProduct = async (id) => {
    if(confirm("Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.")) {
        try {
            await deleteDoc(doc(db, 'stores', currentUserId, 'products', id));
            loadProducts(); // Recarrega a grade após exclusão
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir o produto.");
        }
    }
};

addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnSave = document.getElementById('btn-save-product');
    const originalText = btnSave.innerText;
    btnSave.innerText = "Salvando...";
    btnSave.disabled = true;

    const productData = {
        name: document.getElementById('prod-name').value,
        price: Number(document.getElementById('prod-price').value),
        stock: Number(document.getElementById('prod-stock').value),
        description: document.getElementById('prod-desc').value,
        shipping_dimensions: {
            weight_kg: Number(document.getElementById('prod-weight').value),
            length_cm: Number(document.getElementById('prod-length').value),
            width_cm: Number(document.getElementById('prod-width').value),
            height_cm: Number(document.getElementById('prod-height').value)
        }
    };

    try {
        if (editingProductId) {
            // Modo Edição: Atualiza o documento existente
            await updateDoc(doc(db, 'stores', currentUserId, 'products', editingProductId), productData);
        } else {
            // Modo Criação: Adiciona um novo documento
            productData.is_active = true;
            productData.created_at = serverTimestamp();
            await addDoc(collection(db, 'stores', currentUserId, 'products'), productData);
        }

        addProductForm.reset();
        modal.style.display = 'none';
        loadProducts();

    } catch (error) {
        console.error("Erro ao salvar produto:", error);
        alert("Ocorreu um erro ao salvar o produto.");
    } finally {
        btnSave.innerText = originalText;
        btnSave.disabled = false;
    }
});

logoutButton.addEventListener('click', () => signOut(auth));