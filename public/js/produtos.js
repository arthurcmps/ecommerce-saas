import { client, unwrapJson } from './aws-config.js';
import { requireMerchant } from './session.js';
import { getUrl, uploadData } from 'aws-amplify/storage';
import { renderSidebar, updateSidebarData } from './sidebar.js';

const dashboardContent = document.getElementById('dashboard-content');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modal = document.getElementById('product-modal');
const addProductForm = document.getElementById('add-product-form');
const productsList = document.getElementById('products-list');
const modalTitle = document.getElementById('modal-title');
const categorySelect = document.getElementById('product-category');
const attributesContainer = document.getElementById('dynamic-attributes-container');

let currentUserId = null;
let loadedProducts = {};
let editingProductId = null;

const categoryTemplates = {
  roupas: { title: 'Tamanhos Disponíveis', options: ['PP', 'P', 'M', 'G', 'GG', 'XG'] },
  calcados: { title: 'Numerações Disponíveis', options: ['34','35','36','37','38','39','40','41','42','43','44'] },
  eletronicos: { title: 'Voltagem', options: ['110V', '220V', 'Bivolt'] },
  suplementos: { title: 'Pesos / Tamanhos', options: ['150g', '250g', '500g', '1kg', '2kg', '3kg'] },
  acessorios: { title: 'Cores/Modelos', options: ['Preto', 'Branco', 'Prata', 'Dourado', 'Colorido'] },
};

renderSidebar('produtos');

function renderAttributes(category, selectedVars = []) {
  const template = categoryTemplates[category];
  if (!template) {
    attributesContainer.style.display = 'none';
    attributesContainer.innerHTML = '';
    return;
  }

  attributesContainer.innerHTML = `
    <h4 style="color:#ed8936;margin-bottom:.8rem;font-size:.9rem;">${template.title}</h4>
    <div style="display:flex;flex-wrap:wrap;gap:.5rem;">
      ${template.options.map((opt) => `
        <label style="background:#2d3748;padding:.5rem 1rem;border-radius:6px;cursor:pointer;border:1px solid #4a5568;display:flex;align-items:center;gap:.5rem;">
          <input type="checkbox" name="product-variation" value="${opt}" ${selectedVars.includes(opt) ? 'checked' : ''}>
          <span style="color:#e2e8f0;font-size:.9rem;">${opt}</span>
        </label>`).join('')}
    </div>`;
  attributesContainer.style.display = 'block';
}

categorySelect?.addEventListener('change', (e) => renderAttributes(e.target.value));
btnOpenModal.addEventListener('click', () => {
  editingProductId = null;
  addProductForm.reset();
  renderAttributes('padrao');
  modalTitle.innerText = 'Adicionar Novo Produto';
  modal.style.display = 'flex';
});
btnCloseModal.addEventListener('click', () => { modal.style.display = 'none'; });

async function init() {
  try {
    const { user, store } = await requireMerchant();
    currentUserId = user.userId;
    dashboardContent.style.display = 'flex';
    updateSidebarData(store?.name || 'Minha Loja', currentUserId);
    await loadProducts();
  } catch (error) {
    console.error('Erro ao iniciar produtos:', error);
  }
}

async function imageUrl(path) {
  if (!path) return null;
  try {
    const { url } = await getUrl({ path });
    return url.toString();
  } catch {
    return null;
  }
}

