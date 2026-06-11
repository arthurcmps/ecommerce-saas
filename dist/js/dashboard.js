// js/dashboard.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { renderSidebar, updateSidebarData } from "./sidebar.js";

const dashboardContent = document.getElementById('dashboard-content');
const userEmailDisplay = document.getElementById('user-email');

let currentStoreId = null;

renderSidebar('dashboard');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentStoreId = user.uid;
        dashboardContent.style.display = 'flex';
        userEmailDisplay.innerText = user.email;

        try {
            const storeDoc = await getDoc(doc(db, 'stores', user.uid));
            if (storeDoc.exists()) {
                updateSidebarData(storeDoc.data().name, user.uid);
                await loadStoreIntelligence(user.uid);
            }
        } catch (error) {
            console.error("Erro ao carregar loja:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

async function loadStoreIntelligence(userId) {
    try {
        const productsSnap = await getDocs(collection(db, 'stores', userId, 'products'));
        let lowStockHtml = '';
        let hasLowStock = false;

        productsSnap.forEach(doc => {
            const prod = doc.data();
            if (prod.is_active !== false) {
                const stock = parseInt(prod.stock) || 0;
                if (stock <= 5) { 
                    hasLowStock = true;
                    lowStockHtml += `
                        <div class="list-item">
                            <span>${prod.name}</span>
                            <span class="alert-text">${stock} restantes</span>
                        </div>
                    `;
                }
            }
        });
        document.getElementById('low-stock-list').innerHTML = hasLowStock ? lowStockHtml : '<p style="color: #68d391; text-align: center; padding: 1rem 0;">Todos os stocks estão saudáveis!</p>';

        const ordersSnap = await getDocs(query(collection(db, 'stores', userId, 'orders'), orderBy('created_at', 'desc')));

        let totalSales = 0, monthSales = 0;
        let validOrdersCount = 0, pendingOrdersCount = 0;
        
        let paymentMethods = { pix: 0, cartao: 0, boleto: 0, outros: 0 };
        let topProductsAgg = {};
        let topCustomersAgg = {};
        
        let last7DaysStr = [];
        let last7DaysSales = {};
        for(let i=6; i>=0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dateStr = d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
            last7DaysStr.push(dateStr);
            last7DaysSales[dateStr] = 0;
        }

        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        ordersSnap.forEach(docSnap => {
            const order = docSnap.data();
            
            if (order.status === 'novo' || order.status === 'processamento') pendingOrdersCount++;

            if (order.status !== 'cancelado') {
                const amount = parseFloat(order.total_amount) || 0;
                const freight = parseFloat(order.freight_cost) || 0;
                
                // CONTABILIDADE CORRIGIDA: Subtrai o frete para ter a receita real dos produtos
                const productRevenue = amount - freight;

                validOrdersCount++;
                totalSales += productRevenue;

                if (order.created_at && typeof order.created_at.toDate === 'function') {
                    const orderDate = order.created_at.toDate();
                    if (orderDate >= startOfMonth) monthSales += productRevenue;
                    
                    let dateKey = orderDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
                    if (last7DaysSales[dateKey] !== undefined) {
                        last7DaysSales[dateKey] += productRevenue;
                    }
                }

                let method = (order.payment_method || '').toLowerCase();
                if(method === 'pix') paymentMethods.pix++;
                else if(method === 'cartao') paymentMethods.cartao++;
                else if(method === 'boleto') paymentMethods.boleto++;
                else paymentMethods.outros++;

                let customerName = order.buyer_name || 'Desconhecido';
                if (!topCustomersAgg[customerName]) topCustomersAgg[customerName] = 0;
                topCustomersAgg[customerName] += productRevenue;

                if (order.items && order.items.length > 0) {
                    order.items.forEach(item => {
                        let pName = item.name || 'Produto sem nome';
                        if (!topProductsAgg[pName]) topProductsAgg[pName] = { qty: 0, revenue: 0 };
                        topProductsAgg[pName].qty += (parseInt(item.quantity) || 1);
                        topProductsAgg[pName].revenue += ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1));
                    });
                }
            }
        });

        const ticketMedio = validOrdersCount > 0 ? (totalSales / validOrdersCount) : 0;

        document.getElementById('metric-total-sales').innerText = totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('metric-month-sales').innerText = monthSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('metric-ticket-medio').innerText = ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('metric-pending-orders').innerText = pendingOrdersCount;

        const sortedProducts = Object.entries(topProductsAgg).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
        let productsHtml = '';
        sortedProducts.forEach(([name, data]) => {
            productsHtml += `
                <div class="list-item">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%;">${name}</span>
                    <span>${data.qty} un. / <span style="color: #68d391;">R$ ${data.revenue.toFixed(2)}</span></span>
                </div>`;
        });
        document.getElementById('top-products-list').innerHTML = sortedProducts.length > 0 ? productsHtml : '<p style="color: #718096; text-align: center;">Ainda sem vendas.</p>';

        const sortedCustomers = Object.entries(topCustomersAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
        let customersHtml = '';
        sortedCustomers.forEach(([name, total]) => {
            customersHtml += `
                <div class="list-item">
                    <span>${name}</span>
                    <span style="color: #63b3ed; font-weight: bold;">R$ ${total.toFixed(2)}</span>
                </div>`;
        });
        document.getElementById('top-customers-list').innerHTML = sortedCustomers.length > 0 ? customersHtml : '<p style="color: #718096; text-align: center;">Ainda sem vendas.</p>';

        renderCharts(last7DaysStr, Object.values(last7DaysSales), paymentMethods);

    } catch (error) {
        console.error("Erro ao processar inteligência da loja:", error);
    }
}

let salesChartInstance = null;
let paymentChartInstance = null;

function renderCharts(labelsDias, dadosVendas, metodosPagamento) {
    const corPrimaria = '#ed8936'; 
    const corFundoChart = 'rgba(237, 137, 54, 0.2)';

    const ctxSales = document.getElementById('salesChart').getContext('2d');
    if (salesChartInstance) salesChartInstance.destroy();
    
    salesChartInstance = new Chart(ctxSales, {
        type: 'line',
        data: {
            labels: labelsDias,
            datasets: [{
                label: 'Faturamento Líquido (R$)',
                data: dadosVendas,
                borderColor: corPrimaria,
                backgroundColor: corFundoChart,
                borderWidth: 2,
                fill: true,
                tension: 0.4 
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0aec0' } },
                x: { grid: { display: false }, ticks: { color: '#a0aec0' } }
            }
        }
    });

    const ctxPayment = document.getElementById('paymentChart').getContext('2d');
    if (paymentChartInstance) paymentChartInstance.destroy();

    paymentChartInstance = new Chart(ctxPayment, {
        type: 'doughnut',
        data: {
            labels: ['PIX', 'Cartão', 'Boleto', 'Outros'],
            datasets: [{
                data: [metodosPagamento.pix, metodosPagamento.cartao, metodosPagamento.boleto, metodosPagamento.outros],
                backgroundColor: ['#68d391', '#63b3ed', '#f6e05e', '#a0aec0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#e2e8f0' } } },
            cutout: '70%'
        }
    });
}