import { store } from '../../store/api-store';
import { api } from '../../services/api';
import { router } from '../../router';

export function LoginComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';
  container.style.position = 'relative';
  container.style.background = '#fefcff';

  container.innerHTML = `
    <div class="auth-background" style="
      position: absolute;
      inset: 0;
      z-index: 0;
      background-image: 
        radial-gradient(circle at 30% 70%, rgba(173, 216, 230, 0.35), transparent 60%),
        radial-gradient(circle at 70% 30%, rgba(255, 182, 193, 0.4), transparent 60%);
    "></div>
    <div class="auth-card" style="position: relative; z-index: 1;">
      <h1>StockMaster</h1>
      <h2>Login</h2>
      <form id="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required />
        </div>
        <button type="submit" class="btn btn-primary">Login</button>
        <div class="auth-links">
          <a href="#" id="forgot-password">Forgot Password?</a>
          <a href="#" id="signup-link">Don't have an account? Sign up</a>
        </div>
      </form>
    </div>
  `;

  const form = container.querySelector('#login-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await api.login(email, password);
      if (response.data.user) {
        store.setCurrentUser(response.data.user);
        router.setAuthState(true);
        router.navigate('/dashboard');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Login failed');
    }
  });

  container.querySelector('#signup-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/signup');
  });

  container.querySelector('#forgot-password')?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/forgot-password');
  });

  return container;
}
