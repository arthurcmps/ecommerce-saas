// js/register.js
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { maskDocument, maskCep, maskPhone } from "./masks.js";

const registerForm = document.getElementById('register-form');
const documentInput = document.getElementById('documentNumber');
const phoneInput = document.getElementById('phone');
const cepInput = document.getElementById('cep');
const errorMessage = document.getElementById('error-message');
const registerButton = document.getElementById('register-button');

documentInput.addEventListener('input', (e) => {
    e.target.value = maskDocument(e.target.value);
});

phoneInput.addEventListener('input', (e) => {
    e.target.value = maskPhone(e.target.value);
});

cepInput.addEventListener('input', async (e) => {
    const maskedCep = maskCep(e.target.value);
    e.target.value = maskedCep;

    if (maskedCep.length === 9) {
        const cleanCep = maskedCep.replace(/\D/g, '');
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            if (!response.ok) throw new Error('Falha ao consultar CEP');

            const data = await response.json();

            if (!data.erro) {
                document.getElementById('street').value = data.logradouro || '';
                document.getElementById('neighborhood').value = data.bairro || '';
                document.getElementById('city').value = data.localidade || '';
                document.getElementById('stateCode').value = data.uf || '';
                document.getElementById('number').focus();
                errorMessage.style.display = 'none';
            } else {
                errorMessage.innerText = 'CEP não encontrado.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Erro no ViaCEP:", error);
            errorMessage.innerText = 'Não foi possível consultar o CEP. Preencha o endereço manualmente.';
            errorMessage.style.display = 'block';
        }
    }
});

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

    const email = document.getElementById('email').value.trim();

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'stores', user.uid), {
            store_id: user.uid,
            name: document.getElementById('storeName').value.trim(),
            document: documentInput.value,
            phone: phoneInput.value,
            contact_email: email,
            created_at: serverTimestamp(),
            status: 'active',
            address: {
                cep: cepInput.value,
                street: document.getElementById('street').value,
                number: document.getElementById('number').value,
                complement: document.getElementById('complement').value,
                neighborhood: document.getElementById('neighborhood').value,
                city: document.getElementById('city').value,
                state: document.getElementById('stateCode').value
            },
            shipping_config: {
                origin_zip_code: cepInput.value,
                integrated_carriers: []
            },
            theme_config: {
                primary_color: "#1A202C",
                secondary_color: "#ED8936",
                home_layout: { vitrine_style: "grid" }
            }
        });

        window.location.href = "dashboard.html";
    } catch (error) {
        console.error("Erro no cadastro:", error);
        errorMessage.style.display = 'block';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage.innerText = 'Este e-mail já está em uso.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage.innerText = 'Informe um e-mail válido.';
        } else {
            errorMessage.innerText = 'Erro ao provisionar a loja. Tente novamente.';
        }
    } finally {
        registerButton.innerText = 'Criar minha loja';
        registerButton.disabled = false;
    }
});
