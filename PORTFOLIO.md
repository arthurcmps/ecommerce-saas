# Ecommerce SaaS — Guia de apresentação no portfólio

Este projeto é um MVP demonstrativo de uma plataforma de e-commerce multi-loja.

## O que ele demonstra

- autenticação de lojistas e clientes com Firebase Authentication;
- modelagem multi-loja no Cloud Firestore;
- CRUD de produtos;
- upload de imagens no Firebase Storage;
- dashboard com métricas e gráficos;
- gerenciamento de pedidos;
- catálogo agregado de várias lojas;
- vitrine pública por lojista;
- carrinho persistido no navegador;
- checkout demonstrativo;
- consulta de CEP via ViaCEP;
- personalização de tema da loja;
- regras de segurança versionadas;
- deploy via Firebase Hosting;
- validação automática via GitHub Actions.

## Escopo proposital

Este repositório foi desenvolvido como projeto de portfólio e não como produto comercial pronto para receber pagamentos reais.

Por isso:

- pagamento é simulado;
- frete é simulado;
- o checkout permanece client-side para demonstração do fluxo;
- não há integração com gateway financeiro;
- não há integração real com transportadora.

Essas limitações são decisões de escopo, não recursos apresentados como concluídos.

## Fluxo recomendado para demonstração

1. Criar uma conta de lojista.
2. Acessar o dashboard.
3. Cadastrar produtos e enviar uma imagem.
4. Personalizar a aparência da loja.
5. Abrir a vitrine pública.
6. Criar uma conta de cliente.
7. Adicionar itens ao carrinho.
8. Informar um CEP e selecionar o frete simulado.
9. Finalizar o pedido demonstrativo.
10. Voltar ao painel do lojista e visualizar o pedido, dashboard e relatórios.

## Pontos técnicos para destacar em entrevista

### Estrutura multi-tenant

Cada lojista possui um documento em `stores/{storeId}`. Produtos e pedidos ficam em subcoleções da loja, evitando misturar diretamente os dados administrativos de lojistas diferentes.

### Autenticação

O Firebase Authentication é utilizado tanto para lojistas quanto para clientes. A aplicação direciona cada fluxo para as telas apropriadas.

### Segurança

As regras do Firestore e Storage fazem parte do repositório. O objetivo é demonstrar princípio de menor privilégio dentro dos limites deste MVP.

### Experiência do usuário

O projeto inclui preenchimento de endereço via ViaCEP, carrinho persistente, estados vazios, dashboard visual e layout responsivo.

### Qualidade

O GitHub Actions verifica a sintaxe dos JavaScripts e referências locais de arquivos utilizados pelos HTMLs.

## O que seria diferente em produção

Em uma versão comercial, a criação do pedido, validação dos preços e baixa de estoque seriam executadas em backend confiável, usando transação. Pagamentos seriam confirmados por webhook de um gateway e o frete seria calculado por um serviço real.

Essa evolução foi deliberadamente deixada fora do escopo porque o objetivo deste repositório é demonstrar arquitetura, integração com Firebase, interface e domínio de e-commerce em um projeto de portfólio.
