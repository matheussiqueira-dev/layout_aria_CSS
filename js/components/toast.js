export class Toast {
  constructor() {
    this.el = document.getElementById('toast');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'toast';
      this.el.className = 'toast hidden';
      document.body.appendChild(this.el);
    }
  }

  show(message, type = 'info') {
    this.el.textContent = message;
    this.el.className = `toast show ${type}`;
    
    // Auto hide
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.el.className = 'toast hidden';
    }, 3000);
  }
}

export const toast = new Toast();
