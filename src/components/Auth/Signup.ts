import { store } from '../../store/api-store';
import { api } from '../../services/api';
import { router } from '../../router';

export function SignupComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';

  container.innerHTML = `
    <div class="auth-card">
      <h1>StockMaster</h1>
      <h2>Sign Up</h2>
      <form id="signup-form">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required />
        </div>
        <div class="form-group">
          <label for="role">Role</label>
          <select id="role" name="role" required>
            <option value="inventory_manager">Inventory Manager</option>
            <option value="warehouse_staff">Warehouse Staff</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">Sign Up</button>
        <div class="auth-links">
          <a href="#" id="login-link">Already have an account? Login</a>
        </div>
      </form>
    </div>
  `;

  const form = container.querySelector('#signup-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'inventory_manager' | 'warehouse_staff';

    try {
      const response = await api.signup(name, email, password, role);
      if (response.data.user) {
        store.setCurrentUser(response.data.user);
        router.setAuthState(true);
        router.navigate('/dashboard');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Signup failed');
    }
  });

  container.querySelector('#login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/login');
  });

  return container;
}

