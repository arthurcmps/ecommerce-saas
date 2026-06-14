// js/register.js
import './aws-config.js';
import { signUp } from 'aws-amplify/auth';
import { maskDocument, maskCep, maskPhone } from "./masks.js";

// Capturando os elementos da tela
const registerForm = document.getElementById('register-form');
const documentInput = document.getElementById('documentNumber');
const phoneInput = document.getElementById('phone');
const cepInput = document.getElementById('cep');
const errorMessage = document.getElementById('error-message');
const registerButton = document.getElementById('register-button');

// Aplicando as máscaras em tempo real enquanto o usuário digita
documentInput.addEventListener('input', (e) => {
    e.target.value = maskDocument(e.target.value);
});

phoneInput.addEventListener('input', (e) => {
    e.target.value = maskPhone(e.target.value);
});

// Lógica do ViaCEP
cepInput.addEventListener('input', async (e) => {
    const maskedCep = maskCep(e.target.value);
    e.target.value = maskedCep;

    if (maskedCep.length === 9) {
        const cleanCep = maskedCep.replace(/\D/g, '');
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('street').value = data.logradouro;
                document.getElementById('neighborhood').value = data.bairro;
                document.getElementById('city').value = data.localidade;
                document.getElementById('stateCode').value = data.uf;
                document.getElementById('number').focus(); 
                errorMessage.style.display = 'none';
            } else {
                errorMessage.innerText = 'CEP não encontrado.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Erro no ViaCEP:", error);
        }
    }
});

// Lógica de Cadastro no AWS Cognito
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        errorMessage.innerText = 'As senhas não coincidem.';
        errorMessage.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorMessage.innerText = 'A senha deve ter pelo menos 6 caracteres.';
        errorMessage.style.display = 'block';
        return;
    }

    errorMessage.style.display = 'none';
    registerButton.innerText = 'Configurando loja...';
    registerButton.disabled = true;

    const email = document.getElementById('email').value;

    try {
        // 1. Cria o usuário no AWS Cognito
        const { isSignUpComplete, userId, nextStep } = await signUp({
            username: email,
            password: password,
            options: {
                userAttributes: {
                    email: email
                }
            }
        });

        console.log("Loja provisionada com sucesso no Cognito! ID:", userId);
        
        /* O salvamento no Banco de Dados (DynamoDB) com CNPJ, endereço e cores
           será ativado aqui na próxima etapa, assim que criarmos a tabela 'Store' */

        // Redireciona de volta para a tela de login
        window.location.href = "index.html";

    } catch (error) {
        console.error("Erro no cadastro:", error);
        errorMessage.style.display = 'block';
        
        if (error.name === 'UsernameExistsException') {
            errorMessage.innerText = 'Este e-mail já está em uso.';
        } else if (error.name === 'InvalidPasswordException') {
            errorMessage.innerText = 'A senha não atende aos requisitos mínimos.';
        } else {
            errorMessage.innerText = 'Erro ao provisionar a loja. Tente novamente.';
        }
    } finally {
        registerButton.innerText = 'Criar minha loja';
        registerButton.disabled = false;
    }
});