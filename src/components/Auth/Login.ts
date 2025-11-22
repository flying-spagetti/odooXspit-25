<<<<<<< HEAD
import { store } from '../../store/api-store';
import { api } from '../../services/api';
=======
import { store } from '../../store';
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
import { router } from '../../router';

export function LoginComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';

  container.innerHTML = `
    <div class="auth-card">
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
<<<<<<< HEAD
  form.addEventListener('submit', async (e) => {
=======
  form.addEventListener('submit', (e) => {
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
    e.preventDefault();
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

<<<<<<< HEAD
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
=======
    // Simple authentication (in production, this would call an API)
    let user = store.findUserByEmail(email);
    if (!user) {
      // Create user if doesn't exist (for demo purposes)
      user = store.createUser({
        email,
        name: email.split('@')[0],
        role: 'inventory_manager',
      });
    }

    store.setCurrentUser(user);
    router.setAuthState(true);
    router.navigate('/dashboard');
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
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

