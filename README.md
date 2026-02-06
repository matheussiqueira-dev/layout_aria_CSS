# Layout Aria CSS (FlexStudio)

> **Autor:** Matheus Siqueira  
> **Website:** [https://www.matheussiqueira.dev/](https://www.matheussiqueira.dev/)

**Layout Aria CSS** é um estúdio de desenvolvimento visual profissional para layouts Flexbox. Projetado para desenvolvedores e designers que buscam precisão, acessibilidade e código limpo, a plataforma oferece um ambiente interativo para prototipagem rápida e exportação de código pronto para produção.

---

## 🚀 Funcionalidades Principais

### Interface e Design
- **Dashboard Profissional:** Layout moderno com tema escuro/claro, focado na experiência do desenvolvedor.
- **Preview em Tempo Real:** Visualização instantânea de todas as propriedades Flexbox aplicadas.
- **Controles Completos:**
  - Direção, Wrap, Justify, Align Items e Align Content.
  - Controle preciso de espaçamento (Gap) via slider.
  - Adição e remoção dinâmica de itens.
- **Acessibilidade:** Interface semanticamente correta, com suporte a navegação por teclado e alto contraste.

### Funcionalidades de Produtividade
- **Presets Inteligentes:** Configurações pré-definidas para cenários comuns (Hero, Sidebar, Grid).
- **Geração de Código:** Exportação automática de CSS e HTML limpos e otimizados.
- **Gestão de Itens:** Controle visual da quantidade de elementos no container.
- **Estado Persistente:** Compartilhamento de layouts via URL (query params) para colaboração fácil.

### Backend e Cloud (Estrutura Preparada)
- Autorização segura com JWT.
- API REST modular para salvamento e compartilhamento de layouts.
- Sistema de logs e métricas para monitoramento (admin).

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5 Semântico:** Estrutura acessível e otimizada para SEO.
- **CSS3 Moderno:** Variáveis (Custom Properties), CSS Grid, Flexbox, Animações.
- **Vanilla JS:** Lógica de manipulação de DOM leve e performática, sem dependências externas pesadas.

### Backend
- **Node.js**: Runtime de alta performance.
- **Express**: Framework web minimalista e robusto.
- **Middleware Chain**: Arquitetura organizada com tratamento de erros, logging (Pino) e segurança (Helmet, CORS).
- **JSON Store**: Persistência de dados leve baseada em arquivo (Data Store).

---

## 📂 Estrutura do Projeto

```
layout_aria_CSS/
├── assets/          # Recursos estáticos (imagens, ícones)
├── backend/         # API REST e Lógica de Servidor
│   ├── src/
│   │   ├── modules/ # Funcionalidades (auth, layouts, admin)
│   │   ├── core/    # Configurações base e utilitários
│   │   └── ...
├── scripts/         # Scripts de automação
├── index.html       # Entry point da aplicação Web
├── styles.css       # Design System e Estilização global
└── script.js        # Lógica de interface e interatividade
```

---

## ⚡ Como Rodar o Projeto

### Frontend (Playground)
Basta abrir o arquivo `index.html` em qualquer navegador moderno. Não requer instalação para as funcionalidades visuais.

### Backend (API)
1. Navegue até a pasta do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
   *O backend rodará na porta definida nas variáveis de ambiente (padrão: 3000).*

---

## 💡 Boas Práticas Adotadas

1. **Clean Code:** Nomenclatura clara, funções pequenas e responsabilidade única.
2. **UI/UX First:** Foco total na usabilidade e clareza visual antes da complexidade técnica.
3. **Performance:** Frontend sem frameworks pesados para carregamento instantâneo.
4. **Arquitetura Modular:** O backend é dividido em módulos de domínio, facilitando a escalabilidade.

---

## 🔮 Melhorias Futuras

- Integração completa do Frontend com a API de Persistência.
- Sistema de Login/Registro para salvar layouts na nuvem.
- Implementação de layouts CSS Grid.
- Exportação de código para Tailwind CSS e React.

---
**Desenvolvido com excelência por Matheus Siqueira.**
