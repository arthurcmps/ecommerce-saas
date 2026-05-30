import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Captura o ID da loja na hiperligação (URL)
const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get('id');

const linkRegister = document.getElementById('link-register');
const linkBackStore = document.getElementById('link-back-store');

// Repassa o ID da loja para as hiperligações não se perderem
if (storeId) {
    linkRegister.href = `registo-cliente.html?id=${storeId}`;
    linkBackStore.href = `loja.html?id=${storeId}`;
}

document.getElementById('login-client-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-button');
    const errorMsg = document.getElementById('error-message');

    btn.innerText = "A entrar...";
    btn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Se o login for bem-sucedido, redireciona de volta para a loja correta
        window.location.href = 'catalogo.html';
    } catch (error) {
        console.error("Erro no login:", error);
        errorMsg.innerText = "E-mail ou senha incorretos.";
        errorMsg.style.display = 'block';
        btn.innerText = "Entrar na minha conta";
        btn.disabled = false;
    }
});