import { store } from '../store';
import { LayoutComponent } from './Layout';
import type { Warehouse } from '../types';

export function SettingsComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'settings-page';

  function renderWarehouses() {
    const warehousesList = container.querySelector('#warehouses-list');
    if (!warehousesList) return;

    const warehouses = store.getWarehouses();
    warehousesList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${warehouses.map((warehouse) => `
            <tr>
              <td>${warehouse.name}</td>
              <td>${warehouse.location}</td>
              <td>${warehouse.description || '-'}</td>
              <td>
                <button class="btn btn-sm btn-edit" data-warehouse-id="${warehouse.id}">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const warehouseId = (btn as HTMLElement).dataset.warehouseId;
        if (warehouseId) {
          showWarehouseModal(store.getWarehouse(warehouseId));
        }
      });
    });
  }

  function showWarehouseModal(warehouse?: Warehouse) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${warehouse ? 'Edit' : 'Create'} Warehouse</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form id="warehouse-form">
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="warehouse-name" value="${warehouse?.name || ''}" required />
          </div>
          <div class="form-group">
            <label>Location</label>
            <input type="text" id="warehouse-location" value="${warehouse?.location || ''}" required />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="warehouse-description">${warehouse?.description || ''}</textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#warehouse-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (modal.querySelector('#warehouse-name') as HTMLInputElement).value;
      const location = (modal.querySelector('#warehouse-location') as HTMLInputElement).value;
      const description = (modal.querySelector('#warehouse-description') as HTMLTextAreaElement).value;

      if (warehouse) {
        warehouse.name = name;
        warehouse.location = location;
        warehouse.description = description;
      } else {
        store.createWarehouse({ name, location, description });
      }

      document.body.removeChild(modal);
      renderWarehouses();
    });

    modal.querySelector('.modal-close')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    modal.querySelector('#cancel-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>Settings</h1>
    </div>
    <div class="settings-section">
      <h2>Warehouse Management</h2>
      <button class="btn btn-primary" id="add-warehouse-btn">+ Add Warehouse</button>
      <div id="warehouses-list"></div>
    </div>
  `;

  container.querySelector('#add-warehouse-btn')?.addEventListener('click', () => {
    showWarehouseModal();
  });

  renderWarehouses();

  return LayoutComponent(container);
}

