import './aws-config.js';
import { client, unwrapJson } from './aws-config.js';
import { getUrl } from 'aws-amplify/storage';

const params = new URLSearchParams(window.location.search);
const storeId = params.get('id');
const storeNameElement = document.getElementById('public-store-name');
const productsList = document.getElementById('public-products-list');
const navLogin = document.getElementById('nav-login');
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

let products = {};
let cart = JSON.parse(localStorage.getItem(`cart_${storeId}`) || '[]');
let storeData = null;
let freightValue = 0;
let freightMethod = '';

if (navLogin) navLogin.href = `login-cliente.html?id=${encodeURIComponent(storeId || '')}`;

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
    document.body.innerHTML = '<h1 style="text-align:center;margin-top:100px;">Loja não especificada.</h1>';
    return;
  }

  try {
    const { data: store, errors } = await client.models.Store.get({ storeId }, { authMode: 'apiKey' });
    if (errors?.length || !store) throw new Error('Loja não encontrada.');
    storeData = store;
    storeNameElement.innerText = store.name;
    document.title = `${store.name} - Loja Oficial`;

    const theme = unwrapJson(store.themeConfig, {});
    const root = document.documentElement;
    if (theme.primary_color) root.style.setProperty('--primary-color', theme.primary_color);
    if (theme.secondary_color) root.style.setProperty('--secondary-color', theme.secondary_color);
    productsList.className = theme.home_layout?.vitrine_style === 'carousel' ? 'vitrine-carousel' : 'vitrine-grid';

    await loadPublicProducts();
    updateCartBadge();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = '<h1 style="text-align:center;margin-top:100px;">Loja não encontrada.</h1>';
  }
}

async function resolveImage(path) {
  if (!path) return null;
  try {
    const { url } = await getUrl({ path });
    return url.toString();
  } catch {
    return null;
  }
}

async function loadPublicProducts() {
  const { data, errors } = await client.models.Product.list({
    authMode: 'apiKey',
    filter: { storeId: { eq: storeId } },
  });
  if (errors?.length) throw new Error(errors.map((item) => item.message).join('; '));

  productsList.innerHTML = '';
  products = {};
  const active = (data || []).filter((product) => product.isActive !== false && Number(product.stock || 0) > 0);

  if (!active.length) {
    productsList.innerHTML = '<p style="text-align:center;width:100%;color:#718096;">Esta loja ainda não tem produtos disponíveis.</p>';
    return;
  }

  for (const product of active) {
    products[product.id] = product;
    const url = await resolveImage(product.imagePath);
    const card = document.createElement('div');
    card.className = 'public-product-card';
    card.innerHTML = `
      ${url ? `<img src="${url}" alt="${escapeHtml(product.name)}" style="width:100%;height:250px;object-fit:cover;border-radius:8px 8px 0 0;margin:-1.5rem -1.5rem 1rem -1.5rem;">` : '<div style="width:calc(100% + 3rem);height:250px;background:#e2e8f0;margin:-1.5rem -1.5rem 1rem -1.5rem;display:flex;align-items:center;justify-content:center;color:#718096;">Sem foto</div>'}
      <h4>${escapeHtml(product.name)}</h4>
      <span class="price">${money(product.price)}</span>
      <p class="desc">${escapeHtml(product.description || '')}</p>
      <button class="btn-buy" onclick="addToCart('${product.id}')">Adicionar ao Carrinho</button>`;
    productsList.appendChild(card);
  }
}

window.addToCart = (productId) => {
  const product = products[productId];
  if (!product) return;
  const existing = cart.find((item) => item.id === productId);
  const maxStock = Number(product.stock || 0);

  if (existing) {
    if (existing.quantity >= maxStock) return alert('Quantidade máxima em estoque atingida.');
    existing.quantity += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: Number(product.price || 0), imagePath: product.imagePath || null, quantity: 1, maxStock });
  }
  saveCart();
  openCart();
};

window.changeQuantity = (productId, delta) => {
  const item = cart.find((entry) => entry.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== productId);
  if (item.quantity > item.maxStock) item.quantity = item.maxStock;
  saveCart();
  renderCart();
};

window.removeFromCart = (productId) => {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
};

