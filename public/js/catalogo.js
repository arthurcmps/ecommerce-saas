import './aws-config.js';
import { client } from './aws-config.js';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { getUrl } from 'aws-amplify/storage';

const productsList = document.getElementById('marketplace-products');
const navLogin = document.getElementById('nav-login');

async function configureSessionLink() {
  try {
    await getCurrentUser();
    navLogin.innerText = 'Sair da Conta';
    navLogin.href = '#';
    navLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut();
      window.location.reload();
    });
  } catch {
    navLogin.innerText = 'Entrar';
    navLogin.href = 'login-cliente.html';
  }
}

async function resolveImage(imagePath) {
  if (!imagePath) return null;
  try {
    const { url } = await getUrl({ path: imagePath });
    return url.toString();
  } catch (error) {
    console.warn('Não foi possível carregar imagem:', error);
    return null;
  }
}

async function loadMarketplace() {
  productsList.innerHTML = '<p style="text-align: center; width: 100%; color: #718096;">A carregar o catálogo...</p>';

  try {
    const [{ data: stores, errors: storeErrors }, { data: products, errors: productErrors }] = await Promise.all([
      client.models.Store.list({ authMode: 'apiKey' }),
      client.models.Product.list({ authMode: 'apiKey' }),
    ]);

    if (storeErrors?.length || productErrors?.length) {
      throw new Error([...(storeErrors || []), ...(productErrors || [])].map((item) => item.message).join('; '));
    }

    const storeMap = new Map((stores || []).map((store) => [store.storeId, store]));
    const activeProducts = (products || []).filter((product) => product.isActive !== false);

    productsList.innerHTML = '';

    if (!activeProducts.length) {
      productsList.innerHTML = '<p style="text-align:center; width: 100%; color:#718096;">Nenhum produto disponível no momento.</p>';
      return;
    }

    for (const product of activeProducts) {
      const store = storeMap.get(product.storeId);
      const imageUrl = await resolveImage(product.imagePath);
      const card = document.createElement('div');
      card.className = 'public-product-card';
      card.innerHTML = `
        ${imageUrl
          ? `<img src="${imageUrl}" alt="${escapeHtml(product.name)}" style="width:100%;height:220px;object-fit:cover;border-radius:8px 8px 0 0;">`
          : '<div style="height:220px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#718096;border-radius:8px 8px 0 0;">Sem foto</div>'}
        <div style="padding: 1rem;">
          <small style="color:#718096;">${escapeHtml(store?.name || 'Loja parceira')}</small>
          <h4>${escapeHtml(product.name)}</h4>
          <span class="price">${Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          <p class="desc">${escapeHtml(product.description || '')}</p>
          <a class="btn-buy" href="loja.html?id=${encodeURIComponent(product.storeId)}">Ver na loja</a>
        </div>
      `;
      productsList.appendChild(card);
    }
  } catch (error) {
    console.error('Erro ao carregar catálogo:', error);
    productsList.innerHTML = '<p style="text-align:center; width:100%; color:#e53e3e;">Não foi possível carregar o catálogo.</p>';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

configureSessionLink();
loadMarketplace();
