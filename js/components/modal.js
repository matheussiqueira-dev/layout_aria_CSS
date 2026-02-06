export class Modal {
  constructor(id, title, contentHtml, onConfirm) {
    this.id = id;
    this.overlay = this.createOverlay();
    this.modal = this.createModal(title, contentHtml);
    this.onConfirm = onConfirm;
    
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    
    this.bindEvents();
  }

  createOverlay() {
    const el = document.createElement('div');
    el.className = 'modal-overlay hidden';
    el.id = `modal-overlay-${this.id}`;
    return el;
  }

  createModal(title, contentHtml) {
    const el = document.createElement('div');
    el.className = 'modal-content';
    el.innerHTML = `
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" aria-label="Fechar">&times;</button>
      </div>
      <div class="modal-body">
        ${contentHtml}
      </div>
      <div class="modal-footer">
        <button class="btn secondary" data-action="cancel">Cancelar</button>
        <button class="btn primary" data-action="confirm">Confirmar</button>
      </div>
    `;
    return el;
  }

  bindEvents() {
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.modal.querySelector('.modal-close').addEventListener('click', () => this.close());
    
    const cancelBtn = this.modal.querySelector('[data-action="cancel"]');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    const confirmBtn = this.modal.querySelector('[data-action="confirm"]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        if (this.onConfirm) {
          try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Aguarde...';
            await this.onConfirm(this.getFormData());
            this.close();
          } catch (error) {
            console.error(error);
            // Error handling should be done by the caller or a toaster
          } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar';
          }
        }
      });
    }
  }

  getFormData() {
    const inputs = this.modal.querySelectorAll('input, select, textarea');
    const data = {};
    inputs.forEach(input => {
      if (input.name) data[input.name] = input.value;
    });
    return data;
  }

  open() {
    this.overlay.classList.remove('hidden');
    // Focus first input
    const input = this.modal.querySelector('input');
    if (input) input.focus();
  }

  close() {
    this.overlay.classList.add('hidden');
  }
}
