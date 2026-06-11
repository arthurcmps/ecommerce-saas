import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js";
import { renderSidebar, updateSidebarData } from "./sidebar.js";

const dashboardContent = document.getElementById('dashboard-content');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modal = document.getElementById('product-modal');
const addProductForm = document.getElementById('add-product-form');
const productsList = document.getElementById('products-list');
const modalTitle = document.getElementById('modal-title');

// Novos elementos dinâmicos
const categorySelect = document.getElementById('product-category');
const attributesContainer = document.getElementById('dynamic-attributes-container');

let currentUserId = null;
let loadedProducts = {}; 
let editingProductId = null; 

// Dicionário de Variações
const categoryTemplates = {
    roupas: { title: "Tamanhos Disponíveis", options: ["PP", "P", "M", "G", "GG", "XG"] },
    calcados: { title: "Numerações Disponíveis", options: ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"] },
    eletronicos: { title: "Voltagem", options: ["110V", "220V", "Bivolt"] },
    suplementos: { title: "Pesos / Tamanhos", options: ["150g", "250g", "500g", "1kg", "2kg", "3kg"] },
    acessorios: { title: "Cores/Modelos", options: ["Preto", "Branco", "Prata", "Dourado", "Colorido"] }
};

renderSidebar('produtos');

// Função para desenhar os filtros na tela
function renderAttributes(category, selectedVars = []) {
    if (category === 'padrao' || !category) {
        attributesContainer.style.display = 'none';
        attributesContainer.innerHTML = '';
        return;
    }

    const template = categoryTemplates[category];
    if (template) {
        let html = `<h4 style="color: #ed8936; margin-bottom: 0.8rem; font-size: 0.9rem;">${template.title}</h4>`;
        html += `<div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">`;
        
        template.options.forEach(opt => {
            const isChecked = selectedVars.includes(opt) ? "checked" : "";
            html += `
                <label style="background-color: #2d3748; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; border: 1px solid #4a5568; display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" name="product-variation" value="${opt}" ${isChecked}>
                    <span style="color: #e2e8f0; font-size: 0.9rem;">${opt}</span>
                </label>
            `;
        });
        html += `</div>`;
        
        attributesContainer.innerHTML = html;
        attributesContainer.style.display = 'block';
    }
}

// Ouve as mudanças de categoria ao cadastrar
if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
        renderAttributes(e.target.value);
    });
}

btnOpenModal.addEventListener('click', () => {
    editingProductId = null;
    addProductForm.reset();
    document.getElementById('prod-image').value = ""; 
    renderAttributes('padrao'); // Limpa os filtros
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
            updateSidebarData(storeDoc.data().name, user.uid);
        }
        loadProducts();
    } else {
        window.location.href = "index.html";
    }
});

async function loadProducts() {
    productsList.innerHTML = '<p style="color: #a0aec0; text-align: center; grid-column: 1 / -1;">Carregando o estoque...</p>';
    loadedProducts = {}; 

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
            loadedProducts[prodId] = prod; 

            const imgHtml = prod.image_url 
                ? `<img src="${prod.image_url}" alt="${prod.name}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 4px; margin-bottom: 1rem;">`
                : `<div style="width: 100%; height: 180px; background-color: #2d3748; border-radius: 4px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; color: #a0aec0;">Sem foto</div>`;

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                ${imgHtml}
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

window.editProduct = (id) => {
    editingProductId = id;
    const prod = loadedProducts[id];

    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-stock').value = prod.stock;
    document.getElementById('prod-desc').value = prod.description;
    
    // Configura a categoria salva e renderiza os filtros correspondentes
    categorySelect.value = prod.category || 'padrao';
    renderAttributes(prod.category || 'padrao', prod.available_variations || []);

    document.getElementById('prod-image').value = "";

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
            loadProducts(); 
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
    btnSave.innerText = "Processando..."; 
    btnSave.disabled = true;

    let finalImageUrl = editingProductId && loadedProducts[editingProductId].image_url 
        ? loadedProducts[editingProductId].image_url 
        : null;

    try {
        const imageInput = document.getElementById('prod-image');
        
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const storageRef = ref(storage, `stores/${currentUserId}/products/${Date.now()}_${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            finalImageUrl = await getDownloadURL(uploadResult.ref);
        }

        btnSave.innerText = "Salvando dados...";

        // Recolher dados das variações
        const selectedCategory = categorySelect.value;
        const variationsCheckboxes = document.querySelectorAll('input[name="product-variation"]:checked');
        const selectedVariations = Array.from(variationsCheckboxes).map(cb => cb.value);

        const productData = {
            name: document.getElementById('prod-name').value,
            price: Number(document.getElementById('prod-price').value),
            stock: Number(document.getElementById('prod-stock').value),
            category: selectedCategory,
            available_variations: selectedVariations,
            description: document.getElementById('prod-desc').value,
            image_url: finalImageUrl, 
            shipping_dimensions: {
                weight_kg: Number(document.getElementById('prod-weight').value),
                length_cm: Number(document.getElementById('prod-length').value),
                width_cm: Number(document.getElementById('prod-width').value),
                height_cm: Number(document.getElementById('prod-height').value)
            }
        };

        if (editingProductId) {
            await updateDoc(doc(db, 'stores', currentUserId, 'products', editingProductId), productData);
        } else {
            productData.is_active = true;
            productData.created_at = serverTimestamp();
            await addDoc(collection(db, 'stores', currentUserId, 'products'), productData);
        }

        addProductForm.reset();
        document.getElementById('prod-image').value = ""; 
        renderAttributes('padrao');
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