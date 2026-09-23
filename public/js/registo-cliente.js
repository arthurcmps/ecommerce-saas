// js/registo-cliente.js
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { maskPhone, maskCep } from "./masks.js";

const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get('id');
const linkLogin = document.getElementById('link-login');

function getReturnUrl() {
    return storeId ? `loja.html?id=${encodeURIComponent(storeId)}` : 'catalogo.html';
}

if (storeId) {
    linkLogin.href = `login-cliente.html?id=${encodeURIComponent(storeId)}`;
}

const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', (e) => {
    e.target.value = maskPhone(e.target.value);
});

const cepInput = document.getElementById('cep');
cepInput.addEventListener('input', async (e) => {
    const value = maskCep(e.target.value);
    e.target.value = value;

    if (value.length === 9) {
        const cepClean = value.replace(/\D/g, '');
        try {
            document.getElementById('address').value = "Buscando...";
            document.getElementById('neighborhood').value = "...";
            document.getElementById('city').value = "...";
            document.getElementById('state').value = "...";

            const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
            if (!response.ok) throw new Error('Falha ao consultar CEP');
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('address').value = data.logradouro || '';
                document.getElementById('neighborhood').value = data.bairro || '';
                document.getElementById('city').value = data.localidade || '';
                document.getElementById('state').value = data.uf || '';
                document.getElementById('number').focus();
            } else {
                alert("CEP não encontrado. Verifique o número informado.");
                limparCamposEndereco();
            }
        } catch (error) {
            console.error("Erro na API do CEP:", error);
            alert("Não foi possível consultar o CEP. Preencha manualmente.");
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

document.getElementById('register-client-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    const btn = document.getElementById('register-button');
    const errorMsg = document.getElementById('error-message');

    if (password !== confirmPassword) {
        errorMsg.innerText = "As senhas não coincidem.";
        errorMsg.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorMsg.innerText = "A senha deve ter pelo menos 6 caracteres.";
        errorMsg.style.display = 'block';
        return;
    }

    btn.innerText = "Criando conta...";
    btn.disabled = true;
    errorMsg.style.display = 'none';
    errorMsg.innerText = '';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'customers', user.uid), {
            name,
            phone,
            email,
            role: 'customer',
            preferred_store_id: storeId || null,
            address: {
                cep: document.getElementById('cep').value,
                street: document.getElementById('address').value,
                number: document.getElementById('number').value,
                complement: document.getElementById('complement').value,
                neighborhood: document.getElementById('neighborhood').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value
            },
            created_at: serverTimestamp()
        });

        window.location.href = getReturnUrl();
    } catch (error) {
        console.error("Erro no cadastro do cliente:", error);
        errorMsg.innerText = error.code === 'auth/email-already-in-use'
            ? "Este e-mail já está em uso."
            : "Não foi possível criar a conta. Tente novamente.";
        errorMsg.style.display = 'block';
    } finally {
        btn.innerText = "Criar Conta e Salvar Endereço";
        btn.disabled = false;
    }
});
