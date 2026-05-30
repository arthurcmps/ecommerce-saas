// js/dashboard.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { renderSidebar, updateSidebarData } from "./sidebar.js";

const dashboardContent = document.getElementById('dashboard-content');
const userEmailDisplay = document.getElementById('user-email');

// Capturar os elementos onde os números vão aparecer
const metricSales = document.querySelectorAll('.metric-value')[0];
const metricOrders = document.querySelectorAll('.metric-value')[1];
const metricProducts = document.querySelectorAll('.metric-value')[2];

renderSidebar('dashboard');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        dashboardContent.style.display = 'flex';
        userEmailDisplay.innerText = user.email;

        try {
            const storeDocRef = doc(db, 'stores', user.uid);
            const storeDoc = await getDoc(storeDocRef);

            if (storeDoc.exists()) {
                const storeData = storeDoc.data();
                updateSidebarData(storeData.name, user.uid);
                
                // Dispara o cálculo das estatísticas assim que a loja é encontrada!
                await loadMetrics(user.uid);
            } else {
                updateSidebarData("Loja não encontrada", null);
            }
        } catch (error) {
            console.error("Erro ao consultar a loja:", error);
            updateSidebarData("Erro ao carregar", null);
        }
    } else {
        window.location.href = "index.html";
    }
});

async function loadMetrics(userId) {
    try {
        // 1. Contar Produtos Ativos
        const productsRef = collection(db, 'stores', userId, 'products');
        const productsSnap = await getDocs(productsRef);
        let activeProductsCount = 0;
        
        productsSnap.forEach(doc => {
            if(doc.data().is_active !== false) activeProductsCount++;
        });
        metricProducts.innerText = activeProductsCount;

        // 2. Calcular Pedidos Pendentes e Vendas de Hoje
        const ordersRef = collection(db, 'stores', userId, 'orders');
        const ordersSnap = await getDocs(ordersRef);

        let pendingOrdersCount = 0;
        let todaySales = 0;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        ordersSnap.forEach(doc => {
            const order = doc.data();

            if (order.status === 'novo' || order.status === 'processamento') {
                pendingOrdersCount++;
            }

            // Proteção extra para garantir que a data existe e é válida
            if (order.status !== 'cancelado' && order.created_at && typeof order.created_at.toDate === 'function') {
                const orderDate = order.created_at.toDate();
                
                if (orderDate >= startOfToday) {
                    todaySales += parseFloat(order.total_amount) || 0;
                }
            }
        });

        metricOrders.innerText = pendingOrdersCount;
        metricSales.innerText = todaySales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    } catch (error) {
        console.error("Erro ao carregar as métricas:", error);
        metricSales.innerText = "Erro";
        metricOrders.innerText = "Erro";
        metricProducts.innerText = "Erro";
    }
}