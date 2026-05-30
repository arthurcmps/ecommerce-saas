// js/loja.js
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { db, auth } from "./firebase-config.js";

const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get('id');

const storeNameElement = document.getElementById('public-store-name');
const productsList = document.getElementById('public-products-list');
const navLogin = document.getElementById('nav-login');

// Elementos do Carrinho
const btnOpenCart = document.getElementById('btn-open-cart');
const btnCloseCart = document.getElementById('btn-close-cart');
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const cartBadge = document.getElementById('cart-badge');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPrice = document.getElementById('cart-total-price');
const btnCheckout = document.getElementById('btn-checkout');

// Elementos do Modal de Checkout
const checkoutModal = document.getElementById('checkout-modal');
const checkoutForm = document.getElementById('checkout-form');
const btnCancelCheckout = document.getElementById('btn-cancel-checkout');

let publicProductsData = {}; 
let cart = JSON.parse(localStorage.getItem(`cart_${storeId}`)) || [];
let storePhoneNumber = "";

let currentCustomerId = null;
let currentCustomerData = null;

// Ouve se o cliente está logado e vai buscar os dados de forma blindada
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentCustomerId = user.uid;
        
        if(navLogin) {
            navLogin.innerText = "Sair da Conta";
            navLogin.href = "#";
            navLogin.addEventListener('click', (e) => {
                e.preventDefault();
                signOut(auth).then(() => window.location.reload());
            });
        }

        try {
            // Tenta buscar na coleção de clientes
            let userDoc = await getDoc(doc(db, 'customers', user.uid));
            
            if (userDoc.exists()) {
                currentCustomerData = userDoc.data();
            } else {
                // FALLBACK: Se você estiver a testar logado com a conta do Lojista
                userDoc = await getDoc(doc(db, 'stores', user.uid));
                if (userDoc.exists()) {
                    currentCustomerData = userDoc.data();
                }
            }
        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
        }
    } else {
        currentCustomerId = null;
        currentCustomerData = null;
        if(navLogin) {
            navLogin.innerText = "Entrar";
            navLogin.href = `login-cliente.html?id=${storeId || ''}`;
        }
    }
});

function openCart() {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('active');
    renderCart(); 
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
        document.title = `${storeData.name} - Loja Oficial`;
        storePhoneNumber = storeData.phone || ""; 

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
        updateCartBadge(); 

    } catch (error) {
        console.error("Erro ao carregar a loja:", error);
    }
}

async function loadPublicProducts() {
    try {
        const productsRef = collection(db, 'stores', storeId, 'products');
        const snapshot = await getDocs(productsRef);

        productsList.innerHTML = '';
        publicProductsData = {}; 

        if (snapshot.empty) {
            productsList.innerHTML = '<p style="text-align:center; width: 100%; color:#718096;">Esta loja ainda não tem produtos disponíveis.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const prodId = docSnap.id;
            
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

window.addToCart = (productId) => {
    const product = publicProductsData[productId];
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity += 1;
        } else {
            alert("Quantidade máxima em estoque atingida para este produto.");
            return;
        }
    } else {
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
    openCart(); 
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

// LÓGICA DE AUTO-PREENCHIMENTO E GRAVAÇÃO BLINDADA
btnCheckout.addEventListener('click', () => {
    if (cart.length === 0) {
        alert("O seu carrinho está vazio!");
        return;
    }

    if (currentCustomerData) {
        // Preenche sempre o nome e telefone, caso existam
        if(document.getElementById('buyer-name')) document.getElementById('buyer-name').value = currentCustomerData.name || '';
        if(document.getElementById('buyer-phone')) document.getElementById('buyer-phone').value = currentCustomerData.phone || '';
        
        // Verifica se a conta tem o objeto de endereço do registo novo
        if (currentCustomerData.address && typeof currentCustomerData.address === 'object') {
            const addr = currentCustomerData.address;
            if(document.getElementById('buyer-cep')) document.getElementById('buyer-cep').value = addr.cep || '';
            if(document.getElementById('buyer-address')) document.getElementById('buyer-address').value = addr.street || '';
            if(document.getElementById('buyer-number')) document.getElementById('buyer-number').value = addr.number || '';
            if(document.getElementById('buyer-complement')) document.getElementById('buyer-complement').value = addr.complement || '';
            if(document.getElementById('buyer-neighborhood')) document.getElementById('buyer-neighborhood').value = addr.neighborhood || '';
            if(document.getElementById('buyer-city')) document.getElementById('buyer-city').value = addr.city || '';
            if(document.getElementById('buyer-state')) document.getElementById('buyer-state').value = addr.state || '';
        }
    }

    closeCart(); 
    checkoutModal.style.display = 'flex'; 
});

btnCancelCheckout.addEventListener('click', () => {
    checkoutModal.style.display = 'none';
    openCart(); 
});

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnSubmit = checkoutForm.querySelector('button[type="submit"]');
    btnSubmit.innerText = "A gerar pagamento...";
    btnSubmit.disabled = true;

    const buyerName = document.getElementById('buyer-name').value;
    const buyerPhone = document.getElementById('buyer-phone').value;
    const paymentMethod = document.getElementById('payment-method').value;

    const structuredAddress = {
        cep: document.getElementById('buyer-cep').value,
        street: document.getElementById('buyer-address').value,
        number: document.getElementById('buyer-number').value,
        complement: document.getElementById('buyer-complement').value,
        neighborhood: document.getElementById('buyer-neighborhood').value,
        city: document.getElementById('buyer-city').value,
        state: document.getElementById('buyer-state').value
    };

    let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData = {
        customer_id: currentCustomerId || null,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_address: structuredAddress,
        payment_method: paymentMethod,
        payment_status: 'pendente',
        items: cart, 
        total_amount: total,
        status: 'novo', 
        created_at: serverTimestamp()
    };

    try {
        const docRef = await addDoc(collection(db, 'stores', storeId, 'orders'), orderData);
        const newOrderId = docRef.id;
        
        cart = [];
        saveCart();
        renderCart();
        checkoutForm.reset();
        checkoutModal.style.display = 'none';

        alert(`Pedido #${newOrderId.substring(0,6)} registado com sucesso!\nMétodo: ${paymentMethod.toUpperCase()}.\n\nA aguardar integração do Gateway de Pagamento.`);
        
    } catch (error) {
        console.error("Erro ao gravar o pedido:", error);
        alert("Ocorreu um erro. Verifique as regras do Firestore ou se está logado corretamente.");
    } finally {
        btnSubmit.innerText = "Ir para Pagamento Seguro";
        btnSubmit.disabled = false;
    }
});

initStore();