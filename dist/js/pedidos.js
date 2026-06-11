// js/pedidos.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { renderSidebar, updateSidebarData } from "./sidebar.js";

const dashboardContent = document.getElementById('dashboard-content');
const ordersList = document.getElementById('orders-list');
const searchInput = document.getElementById('search-orders'); // Captura da Busca

const modal = document.getElementById('order-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const statusSelect = document.getElementById('order-status-select');
const btnUpdateStatus = document.getElementById('btn-update-status');

let currentUserId = null;
let loadedOrders = {};
let viewingOrderId = null;

renderSidebar('pedidos');

btnCloseModal.addEventListener('click', () => modal.style.display = 'none');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        dashboardContent.style.display = 'flex';

        const storeDoc = await getDoc(doc(db, 'stores', user.uid));
        if (storeDoc.exists()) {
            updateSidebarData(storeDoc.data().name, user.uid);
        }
        loadOrders();
    } else {
        window.location.href = "index.html";
    }
});

async function loadOrders() {
    ordersList.innerHTML = '<p style="color: #a0aec0; text-align: center;">A procurar pedidos...</p>';
    loadedOrders = {}; 

    try {
        const ordersRef = collection(db, 'stores', currentUserId, 'orders');
        const q = query(ordersRef, orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);
        
        ordersList.innerHTML = ''; 

        if (snapshot.empty) {
            ordersList.innerHTML = '<p style="color: #a0aec0; text-align: center;">Ainda não existem pedidos registados.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const orderId = docSnap.id;
            loadedOrders[orderId] = order; 

            let dateStr = "A processar data...";
            if (order.created_at && typeof order.created_at.toDate === 'function') {
                dateStr = order.created_at.toDate().toLocaleString('pt-PT');
            }
            
            const itemsCount = order.items ? order.items.length : 0;
            const totalAmount = order.total_amount ? parseFloat(order.total_amount).toFixed(2) : "0.00";

            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `
                <div class="order-info">
                    <h3>${order.buyer_name || 'Cliente Desconhecido'}</h3>
                    <p>${dateStr} • ${itemsCount} item(ns) • R$ ${totalAmount}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span class="status-badge status-${order.status || 'novo'}">${order.status || 'Novo'}</span>
                    <button class="btn-view-order" onclick="openOrderDetails('${orderId}')">Ver Detalhes</button>
                </div>
            `;
            ordersList.appendChild(card);
        });

    } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
        ordersList.innerHTML = '<p style="color: #e53e3e; text-align: center;">Erro ao carregar o histórico de pedidos. Verifique a consola.</p>';
    }
}

window.openOrderDetails = (orderId) => {
    viewingOrderId = orderId;
    const order = loadedOrders[orderId];

    document.getElementById('modal-order-title').innerText = `Pedido de ${order.buyer_name || 'Desconhecido'}`;
    document.getElementById('detail-customer-name').innerText = order.buyer_name || 'Desconhecido';
    document.getElementById('detail-customer-phone').innerText = order.buyer_phone || 'Sem contato';
    
    // Morada de Entrega
    let addressText = 'Morada não informada';
    if (order.buyer_address) {
        if (typeof order.buyer_address === 'object') {
            const a = order.buyer_address;
            addressText = `${a.street || ''}, ${a.number || ''} ${a.complement ? '- ' + a.complement : ''}\nBairro: ${a.neighborhood || ''}\n${a.city || ''} / ${a.state || ''}\nCEP: ${a.cep || ''}`;
        } else {
            addressText = order.buyer_address;
        }
    }
    document.getElementById('detail-customer-address').innerText = addressText;

    // Campos de Pagamento
    document.getElementById('detail-payment-method').innerText = order.payment_method || 'Não especificado';
    document.getElementById('detail-payment-status').innerText = `Estado: ${order.payment_status || 'Pendente'}`;
    
    // Novos Campos de Frete
    const freightMethod = order.freight_method || 'A combinar / Padrão';
    const freightCost = parseFloat(order.freight_cost) || 0;
    
    document.getElementById('detail-freight-method').innerText = freightMethod;
    document.getElementById('detail-freight-cost').innerText = freightCost === 0 ? 'Grátis' : freightCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('detail-freight-total').innerText = freightCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Cálculo do Total e Subtotal
    const totalFinal = parseFloat(order.total_amount) || 0;
    const subtotal = totalFinal - freightCost;
    
    document.getElementById('detail-subtotal-price').innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('detail-total-price').innerText = totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    statusSelect.value = order.status || 'novo';

    // Lista de Itens
    const itemsList = document.getElementById('detail-items-list');
    itemsList.innerHTML = '';
    
    const items = order.items || [];
    if (items.length === 0) {
        itemsList.innerHTML = '<p style="color: #a0aec0;">Nenhum item registado neste pedido.</p>';
    } else {
        items.forEach(item => {
            const price = parseFloat(item.price) || 0;
            const qty = parseInt(item.quantity) || 1;
            itemsList.innerHTML += `
                <div class="detail-item" style="display: flex; justify-content: space-between; padding: 0.8rem; background-color: #2d3748; border-radius: 6px; margin-bottom: 0.5rem;">
                    <span style="color: #fff;">${qty}x ${item.name || 'Produto sem nome'}</span>
                    <span style="color: #a0aec0;">R$ ${(price * qty).toFixed(2)}</span>
                </div>
            `;
        });
    }

    modal.style.display = 'flex';
};

btnUpdateStatus.addEventListener('click', async () => {
    if (!viewingOrderId) return;
    
    const newStatus = statusSelect.value;
    const originalText = btnUpdateStatus.innerText;
    btnUpdateStatus.innerText = "A atualizar...";
    btnUpdateStatus.disabled = true;

    try {
        const orderRef = doc(db, 'stores', currentUserId, 'orders', viewingOrderId);
        await updateDoc(orderRef, {
            status: newStatus
        });

        alert("Estado do pedido atualizado com sucesso!");
        modal.style.display = 'none';
        loadOrders(); 

    } catch (error) {
        console.error("Erro ao atualizar estado:", error);
        alert("Ocorreu um erro ao atualizar o pedido.");
    } finally {
        btnUpdateStatus.innerText = originalText;
        btnUpdateStatus.disabled = false;
    }
});

// --- SISTEMA DE BUSCA EM TEMPO REAL ---
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const cards = ordersList.querySelectorAll('.order-card');
        let hasVisibleCards = false;
        
        cards.forEach(card => {
            const cardText = card.innerText.toLowerCase();
            if (cardText.includes(term)) {
                card.style.display = 'flex';
                hasVisibleCards = true;
            } else {
                card.style.display = 'none';
            }
        });

        // Feedback visual caso a busca não encontre nada
        let noResultsMsg = document.getElementById('no-results-msg');
        if (!hasVisibleCards && cards.length > 0) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('p');
                noResultsMsg.id = 'no-results-msg';
                noResultsMsg.style = "color: #a0aec0; text-align: center; grid-column: 1 / -1;";
                noResultsMsg.innerText = "Nenhum pedido encontrado com este termo.";
                ordersList.appendChild(noResultsMsg);
            } else {
                noResultsMsg.style.display = 'block';
            }
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    });
}