# Ecommerce SaaS

MVP de uma plataforma de e-commerce multi-loja construída com HTML, CSS, JavaScript e Firebase.

## Estado atual

O projeto já possui:

- cadastro e autenticação de lojistas;
- dashboard com métricas de vendas;
- cadastro, edição e exclusão de produtos;
- upload de imagens pelo Firebase Storage;
- gestão e atualização de pedidos;
- personalização visual da loja;
- catálogo geral com produtos de várias lojas;
- página pública individual de cada loja;
- cadastro e login de clientes;
- carrinho persistido no `localStorage`;
- checkout MVP com endereço via ViaCEP;
- simulação de frete PAC/SEDEX;
- relatórios e gráficos.

## Tecnologias

- HTML5
- CSS3
- JavaScript ES Modules
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Hosting
- Chart.js
- ViaCEP

## Estrutura

```text
.
├── .firebaserc
├── firebase.json
├── README.md
└── public/
    ├── index.html
    ├── register.html
    ├── dashboard.html
    ├── produtos.html
    ├── pedidos.html
    ├── relatorios.html
    ├── design.html
    ├── catalogo.html
    ├── loja.html
    ├── login-cliente.html
    ├── registo-cliente.html
    ├── css/
    └── js/
```

## Firebase

O projeto está associado ao Firebase project:

```text
ecommerce-saas-f1982
```

A configuração web fica em:

```text
public/js/firebase-config.js
```

A chave `apiKey` de um app web Firebase não deve ser tratada como uma senha. A segurança do projeto depende principalmente das regras do Firestore/Storage e da validação das operações sensíveis.

### Serviços necessários

No Firebase Console, confirme que estão habilitados:

1. **Authentication** → método Email/Senha;
2. **Firestore Database**;
3. **Storage**;
4. **Hosting**.

## Como executar localmente

Como o projeto usa ES Modules, não abra os arquivos HTML diretamente com `file://`.

### Opção 1 — Firebase CLI

Instale a CLI:

```bash
npm install -g firebase-tools
```

Autentique:

```bash
firebase login
```

Na raiz do projeto:

```bash
firebase emulators:start --only hosting
```

Se preferir apenas um servidor estático, use uma das opções abaixo.

### Opção 2 — Python

```bash
cd public
python -m http.server 5500
```

Abra:

```text
http://localhost:5500
```

### Opção 3 — VS Code

Use a extensão **Live Server** e abra `public/index.html`.

## Como testar o fluxo principal

### 1. Criar uma loja

Abra `index.html` e clique em **Cadastre-se**.

Cadastre uma nova loja. Após o cadastro, o usuário permanece autenticado e segue diretamente para o dashboard.

### 2. Cadastrar produtos

No painel, abra **Produtos** e cadastre pelo menos um produto com:

- nome;
- preço;
- estoque;
- descrição;
- dimensões de envio;
- imagem opcional.

### 3. Abrir a loja pública

No painel, use o link público da loja ou acesse:

```text
loja.html?id=ID_DA_LOJA
```

O ID da loja é o UID do lojista no Firebase Authentication e também o documento correspondente em `stores/{uid}`.

### 4. Criar uma conta de cliente

Na loja pública, abra **Entrar** e depois **Criar conta**.

Quando o cadastro ou login tiver começado dentro de uma loja, o sistema preserva o `id` da loja e retorna o cliente para ela ao finalizar a autenticação.

### 5. Carrinho e checkout

Adicione produtos ao carrinho, informe endereço, selecione o frete simulado e finalize o pedido.

O pedido deve aparecer no painel do lojista em **Pedidos**.

### 6. Dashboard e relatórios

Com pedidos cadastrados, valide:

- faturamento total;
- faturamento do mês;
- ticket médio;
- pedidos pendentes;
- produtos mais vendidos;
- clientes com maior faturamento;
- gráficos.

## Deploy no Firebase Hosting

Na raiz do projeto:

```bash
firebase deploy --only hosting
```

O arquivo `firebase.json` já aponta o diretório público para `public/`.

## Correções aplicadas na recuperação

- correção do logout do catálogo para a API modular do Firebase;
- preservação do ID da loja durante login do cliente;
- preservação do ID da loja durante cadastro do cliente;
- retorno do cliente à loja correta após autenticação;
- redirecionamento do novo lojista diretamente ao dashboard;
- tratamento melhor de falhas do ViaCEP;
- filtro de lojas inativas e produtos sem estoque no catálogo;
- configuração inicial do Firebase Hosting;
- documentação de instalação, testes e deploy.

## Limitações conhecidas do MVP

O projeto ainda **não deve ser considerado pronto para produção**.

As principais pendências são:

1. **Checkout seguro no backend** — criação do pedido, validação de preço e baixa de estoque ainda acontecem no navegador. O ideal é mover essa lógica para Cloud Functions ou outro backend confiável.
2. **Gateway de pagamento real** — PIX, cartão e boleto ainda não estão integrados a um provedor de pagamentos.
3. **Frete real** — PAC e SEDEX usam valores simulados. É necessária integração com Correios, Melhor Envio ou outro serviço.
4. **Regras de segurança** — as regras atuais do Firestore e Storage precisam ser auditadas antes de uso real.
5. **Concorrência de estoque** — a baixa precisa ser transacional no backend para impedir overselling.
6. **Validação e sanitização** — conteúdo salvo pelo usuário ainda precisa de tratamento mais rigoroso antes de ser exibido com HTML dinâmico.
7. **Testes automatizados** — o projeto ainda não possui suíte de testes.
8. **CI/CD** — ainda não existe pipeline de validação e deploy automático.

## Próxima etapa recomendada

A próxima evolução deve ser transformar o checkout em uma operação confiável de servidor:

```text
cliente
  ↓
Cloud Function / API
  ├─ valida usuário
  ├─ lê preços reais do Firestore
  ├─ confirma estoque
  ├─ calcula total
  ├─ cria pedido
  └─ baixa estoque em transação
```

Depois disso, a integração de pagamento pode ser adicionada sem confiar em valores enviados pelo navegador.

## Evidências visuais no portfólio

O estudo de caso fica no [repositório do portfólio](https://github.com/arthurcmps/portfolio), em `projetos/ecommerce.html`. A seção **Explore o projeto** possui um carrossel com quatro espaços para capturas reais:

1. Vitrine da loja (`loja.html?id=ID_DA_LOJA`).
2. Carrinho de compras, com produtos de demonstração.
3. Gestão de pedidos (`pedidos.html`).
4. Relatórios e indicadores (`relatorios.html`).

Execute o projeto seguindo **Como executar localmente** e use o roteiro **Como testar o fluxo principal** acima para preparar essas telas. Use dados fictícios nas capturas, sem informações de clientes reais.

Salve as imagens no repositório **portfolio**, na pasta `assets/images/projects/ecommerce/`, como `01.webp` a `04.webp`. Ative os blocos de imagem e ajuste os textos alternativos e as legendas conforme o [GUIA_MIDIAS.md](https://github.com/arthurcmps/portfolio/blob/master/GUIA_MIDIAS.md). As capturas são publicadas pelo portfólio; não é necessário duplicá-las nos arquivos da loja.
