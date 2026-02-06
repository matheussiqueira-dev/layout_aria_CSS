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
      shareBtn: document.getElementById('btn-share'),
      saveBtn: document.getElementById('btn-save'),
      loginBtn: document.getElementById('btn-login'), // Placeholder if I add it
      toast: document.getElementById('toast'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      tabContents: {
        css: document.getElementById('tab-css'),
        html: document.getElementById('tab-html')
      },
      presets: document.querySelectorAll('[data-preset]'),
      authSection: document.querySelector('.top-actions') // Where login/save btns are
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
Range Inputs
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
        
        this.updateConfig(prop, 
      input.addEventListener('input', (e) => {
        this.updateConfig(e.target.dataset.cssProp, e.target.value);
      });
    });

    // Items
    this.dom.addItemBtn.addEventListener('click', () => this.updateItems(1));
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
