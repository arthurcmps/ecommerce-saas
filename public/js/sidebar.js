// js/sidebar.js
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

export function renderSidebar(activePage) {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    container.innerHTML = `
        <aside class="sidebar">
            <div class="sidebar-header">
                <h2 id="store-name-display">A carregar...</h2>
            </div>
            <nav class="sidebar-nav">
                <a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Visão Geral</a>
                <a href="relatorios.html" class="${activePage === 'relatorios' ? 'active' : ''}">Relatórios</a>
                <a href="produtos.html" class="${activePage === 'produtos' ? 'active' : ''}">Gerir Produtos</a>
                <a href="pedidos.html" class="${activePage === 'pedidos' ? 'active' : ''}">Pedidos</a>
                <a href="design.html" class="${activePage === 'design' ? 'active' : ''}">Personalizar Design</a>
                
                <a href="#" id="link-my-store" target="_blank" style="margin-top: 2rem; color: #fff; background-color: rgba(255,255,255,0.1);">👁️ Ver Minha Loja</a>
            </nav>
            <div class="sidebar-footer">
                <button id="logout-button">Terminar Sessão</button>
            </div>
        </aside>
    `;

    document.getElementById('logout-button').addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Erro ao terminar sessão:", error);
        }
    });
}

export function updateSidebarData(storeName, userId) {
    const storeNameDisplay = document.getElementById('store-name-display');
    const linkMyStore = document.getElementById('link-my-store');

    if (storeNameDisplay) storeNameDisplay.innerText = storeName;
    if (linkMyStore && userId) linkMyStore.href = `loja.html?id=${userId}`;
}