async function loadProducts() {
  productsList.innerHTML = '<p style="color:#a0aec0;text-align:center;grid-column:1/-1;">Carregando o estoque...</p>';
  loadedProducts = {};

  try {
    const { data, errors } = await client.models.Product.list({ filter: { storeId: { eq: currentUserId } } });
    if (errors?.length) throw new Error(errors.map((item) => item.message).join('; '));

    productsList.innerHTML = '';
    if (!data?.length) {
      productsList.innerHTML = '<p style="color:#a0aec0;grid-column:1/-1;">Você ainda não tem produtos cadastrados.</p>';
      return;
    }

    for (const product of data) {
      loadedProducts[product.id] = product;
      const url = await imageUrl(product.imagePath);
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        ${url ? `<img src="${url}" alt="${escapeHtml(product.name)}" style="width:100%;height:180px;object-fit:cover;border-radius:4px;margin-bottom:1rem;">` : '<div style="width:100%;height:180px;background:#2d3748;border-radius:4px;margin-bottom:1rem;display:flex;align-items:center;justify-content:center;color:#a0aec0;">Sem foto</div>'}
        <h3>${escapeHtml(product.name)}</h3>
        <span class="price">${Number(product.price || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
        <span class="stock">Estoque: ${product.stock || 0} un.</span>
        <p style="color:#718096;font-size:.85rem;margin-top:.5rem;flex:1;">${escapeHtml(product.description || '')}</p>
        <div class="card-actions">
          <button class="btn-edit" onclick="editProduct('${product.id}')">Editar</button>
          <button class="btn-delete" onclick="deleteProduct('${product.id}')">Excluir</button>
        </div>`;
      productsList.appendChild(card);
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    productsList.innerHTML = '<p style="color:#e53e3e;grid-column:1/-1;">Erro ao carregar os produtos.</p>';
  }
}

window.editProduct = (id) => {
  const product = loadedProducts[id];
  if (!product) return;
  editingProductId = id;
  document.getElementById('prod-name').value = product.name || '';
  document.getElementById('prod-price').value = product.price ?? '';
  document.getElementById('prod-stock').value = product.stock ?? 0;
  document.getElementById('prod-desc').value = product.description || '';
  categorySelect.value = product.category || 'padrao';
  renderAttributes(product.category || 'padrao', product.availableVariations || []);

  const dimensions = unwrapJson(product.shippingDimensions, {});
  document.getElementById('prod-weight').value = dimensions.weight_kg ?? '';
  document.getElementById('prod-length').value = dimensions.length_cm ?? '';
  document.getElementById('prod-width').value = dimensions.width_cm ?? '';
  document.getElementById('prod-height').value = dimensions.height_cm ?? '';
  document.getElementById('prod-image').value = '';
  modalTitle.innerText = 'Editar Produto';
  modal.style.display = 'flex';
};

window.deleteProduct = async (id) => {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  try {
    const { errors } = await client.models.Product.delete({ id });
    if (errors?.length) throw new Error(errors.map((item) => item.message).join('; '));
    await loadProducts();
  } catch (error) {
    console.error('Erro ao excluir:', error);
    alert('Erro ao excluir o produto.');
  }
};

addProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btnSave = document.getElementById('btn-save-product');
  const originalText = btnSave.innerText;
  btnSave.innerText = 'Salvando...';
  btnSave.disabled = true;

  try {
    let imagePath = editingProductId ? loadedProducts[editingProductId]?.imagePath : null;
    const imageInput = document.getElementById('prod-image');
    if (imageInput.files?.length) {
      const file = imageInput.files[0];
      imagePath = `products/${currentUserId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await uploadData({ path: imagePath, data: file }).result;
    }

    const selectedVariations = Array.from(document.querySelectorAll('input[name="product-variation"]:checked')).map((cb) => cb.value);
    const payload = {
      sellerId: currentUserId,
      storeId: currentUserId,
      name: document.getElementById('prod-name').value.trim(),
      price: Number(document.getElementById('prod-price').value),
      stock: Number(document.getElementById('prod-stock').value),
      category: categorySelect.value,
      availableVariations: selectedVariations,
      description: document.getElementById('prod-desc').value.trim(),
      imagePath,
      shippingDimensions: {
        weight_kg: Number(document.getElementById('prod-weight').value),
        length_cm: Number(document.getElementById('prod-length').value),
        width_cm: Number(document.getElementById('prod-width').value),
        height_cm: Number(document.getElementById('prod-height').value),
      },
      isActive: true,
    };

    const result = editingProductId
      ? await client.models.Product.update({ id: editingProductId, ...payload })
      : await client.models.Product.create(payload);

    if (result.errors?.length) throw new Error(result.errors.map((item) => item.message).join('; '));

    addProductForm.reset();
    renderAttributes('padrao');
    modal.style.display = 'none';
    await loadProducts();
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    alert('Ocorreu um erro ao salvar o produto.');
  } finally {
    btnSave.innerText = originalText;
    btnSave.disabled = false;
  }
});

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

init();
