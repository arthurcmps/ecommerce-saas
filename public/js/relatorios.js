import { client } from './aws-config.js';
import { requireMerchant } from './session.js';
import { renderSidebar, updateSidebarData } from './sidebar.js';

const dashboardContent = document.getElementById('dashboard-content');
const tableBody = document.getElementById('report-table-body');
let currentUserId = null;
let allOrders = [];

renderSidebar('relatorios');

async function init() {
  try {
    const { user, store } = await requireMerchant();
    currentUserId = user.userId;
    dashboardContent.style.display = 'flex';
    updateSidebarData(store?.name || 'Minha Loja', currentUserId);
    await fetchOrdersFromDB();
  } catch (error) {
    console.error('Erro ao iniciar relatórios:', error);
  }
}

async function fetchOrdersFromDB() {
  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">A processar dados do banco...</td></tr>';
  try {
    const { data, errors } = await client.models.Order.list({ filter: { storeId: { eq: currentUserId } } });
    if (errors?.length) throw new Error(errors.map((item) => item.message).join('; '));

    allOrders = (data || []).map((order) => ({ ...order, jsDate: order.createdAt ? new Date(order.createdAt) : new Date() }))
      .sort((a, b) => b.jsDate - a.jsDate);
    applyFiltersAndRender();
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#fc8181;">Erro ao carregar dados.</td></tr>';
  }
}

function applyFiltersAndRender() {
  const startDateVal = document.getElementById('filter-start').value;
  const endDateVal = document.getElementById('filter-end').value;
  const statusVal = document.getElementById('filter-status').value;
  let filteredOrders = [...allOrders];

  if (startDateVal) {
    const start = new Date(startDateVal);
    start.setHours(0, 0, 0, 0);
    filteredOrders = filteredOrders.filter((order) => order.jsDate >= start);
  }
  if (endDateVal) {
    const end = new Date(endDateVal);
    end.setHours(23, 59, 59, 999);
    filteredOrders = filteredOrders.filter((order) => order.jsDate <= end);
  }
  if (statusVal !== 'todos') {
    filteredOrders = filteredOrders.filter((order) => (order.status || 'novo') === statusVal);
  }

  renderTable(filteredOrders);
}

function renderTable(orders) {
  tableBody.innerHTML = '';
  let revenueSum = 0;
  let freightSum = 0;
  let totalSum = 0;

  if (!orders.length) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum pedido encontrado nestas datas.</td></tr>';
  } else {
    orders.forEach((order) => {
      const total = Number(order.totalAmount || 0);
      const freight = Number(order.freightCost || 0);
      const revenue = total - freight;
      if (order.status !== 'cancelado') {
        revenueSum += revenue;
        freightSum += freight;
        totalSum += total;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${order.jsDate.toLocaleDateString('pt-BR')}</td>
        <td>${escapeHtml(order.buyerName || 'Desconhecido')}</td>
        <td style="text-transform:uppercase;">${escapeHtml(order.paymentMethod || '-')}</td>
        <td>${money(revenue)}</td>
        <td>${money(freight)}</td>
        <td style="font-weight:bold;color:#68d391;">${money(total)}</td>
        <td style="text-transform:capitalize;">${escapeHtml(order.status || 'novo')}</td>`;
      tableBody.appendChild(tr);
    });
  }

  document.getElementById('summary-revenue').innerText = money(revenueSum);
  document.getElementById('summary-freight').innerText = money(freightSum);
  document.getElementById('summary-total').innerText = money(totalSum);
  window.currentFilteredData = orders;
}

document.getElementById('btn-apply-filters').addEventListener('click', applyFiltersAndRender);
document.getElementById('btn-print-pdf').addEventListener('click', () => window.print());
document.getElementById('btn-export-csv').addEventListener('click', () => {
  const data = window.currentFilteredData || [];
  if (!data.length) return alert('Não há dados para exportar.');

  let csv = 'Data;Cliente;Telefone;Metodo Pagamento;Receita Produtos;Custo Frete;Total;Status\n';
  data.forEach((order) => {
    const total = Number(order.totalAmount || 0);
    const freight = Number(order.freightCost || 0);
    const revenue = total - freight;
    const name = String(order.buyerName || '').replace(/;/g, ',');
    const phone = String(order.buyerPhone || '').replace(/;/g, ',');
    csv += `${order.jsDate.toLocaleDateString('pt-BR')};${name};${phone};${order.paymentMethod || ''};${revenue.toFixed(2)};${freight.toFixed(2)};${total.toFixed(2)};${order.status || 'novo'}\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `relatorio_vendas_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

init();
