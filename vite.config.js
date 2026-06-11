import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        dashboard: 'dashboard.html',
        catalogo: 'catalogo.html',
        design: 'design.html',
        loja: 'loja.html',
        loginCliente: 'login-cliente.html',
        pedidos: 'pedidos.html',
        produtos: 'produtos.html',
        register: 'register.html',
        registoCliente: 'registo-cliente.html',
        relatorios: 'relatorios.html'
      }
    }
  }
});