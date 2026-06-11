import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        dashboard: 'public/dashboard.html',
        catalogo: 'public/catalogo.html',
        design: 'public/design.html',
        loja: 'public/loja.html',
        loginCliente: 'public/login-cliente.html',
        pedidos: 'public/pedidos.html',
        produtos: 'public/produtos.html',
        register: 'public/register.html',
        registoCliente: 'public/registo-cliente.html',
        relatorios: 'public/relatorios.html'
      }
    }
  }
});