function saveCart() {
  localStorage.setItem(`cart_${storeId}`, JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  cartBadge.innerText = cart.reduce((total, item) => total + item.quantity, 0);
}

async function renderCart() {
  cartItemsContainer.innerHTML = '';
  if (!cart.length) {
    cartItemsContainer.innerHTML = '<p class="empty-cart-msg">O seu carrinho está vazio.</p>';
    cartTotalPrice.innerText = money(0);
    return;
  }

  for (const item of cart) {
    const url = await resolveImage(item.imagePath);
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      ${url ? `<img src="${url}" class="cart-item-img" alt="">` : '<div class="cart-item-img" style="background:#e2e8f0;"></div>'}
      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${money(item.price)}</div>
        <div class="cart-controls">
          <button class="btn-qtd" onclick="changeQuantity('${item.id}',-1)">-</button>
          <span>${item.quantity}</span>
          <button class="btn-qtd" onclick="changeQuantity('${item.id}',1)">+</button>
          <button class="btn-remove" onclick="removeFromCart('${item.id}')">Remover</button>
        </div>
      </div>`;
    cartItemsContainer.appendChild(itemEl);
  }
  cartTotalPrice.innerText = money(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
}

function calculateShipping() {
  const options = [
    { name: 'PAC (Padrão)', value: 15.9 },
    { name: 'SEDEX (Expresso)', value: 35.5 },
  ];
  document.getElementById('shipping-options').innerHTML = options.map((option) => `
    <label style="display:flex;justify-content:space-between;padding:.5rem;border:1px solid #e2e8f0;border-radius:6px;background:#fff;">
      <span><input type="radio" name="frete-radio" value="${option.value}" data-name="${option.name}" onchange="selecionarFrete(this)"> ${option.name}</span>
      <span>${money(option.value)}</span>
    </label>`).join('');
}

window.selecionarFrete = (radio) => {
  freightValue = Number(radio.value);
  freightMethod = radio.dataset.name;
  updateCheckoutButton();
};

function updateCheckoutButton() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  checkoutForm.querySelector('button[type="submit"]').innerText = `Finalizar ${money(subtotal + freightValue)}`;
}

const cepInput = document.getElementById('buyer-cep');
cepInput?.addEventListener('input', async (event) => {
  const value = event.target.value.replace(/\D/g, '');
  if (value.length !== 8) return;
  calculateShipping();
  try {
    const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
    const address = await response.json();
    if (!address.erro) {
      document.getElementById('buyer-address').value = address.logradouro || '';
      document.getElementById('buyer-neighborhood').value = address.bairro || '';
      document.getElementById('buyer-city').value = address.localidade || '';
      document.getElementById('buyer-state').value = address.uf || '';
      document.getElementById('buyer-number').focus();
    }
  } catch (error) {
    console.warn('ViaCEP indisponível:', error);
  }
});

btnCheckout.addEventListener('click', () => {
  if (!cart.length) return alert('O seu carrinho está vazio!');
  freightValue = 0;
  freightMethod = '';
  calculateShipping();
  updateCheckoutButton();
  closeCart();
  checkoutModal.style.display = 'flex';
});

btnCancelCheckout.addEventListener('click', () => {
  checkoutModal.style.display = 'none';
  openCart();
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!freightValue) return alert('Selecione uma opção de entrega.');

  const button = checkoutForm.querySelector('button[type="submit"]');
  const originalText = button.innerText;
  button.disabled = true;
  button.innerText = 'Registrando pedido...';

  try {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const payload = {
      sellerId: storeId,
      storeId,
      buyerName: document.getElementById('buyer-name').value.trim(),
      buyerPhone: document.getElementById('buyer-phone').value.trim(),
      buyerAddress: {
        cep: document.getElementById('buyer-cep').value,
        street: document.getElementById('buyer-address').value,
        number: document.getElementById('buyer-number').value,
        complement: document.getElementById('buyer-complement').value,
        neighborhood: document.getElementById('buyer-neighborhood').value,
        city: document.getElementById('buyer-city').value,
        state: document.getElementById('buyer-state').value,
      },
      paymentMethod: document.getElementById('payment-method').value,
      paymentStatus: 'pendente',
      freightMethod,
      freightCost: freightValue,
      items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
      totalAmount: subtotal + freightValue,
      status: 'novo',
    };

    const { data: order, errors } = await client.models.Order.create(payload, { authMode: 'apiKey' });
    if (errors?.length) throw new Error(errors.map((item) => item.message).join('; '));

    cart = [];
    saveCart();
    await renderCart();
    checkoutForm.reset();
    checkoutModal.style.display = 'none';
    alert(`Pedido ${order?.id ? '#' + order.id.slice(0, 6) : ''} registrado com sucesso. O pagamento online ainda não está integrado.`);
  } catch (error) {
    console.error('Erro ao registrar pedido:', error);
    alert('Não foi possível registrar o pedido.');
  } finally {
    button.disabled = false;
    button.innerText = originalText;
  }
});

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

initStore();
