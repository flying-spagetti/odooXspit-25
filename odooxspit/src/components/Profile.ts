import { store } from '../store/api-store';
import { LayoutComponent } from './Layout';

export function ProfileComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'profile-page';

  const user = store.getCurrentUser();

  container.innerHTML = `
    <div class="page-header">
      <h1>My Profile</h1>
    </div>
    <div class="profile-card">
      <div class="profile-avatar-large">${user?.name.charAt(0).toUpperCase() || 'U'}</div>
      <div class="profile-info">
        <div class="info-row">
          <label>Name:</label>
          <span>${user?.name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <label>Email:</label>
          <span>${user?.email || 'N/A'}</span>
        </div>
        <div class="info-row">
          <label>Role:</label>
          <span>${user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}</span>
        </div>
      </div>
    </div>
  `;

  return LayoutComponent(container);
}

