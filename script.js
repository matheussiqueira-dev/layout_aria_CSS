document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const previewContainer = document.getElementById('playground');
  const cssOutput = document.getElementById('css-output');
  const inputs = document.querySelectorAll('[data-css-prop]');
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  const addItemBtn = document.getElementById('add-item');
  const removeItemBtn = document.getElementById('remove-item');
  const itemCountSpan = document.getElementById('item-count');
  const copyBtn = document.getElementById('copy-css');
  const toast = document.getElementById('toast');
  const presets = document.querySelectorAll('[data-preset]');

  // --- State ---
  let itemCount = 4;
  const maxItems = 12;
  const minItems = 1;

  // --- Functions ---

  function updatePreview() {
    let cssText = `.container {\n  display: flex;\n`;

    inputs.forEach(input => {
      const prop = input.dataset.cssProp;
      let val = input.value;
      const unit = input.dataset.unit || '';
      
      if (input.type === 'range') {
        const display = document.getElementById(input.id + '-val');
        if (display) display.textContent = val + unit;
      }

      const fullValue = val + unit;
      
      // Update DOM style
      previewContainer.style[prop] = fullValue;

      // Update CSS Code text
      cssText += `  ${prop}: ${fullValue};\n`;
    });

    cssText += `}`;
    cssOutput.textContent = cssText;
  }

  function addItem() {
    if (itemCount >= maxItems) return;
    itemCount++;
    const div = document.createElement('div');
    div.className = 'flex-item';
    div.textContent = itemCount;
    // Add animation
    div.style.animation = 'fadeIn 0.3s ease';
    previewContainer.appendChild(div);
    updateItemCount();
  }

  function removeItem() {
    if (itemCount <= minItems) return;
    itemCount--;
    if (previewContainer.lastElementChild) {
      previewContainer.removeChild(previewContainer.lastElementChild);
    }
    updateItemCount();
  }

  function updateItemCount() {
    itemCountSpan.textContent = itemCount;
  }

  function toggleTheme() {
    const isDark = body.classList.contains('theme-dark');
    if (isDark) {
      body.classList.remove('theme-dark');
      document.querySelector('.sun-icon').style.display = 'block';
      document.querySelector('.moon-icon').style.display = 'none';
    } else {
      body.classList.add('theme-dark');
      document.querySelector('.sun-icon').style.display = 'none';
      document.querySelector('.moon-icon').style.display = 'block';
    }
  }

  function applyPreset(name) {
    // Reset active state
    presets.forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-preset="${name}"]`).classList.add('active');

    // Define presets configurations
    const configs = {
      default: { direction: 'row', justify: 'flex-start', align: 'stretch', gap: '16' },
      hero: { direction: 'column', justify: 'center', align: 'center', gap: '24' },
      sidebar: { direction: 'column', justify: 'flex-start', align: 'stretch', gap: '0' },
      grid: { direction: 'row', justify: 'center', align: 'center', gap: '32', wrap: 'wrap' }
    };

    const config = configs[name];
    if (!config) return;

    // Set values to inputs
    if (config.direction) setInputValue('flex-direction', config.direction);
    if (config.justify) setInputValue('justify-content', config.justify);
    if (config.align) setInputValue('align-items', config.align);
    if (config.gap) setInputValue('gap', config.gap);
    if (config.wrap) setInputValue('flex-wrap', config.wrap);
    else setInputValue('flex-wrap', 'nowrap'); // Default reset

    // Trigger update
    updatePreview();
  }

  function setInputValue(id, val) {
    const input = document.getElementById(id);
    if (input) {
      input.value = val;
      // Trigger change event if needed, but we call updatePreview directly
    }
  }

  function copyToClipboard() {
    const code = cssOutput.textContent;
    navigator.clipboard.writeText(code).then(() => {
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 2000);
    });
  }

  // --- Event Listeners ---
  inputs.forEach(input => {
    input.addEventListener('input', updatePreview);
  });

  addItemBtn.addEventListener('click', addItem);
  removeItemBtn.addEventListener('click', removeItem);
  themeToggle.addEventListener('click', toggleTheme);
  copyBtn.addEventListener('click', copyToClipboard);

  presets.forEach(btn => {
    btn.addEventListener('click', (e) => applyPreset(e.target.dataset.preset));
  });

  // --- Authorization / Backend Integration Stub ---
  const btnLogin = document.getElementById('btn-login');
  const btnSave = document.getElementById('btn-save');

  if (btnLogin) {
    btnLogin.addEventListener('click', () => {
      alert('Funcionalidade de Login será implementada na integração com o backend.');
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      // Exemplo de como serializaríamos o estado
      const state = {
        meta: { name: "Meu Layout", date: new Date().toISOString() },
        css: cssOutput.textContent,
        config: Array.from(inputs).reduce((acc, input) => {
          acc[input.id] = input.value;
          return acc;
        }, {})
      };
      console.log('Salvando estado:', state);
      alert('Layout pronto para ser salvo! (Conecção com API pendente)');
    });
  }

  // Init
  updatePreview();
});
