// js/relatorios.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { renderSidebar, updateSidebarData } from "./sidebar.js";

const dashboardContent = document.getElementById('dashboard-content');
const tableBody = document.getElementById('report-table-body');

let currentUserId = null;
let allOrders = [];

renderSidebar('relatorios');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        dashboardContent.style.display = 'flex';

        try {
            const storeDoc = await getDoc(doc(db, 'stores', user.uid));
            if (storeDoc.exists()) {
                updateSidebarData(storeDoc.data().name, user.uid);
                await fetchOrdersFromDB();
            }
        } catch (error) {
            console.error("Erro:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

async function fetchOrdersFromDB() {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">A processar dados do banco...</td></tr>';
    
    try {
        const q = query(collection(db, 'stores', currentUserId, 'orders'), orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);
        
        allOrders = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            // Adiciona um campo de data nativo do JS para facilitar os filtros
            if (data.created_at && typeof data.created_at.toDate === 'function') {
                data.jsDate = data.created_at.toDate();
            } else {
                data.jsDate = new Date(); 
            }
            allOrders.push(data);
        });

        applyFiltersAndRender();
    } catch (error) {
        console.error("Erro ao buscar relatórios:", error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #fc8181;">Erro ao carregar dados.</td></tr>';
    }
}

function applyFiltersAndRender() {
    const startDateVal = document.getElementById('filter-start').value;
    const endDateVal = document.getElementById('filter-end').value;
    const statusVal = document.getElementById('filter-status').value;

    let filteredOrders = allOrders;

    // Filtro de Datas
    if (startDateVal) {
        const start = new Date(startDateVal);
        start.setHours(0, 0, 0, 0);
        filteredOrders = filteredOrders.filter(o => o.jsDate >= start);
    }
    
    if (endDateVal) {
        const end = new Date(endDateVal);
        end.setHours(23, 59, 59, 999);
        filteredOrders = filteredOrders.filter(o => o.jsDate <= end);
    }

    // Filtro de Estado
    if (statusVal !== 'todos') {
        // Filtra comparando exatamente com o valor selecionado no dropdown.
        // O (o.status || 'novo') garante que pedidos muito antigos sem status não quebrem o código.
        filteredOrders = filteredOrders.filter(o => (o.status || 'novo') === statusVal);
    }

    renderTable(filteredOrders);
}

function renderTable(ordersData) {
    tableBody.innerHTML = '';
    
    let sumRevenue = 0;
    let sumFreight = 0;
    let sumTotal = 0;

    if (ordersData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum pedido encontrado nestas datas.</td></tr>';
    } else {
        ordersData.forEach(order => {
            const dateStr = order.jsDate.toLocaleDateString('pt-PT');
            const total = parseFloat(order.total_amount) || 0;
            const freight = parseFloat(order.freight_cost) || 0;
            const revenue = total - freight;

            // Só soma no resumo se não for cancelado
            if (order.status !== 'cancelado') {
                sumRevenue += revenue;
                sumFreight += freight;
                sumTotal += total;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${order.buyer_name || 'Desconhecido'}</td>
                <td style="text-transform: uppercase;">${order.payment_method || '-'}</td>
                <td>R$ ${revenue.toFixed(2).replace('.', ',')}</td>
                <td>R$ ${freight.toFixed(2).replace('.', ',')}</td>
                <td style="font-weight: bold; color: #68d391;">R$ ${total.toFixed(2).replace('.', ',')}</td>
                <td style="text-transform: capitalize;">${order.status || 'Novo'}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Atualiza o quadro de resumo
    document.getElementById('summary-revenue').innerText = sumRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('summary-freight').innerText = sumFreight.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('summary-total').innerText = sumTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Guarda os dados filtrados globalmente para a exportação CSV
    window.currentFilteredData = ordersData;
}

// Botão Aplicar Filtros
document.getElementById('btn-apply-filters').addEventListener('click', applyFiltersAndRender);

// Botão Imprimir / PDF (Usa a função nativa do navegador que respeita o @media print)
document.getElementById('btn-print-pdf').addEventListener('click', () => {
    window.print();
});

// Botão Exportar Excel (CSV)
document.getElementById('btn-export-csv').addEventListener('click', () => {
    const data = window.currentFilteredData || [];
    if (data.length === 0) {
        alert("Não há dados para exportar.");
        return;
    }

    // Cria o cabeçalho do CSV
    let csvContent = "Data;Cliente;Telefone;Metodo Pagamento;Receita Produtos;Custo Frete;Total;Status\n";

    data.forEach(order => {
        const dateStr = order.jsDate.toLocaleDateString('pt-PT');
        const total = parseFloat(order.total_amount) || 0;
        const freight = parseFloat(order.freight_cost) || 0;
        const revenue = total - freight;

        // Limpa nomes que possam ter ponto e vírgula e quebrar o CSV
        const safeName = (order.buyer_name || '').replace(/;/g, ',');
        const safePhone = order.buyer_phone || '';

        csvContent += `${dateStr};${safeName};${safePhone};${order.payment_method};${revenue.toFixed(2)};${freight.toFixed(2)};${total.toFixed(2)};${order.status}\n`;
    });

    // Cria o ficheiro virtual na memória
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF força o Excel a ler os acentos corretos em UTF-8
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_vendas_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});