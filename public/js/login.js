import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Impede a página de recarregar
    
    // Reseta mensagens
    errorMessage.style.display = 'none';
    errorMessage.innerText = '';
    loginButton.innerText = 'Autenticando...';
    loginButton.disabled = true;

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log("Logado com sucesso! ID:", user.uid);
        
        // Redireciona para o painel (vamos criar depois)
        window.location.href = "dashboard.html";
        
    } catch (error) {
        console.error("Erro no login:", error);
        errorMessage.style.display = 'block';
        
        if (error.code === 'auth/invalid-credential') {
            errorMessage.innerText = 'E-mail ou senha incorretos.';
        } else {
            errorMessage.innerText = 'Erro ao tentar fazer login.';
        }
    } finally {
        loginButton.innerText = 'Entrar';
        loginButton.disabled = false;
    }
});