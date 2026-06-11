import{t as e}from"./firebase-config-B42Cxf1x.js";import{signOut as t}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";function n(n){let r=document.getElementById(`sidebar-container`);r&&(r.innerHTML=`
        <aside class="sidebar">
            <div class="sidebar-header">
                <h2 id="store-name-display">A carregar...</h2>
            </div>
            <nav class="sidebar-nav">
                <a href="dashboard.html" class="${n===`dashboard`?`active`:``}">Visão Geral</a>
                <a href="relatorios.html" class="${n===`relatorios`?`active`:``}">Relatórios</a>
                <a href="produtos.html" class="${n===`produtos`?`active`:``}">Gerir Produtos</a>
                <a href="pedidos.html" class="${n===`pedidos`?`active`:``}">Pedidos</a>
                <a href="design.html" class="${n===`design`?`active`:``}">Personalizar Design</a>
                
                <a href="#" id="link-my-store" target="_blank" style="margin-top: 2rem; color: #fff; background-color: rgba(255,255,255,0.1);">👁️ Ver Minha Loja</a>
            </nav>
            <div class="sidebar-footer">
                <button id="logout-button">Terminar Sessão</button>
            </div>
        </aside>
    `,document.getElementById(`logout-button`).addEventListener(`click`,async()=>{try{await t(e)}catch(e){console.error(`Erro ao terminar sessão:`,e)}}))}function r(e,t){let n=document.getElementById(`store-name-display`),r=document.getElementById(`link-my-store`);n&&(n.innerText=e),r&&t&&(r.href=`loja.html?id=${t}`)}export{r as n,n as t};