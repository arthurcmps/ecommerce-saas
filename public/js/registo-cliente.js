// js/registo-cliente.js
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// IMPORTAÇÃO DAS MÁSCARAS
import { maskPhone, maskCep } from "./masks.js";

const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get('id');

const linkLogin = document.getElementById('link-login');

if (storeId) {
    linkLogin.href = `login-cliente.html?id=${storeId}`;
}

// APLICAÇÃO DA MÁSCARA DO TELEMÓVEL
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', (e) => {
    e.target.value = maskPhone(e.target.value);
});

// APLICAÇÃO DA MÁSCARA E CONSUMO DA API DO CEP
const cepInput = document.getElementById('cep');
cepInput.addEventListener('input', async (e) => {
    // Aplica a máscara primeiro
    let value = maskCep(e.target.value);
    e.target.value = value;
    
    // Se o CEP estiver completo (9 caracteres contando com o traço)
    if (value.length === 9) {
        const cepClean = value.replace(/\D/g, ''); // Remove o traço para enviar à API
        
        try {
            // Feedback visual enquanto a API responde
            document.getElementById('address').value = "A procurar...";
            document.getElementById('neighborhood').value = "...";
            document.getElementById('city').value = "...";
            document.getElementById('state').value = "...";
            
            // Faz a chamada à API do ViaCEP
            const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
            const data = await response.json();
            
            if (!data.erro) {
                // Preenche os campos automaticamente
                document.getElementById('address').value = data.logradouro || '';
                document.getElementById('neighborhood').value = data.bairro || '';
                document.getElementById('city').value = data.localidade || '';
                document.getElementById('state').value = data.uf || '';
                
                // Coloca o cursor no campo "Número" para o cliente não perder tempo
                document.getElementById('number').focus();
            } else {
                alert("CEP não encontrado. Por favor, verifique o número inserido.");
                limparCamposEndereco();
            }
        } catch (error) {
            console.error("Erro na API do CEP:", error);
            alert("Erro ao consultar o CEP. Por favor, preencha manualmente.");
            limparCamposEndereco();
        }
    }
});

function limparCamposEndereco() {
    document.getElementById('address').value = "";
    document.getElementById('neighborhood').value = "";
    document.getElementById('city').value = "";
    document.getElementById('state').value = "";
}

// LÓGICA DE REGISTO (MANTIDA IGUAL)
document.getElementById('register-client-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    
    const cep = document.getElementById('cep').value;
    const address = document.getElementById('address').value;
    const number = document.getElementById('number').value;
    const complement = document.getElementById('complement').value;
    const neighborhood = document.getElementById('neighborhood').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    const btn = document.getElementById('register-button');
    const errorMsg = document.getElementById('error-message');

    if (password !== confirmPassword) {
        errorMsg.innerText = "As palavras-passe não coincidem.";
        errorMsg.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorMsg.innerText = "A palavra-passe deve ter pelo menos 6 caracteres.";
        errorMsg.style.display = 'block';
        return;
    }

    btn.innerText = "A criar conta e a guardar endereço...";
    btn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'customers', user.uid), {
            name: name,
            phone: phone,
            email: email,
            role: 'customer', 
            address: {
                cep: cep,
                street: address,
                number: number,
                complement: complement,
                neighborhood: neighborhood,
                city: city,
                state: state
            },
            created_at: serverTimestamp()
        });

        window.location.href = 'catalogo.html';
        
    } catch (error) {
        console.error("Erro no registo:", error);
        errorMsg.innerText = "Erro ao criar conta. O e-mail pode já estar em uso.";
        errorMsg.style.display = 'block';
        btn.innerText = "Criar Conta e Salvar Endereço";
        btn.disabled = false;
    }
});