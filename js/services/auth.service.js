import { api } from './api.js';

class AuthService {
  get isAuthenticated() {
    return !!api.token;
  }

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response && response.accessToken) {
      api.setToken(response.accessToken);
      return response.user;
    }
    throw new Error('Falha no login: Resposta inválida');
  }

  async register(name, email, password) {
    return await api.post('/auth/register', { name, email, password });
  }

  logout() {
    api.logout();
    // Opcional: chamar endpoint de logout no backend
  }
}

export const authService = new AuthService();
