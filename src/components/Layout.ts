<<<<<<< HEAD
import { store } from '../store/api-store';
import { api } from '../services/api';
=======
import { store } from '../store';
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
import { router } from '../router';

export function LayoutComponent(content: HTMLElement): HTMLElement {
  const container = document.createElement('div');
  container.className = 'app-layout';

  const user = store.getCurrentUser();

  container.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>StockMaster</h1>
      </div>
      <nav class="sidebar-nav">
        <a href="#" data-route="/dashboard" class="nav-item active">
          <span class="nav-icon">📊</span>
          <span>Dashboard</span>
        </a>
        <a href="#" data-route="/products" class="nav-item">
          <span class="nav-icon">📦</span>
          <span>Products</span>
        </a>
<<<<<<< HEAD
        <a href="#" data-route="/stock" class="nav-item">
          <span class="nav-icon">📊</span>
          <span>Stock Management</span>
        </a>
=======
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
        <a href="#" data-route="/receipts" class="nav-item">
          <span class="nav-icon">📥</span>
          <span>Receipts</span>
        </a>
        <a href="#" data-route="/deliveries" class="nav-item">
          <span class="nav-icon">📤</span>
          <span>Deliveries</span>
        </a>
        <a href="#" data-route="/transfers" class="nav-item">
          <span class="nav-icon">🔄</span>
          <span>Transfers</span>
        </a>
        <a href="#" data-route="/adjustments" class="nav-item">
          <span class="nav-icon">⚖️</span>
          <span>Adjustments</span>
        </a>
        <a href="#" data-route="/history" class="nav-item">
          <span class="nav-icon">📋</span>
          <span>Move History</span>
        </a>
        <a href="#" data-route="/settings" class="nav-item">
          <span class="nav-icon">⚙️</span>
          <span>Settings</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="user-info">
            <div class="user-avatar">${user?.name.charAt(0).toUpperCase() || 'U'}</div>
            <div class="user-details">
              <div class="user-name">${user?.name || 'User'}</div>
              <div class="user-role">${user?.role?.replace('_', ' ') || ''}</div>
            </div>
          </div>
          <div class="profile-menu">
            <a href="#" data-route="/profile" class="profile-link">My Profile</a>
            <a href="#" id="logout-btn" class="profile-link">Logout</a>
          </div>
        </div>
      </div>
    </aside>
    <main class="main-content">
      <div id="page-content"></div>
    </main>
  `;

  // Navigation handlers
  container.querySelectorAll('[data-route]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = (link as HTMLElement).dataset.route;
      if (route) {
        router.navigate(route);
        // Update active state
        container.querySelectorAll('.nav-item').forEach((item) => {
          item.classList.remove('active');
        });
        link.classList.add('active');
      }
    });
  });

  // Logout handler
  container.querySelector('#logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
<<<<<<< HEAD
    api.logout();
=======
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
    store.setCurrentUser(null);
    router.setAuthState(false);
    router.navigate('/login');
  });

  // Set active nav item based on current route
  const currentPath = router.getCurrentPath();
  container.querySelectorAll('[data-route]').forEach((item) => {
    if ((item as HTMLElement).dataset.route === currentPath) {
      item.classList.add('active');
    }
  });

  // Insert content
  const pageContent = container.querySelector('#page-content');
  if (pageContent && content) {
    pageContent.appendChild(content);
  }

  return container;
}

