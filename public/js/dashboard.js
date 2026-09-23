import { client, unwrapJson } from './aws-config.js';
import { requireMerchant } from './session.js';
import { renderSidebar, updateSidebarData } from './sidebar.js';

const dashboardContent = document.getElementById('dashboard-content');
const userEmailDisplay = document.getElementById('user-email');

renderSidebar('dashboard');

async function init() {
  try {
    const { user, store } = await requireMerchant();
    dashboardContent.style.display = 'flex';
    userEmailDisplay.innerText = store?.email || user.signInDetails?.loginId || '';
    updateSidebarData(store?.name || 'Minha Loja', user.userId);
    await loadStoreIntelligence(user.userId);
  } catch (error) {
    console.error('Erro ao iniciar dashboard:', error);
  }
}

async function loadStoreIntelligence(userId) {
  try {
    const [{ data: products, errors: productErrors }, { data: orders, errors: orderErrors }] = await Promise.all([
      client.models.Product.list({ filter: { storeId: { eq: userId } } }),
      client.models.Order.list({ filter: { storeId: { eq: userId } } }),
    ]);

    if (productErrors?.length || orderErrors?.length) {
      throw new Error([...(productErrors || []), ...(orderErrors || [])].map((item) => item.message).join('; '));
    }

    renderLowStock(products || []);
    renderMetrics(orders || []);
  } catch (error) {
    console.error('Erro ao processar inteligência da loja:', error);
  }
}

function renderLowStock(products) {
  const low = products.filter((product) => product.isActive !== false && Number(product.stock || 0) <= 5);
  document.getElementById('low-stock-list').innerHTML = low.length
    ? low.map((product) => `<div class="list-item"><span>${escapeHtml(product.name)}</span><span class="alert-text">${Number(product.stock || 0)} restantes</span></div>`).join('')
    : '<p style="color:#68d391;text-align:center;padding:1rem 0;">Todos os estoques estão saudáveis!</p>';
}

function renderMetrics(orders) {
  const validOrders = orders.filter((order) => order.status !== 'cancelado');
  const pendingOrders = orders.filter((order) => ['novo', 'processamento'].includes(order.status || 'novo'));
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  let totalSales = 0;
  let monthSales = 0;
  const paymentMethods = { pix: 0, cartao: 0, boleto: 0, outros: 0 };
  const topProducts = {};
  const topCustomers = {};
  const labels = [];
  const salesByDay = {};

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    labels.push(key);
    salesByDay[key] = 0;
  }

  validOrders.forEach((order) => {
    const amount = Number(order.totalAmount || 0);
    const freight = Number(order.freightCost || 0);
    const revenue = amount - freight;
    totalSales += revenue;

    const date = order.createdAt ? new Date(order.createdAt) : null;
    if (date && !Number.isNaN(date.getTime())) {
      if (date >= startOfMonth) monthSales += revenue;
      const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (key in salesByDay) salesByDay[key] += revenue;
    }

    const method = String(order.paymentMethod || '').toLowerCase();
    if (method === 'pix') paymentMethods.pix += 1;
    else if (method === 'cartao') paymentMethods.cartao += 1;
    else if (method === 'boleto') paymentMethods.boleto += 1;
    else paymentMethods.outros += 1;

    const customer = order.buyerName || 'Desconhecido';
    topCustomers[customer] = (topCustomers[customer] || 0) + revenue;

    const items = unwrapJson(order.items, []);
    if (Array.isArray(items)) {
      items.forEach((item) => {
        const name = item.name || 'Produto sem nome';
        if (!topProducts[name]) topProducts[name] = { qty: 0, revenue: 0 };
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        topProducts[name].qty += qty;
        topProducts[name].revenue += price * qty;
      });
    }
  });

  const averageTicket = validOrders.length ? totalSales / validOrders.length : 0;
  document.getElementById('metric-total-sales').innerText = money(totalSales);
  document.getElementById('metric-month-sales').innerText = money(monthSales);
  document.getElementById('metric-ticket-medio').innerText = money(averageTicket);
  document.getElementById('metric-pending-orders').innerText = pendingOrders.length;

  const bestProducts = Object.entries(topProducts).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  document.getElementById('top-products-list').innerHTML = bestProducts.length
    ? bestProducts.map(([name, data]) => `<div class="list-item"><span>${escapeHtml(name)}</span><span>${data.qty} un. / <span style="color:#68d391;">${money(data.revenue)}</span></span></div>`).join('')
    : '<p style="color:#718096;text-align:center;">Ainda sem vendas.</p>';

  const bestCustomers = Object.entries(topCustomers).sort((a, b) => b[1] - a[1]).slice(0, 5);
  document.getElementById('top-customers-list').innerHTML = bestCustomers.length
    ? bestCustomers.map(([name, total]) => `<div class="list-item"><span>${escapeHtml(name)}</span><span style="color:#63b3ed;font-weight:bold;">${money(total)}</span></div>`).join('')
    : '<p style="color:#718096;text-align:center;">Ainda sem vendas.</p>';

  renderCharts(labels, Object.values(salesByDay), paymentMethods);
}

let salesChartInstance = null;
let paymentChartInstance = null;

function renderCharts(labels, sales, methods) {
  const salesCanvas = document.getElementById('salesChart');
  const paymentCanvas = document.getElementById('paymentChart');
  if (!salesCanvas || !paymentCanvas || typeof Chart === 'undefined') return;

  if (salesChartInstance) salesChartInstance.destroy();
  salesChartInstance = new Chart(salesCanvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Faturamento Líquido (R$)', data: sales, borderColor: '#ed8936', backgroundColor: 'rgba(237,137,54,.2)', borderWidth: 2, fill: true, tension: .4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } },
  });

  if (paymentChartInstance) paymentChartInstance.destroy();
  paymentChartInstance = new Chart(paymentCanvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels: ['PIX', 'Cartão', 'Boleto', 'Outros'], datasets: [{ data: [methods.pix, methods.cartao, methods.boleto, methods.outros], backgroundColor: ['#68d391','#63b3ed','#f6e05e','#a0aec0'], borderWidth: 0 }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, cutout: '70%' },
  });
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

init();
