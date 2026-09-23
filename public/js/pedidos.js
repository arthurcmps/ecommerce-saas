import { client, unwrapJson } from './aws-config.js';
import { requireMerchant } from './session.js';
import { renderSidebar, updateSidebarData } from './sidebar.js';

const dashboardContent = document.getElementById('dashboard-content');
const ordersList = document.getElementById('orders-list');
const searchInput = document.getElementById('search-orders');
const modal = document.getElementById('order-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const statusSelect = document.getElementById('order-status-select');
const btnUpdateStatus = document.getElementById('btn-update-status');

let currentUserId = null;
let loadedOrders = {};
let viewingOrderId = null;

renderSidebar('pedidos');
btnCloseModal.addEventListener('click', () => { modal.style.display = 'none'; });

async function init() {
  try {
    const { user, store } = await requireMerchant();
    currentUserId = user.userId;
    dashboardContent.style.display = 'flex';
    updateSidebarData(store?.name || 'Minha Loja', currentUserId);
    await loadOrders();
  } catch (error) {
    console.error('Erro ao iniciar pedidos:', error);
  }
}

async function loadOrders() {
  ordersList.innerHTML = '<p style="color:#a0aec0;text-align:center;">A procurar pedidos...</p>';
  loadedOrders = {};

  try {
    const { data, errors } = await client.models.Order.list({ filter: { storeId: { eq: currentUserId } } });
    if (errors?.length) throw new Error(errors.map((item) => item.message).join('; '));

    const orders = [...(data || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    ordersList.innerHTML = '';

    if (!orders.length) {
      ordersList.innerHTML = '<p style="color:#a0aec0;text-align:center;">Ainda não existem pedidos registados.</p>';
      return;
    }

    orders.forEach((order) => {
      loadedOrders[order.id] = order;
      const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : 'Data indisponível';
      const items = unwrapJson(order.items, []);
      const itemsCount = Array.isArray(items) ? items.length : 0;
      const total = Number(order.totalAmount || 0);
      const card = document.createElement('div');
      card.className = 'order-card';
      card.innerHTML = `
        <div class="order-info">
          <h3>${escapeHtml(order.buyerName || 'Cliente')}</h3>
          <p>${dateStr} • ${itemsCount} item(ns) • ${money(total)}</p>
        </div>
        <div style="display:flex;align-items:center;gap:1rem;">
          <span class="status-badge status-${escapeHtml(order.status || 'novo')}">${escapeHtml(order.status || 'novo')}</span>
          <button class="btn-view-order" onclick="openOrderDetails('${order.id}')">Ver Detalhes</button>
        </div>`;
      ordersList.appendChild(card);
    });
  } catch (error) {
    console.error('Erro ao carregar pedidos:', error);
    ordersList.innerHTML = '<p style="color:#e53e3e;text-align:center;">Erro ao carregar o histórico de pedidos.</p>';
  }
}

window.openOrderDetails = (orderId) => {
  const order = loadedOrders[orderId];
  if (!order) return;
  viewingOrderId = orderId;

  document.getElementById('modal-order-title').innerText = `Pedido de ${order.buyerName || 'Cliente'}`;
  document.getElementById('detail-customer-name').innerText = order.buyerName || 'Cliente';
  document.getElementById('detail-customer-phone').innerText = order.buyerPhone || 'Sem contato';

  const address = unwrapJson(order.buyerAddress, {});
  document.getElementById('detail-customer-address').innerText = `${address.street || ''}, ${address.number || ''}${address.complement ? ` - ${address.complement}` : ''}\nBairro: ${address.neighborhood || ''}\n${address.city || ''} / ${address.state || ''}\nCEP: ${address.cep || ''}`;
  document.getElementById('detail-payment-method').innerText = order.paymentMethod || 'Não especificado';
  document.getElementById('detail-payment-status').innerText = `Estado: ${order.paymentStatus || 'Pendente'}`;
  document.getElementById('detail-freight-method').innerText = order.freightMethod || 'A combinar / Padrão';
  document.getElementById('detail-freight-cost').innerText = money(order.freightCost || 0);
  document.getElementById('detail-freight-total').innerText = money(order.freightCost || 0);

  const total = Number(order.totalAmount || 0);
  const freight = Number(order.freightCost || 0);
  document.getElementById('detail-subtotal-price').innerText = money(total - freight);
  document.getElementById('detail-total-price').innerText = money(total);
  statusSelect.value = order.status || 'novo';

  const itemsList = document.getElementById('detail-items-list');
  const items = unwrapJson(order.items, []);
  itemsList.innerHTML = Array.isArray(items) && items.length
    ? items.map((item) => `<div class="detail-item" style="display:flex;justify-content:space-between;padding:.8rem;background:#2d3748;border-radius:6px;margin-bottom:.5rem;"><span style="color:#fff;">${Number(item.quantity || 1)}x ${escapeHtml(item.name || 'Produto')}</span><span style="color:#a0aec0;">${money(Number(item.price || 0) * Number(item.quantity || 1))}</span></div>`).join('')
    : '<p style="color:#a0aec0;">Nenhum item registado neste pedido.</p>';

  modal.style.display = 'flex';
};

btnUpdateStatus.addEventListener('click', async () => {
  if (!viewingOrderId) return;
  const originalText = btnUpdateStatus.innerText;
  btnUpdateStatus.innerText = 'A atualizar...';
  btnUpdateStatus.disabled = true;

  try {
    const { errors } = await client.models.Order.update({ id: viewingOrderId, status: statusSelect.value });
    if (errors?.length) throw new Error(errors.map((item) => item.message).join('; '));
    modal.style.display = 'none';
    await loadOrders();
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    alert('Ocorreu um erro ao atualizar o pedido.');
  } finally {
    btnUpdateStatus.innerText = originalText;
    btnUpdateStatus.disabled = false;
  }
});

searchInput?.addEventListener('input', (event) => {
  const term = event.target.value.toLowerCase();
  ordersList.querySelectorAll('.order-card').forEach((card) => {
    card.style.display = card.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
  });
});

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

init();
