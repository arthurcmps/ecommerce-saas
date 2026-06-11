// js/login.js
import './aws-config.js'; // Apenas importa para inicializar a AWS
import { signIn } from 'aws-amplify/auth'; // Função de login da AWS

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    
    errorMessage.style.display = 'none';
    errorMessage.innerText = '';
    loginButton.innerText = 'Autenticando...';
    loginButton.disabled = true;

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        // Função signIn da AWS Amplify
        const { isSignedIn, nextStep } = await signIn({
            username: email,
            password: password
        });
        
        if (isSignedIn) {
            console.log("Logado com sucesso!");
            window.location.href = "dashboard.html";
        }
        
    } catch (error) {
        console.error("Erro no login:", error);
        errorMessage.style.display = 'block';
        
        // O Amplify retorna erros específicos que podemos tratar
        if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
            errorMessage.innerText = 'E-mail ou senha incorretos.';
        } else {
            errorMessage.innerText = 'Erro ao tentar fazer login. Tente novamente.';
        }
    } finally {
        loginButton.innerText = 'Entrar';
        loginButton.disabled = false;
    }
});