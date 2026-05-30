// js/loja.js
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get('id');

const storeNameElement = document.getElementById('public-store-name');
const productsList = document.getElementById('public-products-list');

// Elementos do Carrinho
const btnOpenCart = document.getElementById('btn-open-cart');
const btnCloseCart = document.getElementById('btn-close-cart');
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const cartBadge = document.getElementById('cart-badge');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPrice = document.getElementById('cart-total-price');
const btnCheckout = document.getElementById('btn-checkout');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutForm = document.getElementById('checkout-form');
const btnCancelCheckout = document.getElementById('btn-cancel-checkout');

let publicProductsData = {}; // Memória dos produtos para facilitar o carrinho

// Inicializa o carrinho lendo do localStorage (memória do navegador)
// Usamos o storeId na chave para o cliente poder ter carrinhos diferentes em lojas diferentes
let cart = JSON.parse(localStorage.getItem(`cart_${storeId}`)) || [];
let storePhoneNumber = "";

// Funções para abrir e fechar a gaveta
function openCart() {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('active');
    renderCart(); // Atualiza a lista sempre que abre
}

function closeCart() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('active');
}

btnOpenCart.addEventListener('click', openCart);
btnCloseCart.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

async function initStore() {
    if (!storeId) {
        document.body.innerHTML = '<h1 style="text-align:center; margin-top:100px; color:#2d3748;">Erro: ID da loja não especificado na hiperligação.</h1>';
        return;
    }

    try {
        const storeDoc = await getDoc(doc(db, 'stores', storeId));
        if (!storeDoc.exists()) {
            document.body.innerHTML = '<h1 style="text-align:center; margin-top:100px; color:#2d3748;">Loja não encontrada.</h1>';
            return;
        }

        const storeData = storeDoc.data();
        storeNameElement.innerText = storeData.name;
        storePhoneNumber = storeData.phone;
        document.title = `${storeData.name} - Loja Oficial`;

        if (storeData.theme_config) {
            const root = document.documentElement;
            if(storeData.theme_config.primary_color) root.style.setProperty('--primary-color', storeData.theme_config.primary_color);
            if(storeData.theme_config.secondary_color) root.style.setProperty('--secondary-color', storeData.theme_config.secondary_color);

            if (storeData.theme_config.home_layout && storeData.theme_config.home_layout.vitrine_style === 'carousel') {
                productsList.className = 'vitrine-carousel';
            } else {
                productsList.className = 'vitrine-grid';
            }
        }

        await loadPublicProducts();
        updateCartBadge(); // Atualiza a bolinha do carrinho ao carregar a página

    } catch (error) {
        console.error("Erro ao carregar a loja:", error);
    }
}

async function loadPublicProducts() {
    try {
        const productsRef = collection(db, 'stores', storeId, 'products');
        const snapshot = await getDocs(productsRef);

        productsList.innerHTML = '';
        publicProductsData = {}; // Limpa a memória

        if (snapshot.empty) {
            productsList.innerHTML = '<p style="text-align:center; width: 100%; color:#718096;">Esta loja ainda não tem produtos disponíveis.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const prodId = docSnap.id;
            
            // Guarda o produto na memória para o carrinho poder usar
            publicProductsData[prodId] = prod; 

            if (prod.is_active !== false) {
                const imgHtml = prod.image_url 
                    ? `<img src="${prod.image_url}" alt="${prod.name}" style="width: 100%; height: 250px; object-fit: cover; border-top-left-radius: 8px; border-top-right-radius: 8px; margin: -1.5rem -1.5rem 1rem -1.5rem;">`
                    : `<div style="width: calc(100% + 3rem); height: 250px; background-color: #e2e8f0; border-top-left-radius: 8px; border-top-right-radius: 8px; margin: -1.5rem -1.5rem 1rem -1.5rem; display: flex; align-items: center; justify-content: center; color: #a0aec0;">Sem foto</div>`;

                const card = document.createElement('div');
                card.className = 'public-product-card';
                card.innerHTML = `
                    ${imgHtml}
                    <h4>${prod.name}</h4>
                    <span class="price">${parseFloat(prod.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <p class="desc">${prod.description}</p>
                    <button class="btn-buy" onclick="addToCart('${prodId}')">Adicionar ao Carrinho</button>
                `;
                productsList.appendChild(card);
            }
        });
    } catch (error) {
        console.error("Erro ao carregar os produtos:", error);
    }
}

// --- FUNÇÕES DO CARRINHO ---

