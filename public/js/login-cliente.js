import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get('id');

const linkRegister = document.getElementById('link-register');
const linkBackStore = document.getElementById('link-back-store');
const form = document.getElementById('login-client-form');
const btn = document.getElementById('login-button');
const errorMsg = document.getElementById('error-message');

function getReturnUrl() {
    return storeId ? `loja.html?id=${encodeURIComponent(storeId)}` : 'catalogo.html';
}

if (storeId) {
    linkRegister.href = `registo-cliente.html?id=${encodeURIComponent(storeId)}`;
    linkBackStore.href = getReturnUrl();
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    btn.innerText = "Entrando...";
    btn.disabled = true;
    errorMsg.style.display = 'none';
    errorMsg.innerText = '';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = getReturnUrl();
    } catch (error) {
        console.error("Erro no login do cliente:", error);
        errorMsg.innerText = error.code === 'auth/invalid-credential'
            ? "E-mail ou senha incorretos."
            : "Não foi possível entrar agora. Tente novamente.";
        errorMsg.style.display = 'block';
    } finally {
        btn.innerText = "Entrar na minha conta";
        btn.disabled = false;
    }
});
