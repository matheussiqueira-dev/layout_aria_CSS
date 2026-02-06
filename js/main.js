/**
 * Layout Studio Core
 * Architecture: State-Driven UI with URL persistence (Modular)
 */
import { authService } from './services/auth.service.js';
import { api } from './services/api.js';
import { toast } from './components/toast.js';
import { Modal } from './components/modal.js';

class LayoutStudio {
  constructor() {
    this.state = {
      config: {
        'flex-direction': 'row',
        'flex-wrap': 'nowrap',
        'justify-content': 'flex-start',
        'align-items': 'stretch',
        'align-content': 'normal',
        'gap': '16'
      },
      items: 4,
      theme: 'dark',
      activeTab: 'css',
      user: null
    };
    
    this.maxItems = 12;
    this.minItems = 1;
    
    // Auth Check
    if (authService.isAuthenticated) {
        // Fetch User Profile if needed, or assume logged in
        this.state.user = { dummy: true }; 
        this.updateAuthUI();
    }

    this.init();
  }

  init() {
    this.cacheDOM();
    this.loadStateFromURL();
    this.bindEvents();
    this.initModals();
    this.applyTheme(); // Init theme
    this.updateAuthUI(); // Init auth UI
    this.render();
  }

  cacheDOM() {
    this.dom = {
      preview: document.getElementById('playground'),
      // Now inputs includes Ranges and Generic inputs, but NOT the button groups directly usually
      inputs: document.querySelectorAll('input[data-css-prop]'), 
      toggleGroups: document.querySelectorAll('[data-ui-control="toggle"]'),
      cssOutput: document.getElementById('css-output'),
      htmlOutput: document.getElementById('html-output'),
      itemCount: document.getElementById('item-count'),
      addItemBtn: document.getElementById('add-item'),
      removeItemBtn: document.getElementById('remove-item'),
      themeToggle: document.getElementById('theme-toggle'),
      copyBtn: document.getElementById('copy-code'),
      
      // Dynamic containers
      toast: document.getElementById('toast'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      tabContents: {
        css: document.getElementById('tab-css'),
        html: document.getElementById('tab-html')
      },
      presets: document.querySelectorAll('[data-preset]'),
      authContainer: document.getElementById('auth-container')
    };
  }

  initModals() {
    // Login Modal
    this.loginModal = new Modal('login', 'Acessar Conta', `
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" class="input-field" placeholder="seu@email.com" required>
      </div>
      <div class="form-group">
        <label>Senha</label>
        <input type="password" name="password" class="input-field" placeholder="******" required>
      </div>
    `, async (data) => {
      try {
        const user = await authService.login(data.email, data.password);
        this.state.user = user;
        this.updateAuthUI();
        toast.show(`Bem-vindo de volta, ${user.name}!`, 'success');
      } catch (err) {
        toast.show(err.message, 'error');
        throw err; // Stop modal close
      }
    });

    // Save Layout Modal
    this.saveModal = new Modal('save', 'Salvar Layout', `
      <div class="form-group">
        <label>Nome do Layout</label>
        <input type="text" name="name" class="input-field" placeholder="Ex: Hero Section Home" required>
      </div>
      <div class="form-group">
        <label>Tags (separadas por vírgula)</label>
        <input type="text" name="tags" class="input-field" placeholder="hero, flexbox, landing">
      </div>
      <div class="form-group">
        <label>Visibilidade</label>
        <div class="select-wrapper">
            <select name="isPublic">
                <option value="false">Privado</option>
                <option value="true">Público</option>
            </select>
        </div>
      </div>
    `, async (data) => {
        if (!this.state.user) {
            toast.show('Você precisa estar logado para salvar.', 'error');
            this.loginModal.open();
            throw new Error('Not logged in');
        }

        try {
            const payload = {
                name: data.name,
                isPublic: data.isPublic === 'true',
                tags: data.tags.split(',').map(t => t.trim()),
                config: this.state.config
            };
            
            await api.post('/layouts', payload);
            toast.show('Layout salvo com sucesso!', 'success');
        } catch (err) {
            toast.show('Erro ao salvar layout: ' + err.message, 'error');
            throw err;
        }
    });
  }
  bindEvents() {
    // Range Inputs
    this.dom.inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        this.updateConfig(e.target.dataset.cssProp, e.target.value);
      });
    });

    // Custom UI Toggle Groups (Icons/Buttons)
    this.dom.toggleGroups.forEach(group => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        
        const prop = group.dataset.cssProp;
        const value = btn.dataset.value;
        
        this.updateConfig(prop, value);
      });
    });

    // Items
    this.dom.addItemBtn.addEventListener('click', () => this.updateItems(1));
    this.dom.removeItemBtn.addEventListener('click', () => this.updateItems(-1));

    // Theme
    this.dom.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Tabs
    this.dom.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
    
    // Copy Code
    this.dom.copyBtn.addEventListener('click', () => this.copyToClipboard());

    // Presets
    this.dom.presets.forEach(btn => {
      btn.addEventListener('click', () => {
         const preset = btn.dataset.preset;
         this.applyPreset(preset);
      });
    });

    // Dynamic Auth Actions (Delegation)
    this.dom.authContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if(!btn) return;

        if(btn.id === 'btn-login') this.loginModal.open();
        if(btn.id === 'btn-save') this.saveModal.open();
        if(btn.id === 'btn-share') this.shareLayout();
        if(btn.id === 'btn-logout') this.logout();
    });
  }

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
  }

  applyTheme() {
    const isDark = this.state.theme === 'dark';
    document.body.classList.toggle('theme-dark', isDark);
    
    // Icon toggle
    const sun = this.dom.themeToggle.querySelector('.sun-icon');
    const moon = this.dom.themeToggle.querySelector('.moon-icon');
    if(sun && moon) {
        sun.style.display = isDark ? 'block' : 'none';
        moon.style.display = isDark ? 'none' : 'block';
    }
  }

  switchTab(tabName) {
    this.state.activeTab = tabName;
    
    // Buttons
    this.dom.tabBtns.forEach(b => {
      if(b.dataset.tab === tabName) b.classList.add('active');
      else b.classList.remove('active');
    });

    // Content
    Object.keys(this.dom.tabContents).forEach(k => {
      const el = this.dom.tabContents[k];
      if(k === tabName) {
        el.classList.remove('hidden');
        el.classList.add('active');
      } else {
        el.classList.add('hidden');
        el.classList.remove('active');
      }
    });
  }

  applyPreset(name) {
    const presets = {
       'default': { 'flex-direction': 'row', 'flex-wrap': 'nowrap', 'justify-content': 'flex-start', 'align-items': 'stretch', 'gap': '16' },
       'hero':    { 'flex-direction': 'column', 'justify-content': 'center', 'align-items': 'center', 'gap': '32', 'flex-wrap': 'wrap' },
       'sidebar': { 'flex-direction': 'row', 'align-items': 'flex-start', 'justify-content': 'space-between', 'gap': '0' },
       'grid':    { 'flex-direction': 'row', 'flex-wrap': 'wrap', 'justify-content': 'center', 'gap': '24' }
    };
    
    if(presets[name]) {
       this.state.config = { ...this.state.config, ...presets[name] };
       this.updateURL();
       this.render();
       
       // UI Update for Pills
       this.dom.presets.forEach(p => {
           if(p.dataset.preset === name) p.classList.add('active');
           else p.classList.remove('active');
       });
    }
  }

  updateAuthUI() {
    // Re-render buttons based on user state
    if (this.state.user) {
        this.dom.authContainer.innerHTML = `
          <button id="btn-save" class="btn primary">Salvar</button>
          <button id="btn-share" class="btn secondary">Compartilhar</button>
          <button id="btn-logout" class="icon-btn" title="Sair">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        `;
    } else {
        this.dom.authContainer.innerHTML = `
          <button id="btn-login" class="btn primary">Entrar / Criar Conta</button>
        `;
    }
  }

  logout() {
    authService.logout();
    this.state.user = null;
    this.updateAuthUI();
    toast.show('Você saiu da conta', 'success');
  }

  copyToClipboard() {
      const code = this.state.activeTab === 'css' 
          ? this.dom.cssOutput.textContent 
          : this.dom.htmlOutput.textContent;
          
      navigator.clipboard.writeText(code).then(() => {
          toast.show('Código copiado!', 'success');
      });
  }
    this.dom.removeItemBtn.addEventListener('click', () => this.updateItems(-1));

    // Theme
    this.dom.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Tabs
    this.dom.tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Copy & Share
    this.dom.copyBtn.addEventListener('click', () => this.copyCode());
    this.dom.shareBtn.addEventListener('click', () => this.shareLayout());

    // Save & Login
    // Note: btn-share is already bound. btn-save needs binding.
    // I need to inject a Login button dynamically or use an existing one if I revert HTML changes
    
    // Let's create the auth buttons dynamically in updateAuthUI() to handle state
    
    // Presets
    this.dom.presets.forEach(btn => {
      btn.addEventListener('click', (e) => this.applyPreset(e.target.dataset.preset));
    });

    // Browser Back/Forward
    window.addEventListener('popstate', () => this.loadStateFromURL());
  }

  updateAuthUI() {
    // Clear existing buttons
    this.dom.authSection.innerHTML = '';

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn secondary';
    shareBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
      Share
    `;
    shareBtn.addEventListener('click', () => this.shareLayout());
    this.dom.authSection.appendChild(shareBtn);

    if (this.state.user) {
        // Logged In
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn primary';
        saveBtn.textContent = 'Salvar Layout';
        saveBtn.addEventListener('click', () => this.saveModal.open());
        this.dom.authSection.appendChild(saveBtn);

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn secondary danger-text';
        logoutBtn.textContent = 'Sair';
        logoutBtn.addEventListener('click', () => {
            authService.logout();
            this.state.user = null;
            this.updateAuthUI();
            toast.show('Desconectado com sucesso.');
        });
        this.dom.authSection.appendChild(logoutBtn);
    } else {
        // Guest
        const loginBtn = document.createElement('button');
        loginBtn.className = 'btn primary';
        loginBtn.textContent = 'Entrar / Registrar';
        loginBtn.addEventListener('click', () => this.loginModal.open());
        this.dom.authSection.appendChild(loginBtn);
    }
  }

  // --- State Management ---

  updateConfig(prop, value) {
    this.state.config[prop] = value;
    this.render();
  }

  updateItems(delta) {
    const newCount = this.state.items + delta;
    if (newCount >= this.minItems && newCount <= this.maxItems) {
      this.state.items = newCount;
      this.render();
    }
  }

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('theme-dark', this.state.theme === 'dark');
    this.renderThemeIcons();
  }

  switchTab(tabName) {
    this.state.activeTab = tabName;
    
    // Update UI classes
    this.dom.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    this.dom.tabContents.css.classList.toggle('hidden', tabName !== 'css');
    this.dom.tabContents.css.classList.toggle('active', tabName === 'css');
    
    this.dom.tabContents.html.classList.toggle('hidden', tabName !== 'html');
    this.dom.tabContents.html.classList.toggle('active', tabName === 'html');
  }

  // --- Rendering ---

  render() {
    this.renderPreview();
    this.renderInputs();
    this.renderCode();
    this.renderStats();
    this.updateURL();
  }

  renderPreview() {
    const { config, items } = this.state;
    const style = this.dom.preview.style;

    // Apply Styles
    Object.entries(config).forEach(([prop, val]) => {
    // 1. Render Range/Text Inputs
    this.dom.inputs.forEach(input => {
      const prop = input.dataset.cssProp;
      if (this.state.config[prop]) {
        input.value = this.state.config[prop];
        if (input.type === 'range') {
          const display = document.getElementById(`${input.id}-val`);
          if (display) display.textContent = `${input.value}px`;
        }
      }
    });

    // 2. Render Toggle Groups (State Active Class)
    this.dom.toggleGroups.forEach(group => {
        const prop = group.dataset.cssProp;
        const currentVal = this.state.config[prop];
        
        // Remove active from all
        const btns = group.querySelectorAll('.toggle-btn');
        btns.forEach(b => b.classList.remove('active'));

        // Add active to current
        const target = group.querySelector(`[data-value="${currentVal}"]`);
        if (target) target.classList.add('active');l.textContent = i;
      el.style.animation = 'fadeIn 0.3s ease';
      this.dom.preview.appendChild(el);
    }
  }

  renderInputs() {
    this.dom.inputs.forEach(input => {
      const prop = input.dataset.cssProp;
      if (this.state.config[prop]) {
        input.value = this.state.config[prop];
        if (input.type === 'range') {
          const display = document.getElementById(`${input.id}-val`);
          if (display) display.textContent = `${input.value}px`;
        }
      }
    });
  }

  renderCode() {
    const { config, items } = this.state;
    
    // Generate CSS
    const cssLines = [
      '.container {',
      '  display: flex;',
      ...Object.entries(config).map(([prop, val]) => 
        `  ${prop}: ${val}${prop === 'gap' ? 'px' : ''};`
      ),
      '}'
    ];
    this.dom.cssOutput.textContent = cssLines.join('\n');

    // Generate HTML
    const htmlLines = [
      '<div class="container">',
      ...Array.from({ length: items }, (_, i) => `  <div class="flex-item">${i + 1}</div>`),
      '</div>'
    ];
    this.dom.htmlOutput.textContent = htmlLines.join('\n');
  }

  renderStats() {
    this.dom.itemCount.textContent = this.state.items;
  }

  renderThemeIcons() {
    const isDark = this.state.theme === 'dark';
    document.querySelector('.sun-icon').style.display = isDark ? 'none' : 'block';
    document.querySelector('.moon-icon').style.display = isDark ? 'block' : 'none';
  }

  // --- Presets & Persistence ---

  applyPreset(name) {
    const presets = {
      default: { direction: 'row', justify: 'flex-start', align: 'stretch', gap: '16', wrap: 'nowrap' },
      hero: { direction: 'column', justify: 'center', align: 'center', gap: '24', wrap: 'nowrap' },
      sidebar: { direction: 'column', justify: 'flex-start', align: 'stretch', gap: '0', wrap: 'nowrap' },
      grid: { direction: 'row', justify: 'center', align: 'center', gap: '32', wrap: 'wrap' }
    };

    const target = presets[name];
    if (!target) return;

    // Map colloquial names to CSS props
    this.state.config['flex-direction'] = target.direction;
    this.state.config['justify-content'] = target.justify;
    this.state.config['align-items'] = target.align;
    this.state.config['gap'] = target.gap;
    this.state.config['flex-wrap'] = target.wrap;

    // Update preset pills UI
    this.dom.presets.forEach(p => p.classList.toggle('active', p.dataset.preset === name));
    
    this.render();
  }

  updateURL() {
    const params = new URLSearchParams();
    // Compress state slightly
    params.set('d', this.state.config['flex-direction']);
    params.set('w', this.state.config['flex-wrap']);
    params.set('j', this.state.config['justify-content']);
    params.set('ai', this.state.config['align-items']);
    params.set('ac', this.state.config['align-content']);
    params.set('g', this.state.config['gap']);
    params.set('i', this.state.items);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('d')) return; // No state found

    this.state.config['flex-direction'] = params.get('d') || 'row';
    this.state.config['flex-wrap'] = params.get('w') || 'nowrap';
    this.state.config['justify-content'] = params.get('j') || 'flex-start';
    this.state.config['align-items'] = params.get('ai') || 'stretch';
    this.state.config['align-content'] = params.get('ac') || 'normal';
    this.state.config['gap'] = params.get('g') || '16';
    
    const items = parseInt(params.get('i'));
    if (!isNaN(items)) this.state.items = Math.min(Math.max(items, this.minItems), this.maxItems);
  }

  // --- Utilities ---

  shareLayout() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.show('Link copiado!');
    });
  }

  copyCode() {
    const content = this.state.activeTab === 'css' 
      ? this.dom.cssOutput.textContent 
      : this.dom.htmlOutput.textContent;
      
    navigator.clipboard.writeText(content).then(() => {
      toast.show(this.state.activeTab === 'css' ? 'CSS Copiado!' : 'HTML Copiado!');
    });
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LayoutStudio();
});