window.addToCart = (productId) => {
    const product = publicProductsData[productId];
    if (!product) return;

    // Verifica se o produto já está no carrinho
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        // Se existir, apenas aumenta a quantidade (respeitando o estoque)
        if (existingItem.quantity < product.stock) {
            existingItem.quantity += 1;
        } else {
            alert("Quantidade máxima em estoque atingida para este produto.");
            return;
        }
    } else {
        // Se for novo, adiciona ao array
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1,
            max_stock: product.stock
        });
    }

    saveCart();
    openCart(); // Abre a gaveta para o cliente ver o que adicionou
};

window.changeQuantity = (productId, delta) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;

    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else if (item.quantity > item.max_stock) {
        item.quantity = item.max_stock;
        alert("Estoque máximo atingido.");
    } else {
        saveCart();
        renderCart();
    }
};

window.removeFromCart = (productId) => {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
};

function saveCart() {
    localStorage.setItem(`cart_${storeId}`, JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    // Conta o total de itens (somando as quantidades)
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.innerText = totalItems;
}

function renderCart() {
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">O seu carrinho está vazio.</p>';
        cartTotalPrice.innerText = 'R$ 0,00';
        return;
    }

    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;

        const imgHtml = item.image_url 
            ? `<img src="${item.image_url}" class="cart-item-img">` 
            : `<div class="cart-item-img" style="background-color:#e2e8f0;"></div>`;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            ${imgHtml}
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${parseFloat(item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                <div class="cart-controls">
                    <button class="btn-qtd" onclick="changeQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn-qtd" onclick="changeQuantity('${item.id}', 1)">+</button>
                    <button class="btn-remove" onclick="removeFromCart('${item.id}')">Remover</button>
                </div>
            </div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    cartTotalPrice.innerText = parseFloat(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Botão de Checkout (Por enquanto apenas um alerta, próximo passo será o checkout)
btnCheckout.addEventListener('click', () => {
    if (cart.length === 0) {
        alert("O seu carrinho está vazio!");
        return;
    }
    closeCart(); // Fecha a gaveta do carrinho
    checkoutModal.style.display = 'flex'; // Abre o formulário de entrega
});

btnCancelCheckout.addEventListener('click', () => {
    checkoutModal.style.display = 'none';
    openCart(); // Volta para o carrinho se o utilizador desistir
});

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnSubmit = checkoutForm.querySelector('button[type="submit"]');
    btnSubmit.innerText = "A processar...";
    btnSubmit.disabled = true;

    const buyerName = document.getElementById('buyer-name').value;
    const buyerPhone = document.getElementById('buyer-phone').value;
    const buyerAddress = document.getElementById('buyer-address').value;

    let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 1. Preparar os dados para gravar no Banco de Dados
    const orderData = {
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_address: buyerAddress,
        items: cart, // Guarda todo o conteúdo do carrinho
        total_amount: total,
        status: 'novo', // O lojista verá isto no painel
        created_at: serverTimestamp()
    };

    try {
        // 2. Gravar o pedido no Firestore na subcoleção 'orders'
        await addDoc(collection(db, 'stores', storeId, 'orders'), orderData);
        
        // 3. Gerar a mensagem para o WhatsApp
        let textMsg = `Olá! Gostaria de fazer um pedido.\n\n*Cliente:* ${buyerName}\n*Endereço:* ${buyerAddress}\n\n*Itens do Pedido:*\n`;
        
        // Mantemos uma cópia do carrinho antes de o apagar para montar a mensagem
        const cartCopy = [...cart]; 
        
        cartCopy.forEach(item => {
            textMsg += `- ${item.quantity}x ${item.name} (R$ ${item.price.toFixed(2)})\n`;
        });
        
        textMsg += `\n*Total a pagar:* R$ ${total.toFixed(2)}`;
        
        // Limpa o número de telefone da loja (remove parênteses, traços, etc.)
        const cleanPhone = storePhoneNumber.replace(/\D/g, '');
        
        // Cria a hiperligação oficial da API do WhatsApp
        const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(textMsg)}`;
        
        // 4. Limpar o carrinho e a interface
        cart = [];
        saveCart();
        renderCart();
        checkoutForm.reset();
        checkoutModal.style.display = 'none';

        // 5. Redirecionar o cliente
        alert("Pedido realizado com sucesso! Vamos redirecioná-lo para o WhatsApp da loja para concluir o pagamento.");
        window.open(waUrl, '_blank');
        
    } catch (error) {
        console.error("Erro ao processar o pedido:", error);
        alert("Ocorreu um erro ao processar o pedido. Tente novamente.");
    } finally {
        btnSubmit.innerText = "Confirmar e Enviar Pedido";
        btnSubmit.disabled = false;
    }
});

// Inicialização
initStore();