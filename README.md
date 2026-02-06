# Layout Aria CSS (Fullstack Edition)

> **Autor:** Matheus Siqueira  
> **Website:** [https://www.matheussiqueira.dev/](https://www.matheussiqueira.dev/)

**Layout Aria CSS** é um sistema completo e profissional para arquitetura visual e desenvolvimento ágil com Flexbox. Este projeto demonstra uma aplicação **Fullstack Sênior**, combinando uma interface moderna e responsiva (Vanilla JS Modular) com uma API robusta e segura (Node.js/Express).

---

## 🏗️ Arquitetura e Visão Técnica

O projeto foi construído seguindo os princípios de **Clean Architecture** e **Modularidade**, separando claramente responsabilidades para garantir escalabilidade e manutenibilidade.

### 1. Frontend (SPA Leve)
- **Tecnologia:** Vanilla JS com Estrutura Modular (ES Modules).
- **Design Pattern:** State-Driven UI (O estado dita a interface).
- **Persistência:** Deep Linking (Estado na URL) e API Rest.
- **Componentes:** Modais, Toasts e Controles reutilizáveis.
- **Estilização:** CSS Variables (Design Tokens) com tema Dark/Light nativo.

### 2. Backend (API REST)
- **Stack:** Node.js + Express.
- **Estrutura:** Dividida em Módulos (`auth`, `layouts`, `admin`).
- **Segurança:**
  - Login/Registro com JWT (Access e Refresh Tokens).
  - Sanitização de inputs e proteção contra XSS/Injection.
  - Rate Limiting para evitar abuso.
  - CORS configurado para segurança.
- **Dados:** Persistência em arquivo JSON com controle de concorrência e atomicidade (simulando NoSQL para portabilidade).

---

## 🚀 Funcionalidades

### Para o Desenvolvedor (Usuário)
- **Studio Flexbox:** Visualização em tempo real de propriedades display, align, justify, gap, etc.
- **Exportação de Código:** Gera HTML e CSS prontos para produção.
- **Cloud Save:** Salve seus layouts na nuvem (requer login).
- **Compartilhamento:** Gere links únicos que carregam o estado exato do seu layout.
- **Presets de Mercado:** Configurações rápidas para Hero, Sidebar e Grids.

### Para o Administrador
- **Logs de Auditoria:** Rastreio de ações de usuários.
- **Gestão de Sessões:** Controle de dispositivos conectados.

---

## 🛠️ Instalação e Execução

### Pré-requisitos
- Node.js (v18 ou superior)

### 1. Configurar e Rodar o Backend
```bash
cd backend
npm install
npm start
```
*O servidor iniciará na porta `4000` (padrão).*

### 2. Rodar o Frontend
Como o Frontend utiliza ES Modules, ele precisa ser servido por um servidor HTTP (não funciona abrindo direto o arquivo).

Você pode usar o **Live Server** do VS Code ou instanciar um servidor simples:
```bash
# Na raiz do projeto
npx serve .
```
Acesse `http://localhost:3000` (ou a porta indicada).

---

## 🧠 Decisões de Design (UX/UI)

1.  **Imersão:** A interface ocupa 100% da tela para maximizar a área de canvas.
2.  **Feedback Imediato:** Todas as alterações refletem instantaneamente. Toasts informam sucesso/erro sem bloquear o fluxo.
3.  **Acessibilidade:**
    - Foco visível em todos os controles.
    - Contraste adequado (WCAG AA/AAA).
    - HTML Semântico.
4.  **Consistência:** Um Design System enxuto (Tokens de cor, espaçamento e tipografia) garante harmonia visual.

---

## 🔮 Roadmap e Melhorias
- [ ] Implementação de CSS Grid Studio.
- [ ] Galeria pública de layouts da comunidade.
- [ ] Testes E2E com Cypress.
- [ ] Backend com Banco Relacional (PostgreSQL) via Docker.

---

**Desenvolvido com excelência por Matheus Siqueira.**
