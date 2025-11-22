import { store } from '../store/api-store';
import { LayoutComponent } from './Layout';
import type { DeliveryOrder } from '../types';

export function DeliveriesComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'deliveries-page';

  function renderDeliveries() {
    const deliveriesList = container.querySelector('#deliveries-list');
    if (!deliveriesList) return;

    const deliveries = store.getDeliveries();
    deliveriesList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Warehouse</th>
            <th>Items</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${deliveries.map((delivery) => `
            <tr>
              <td>${delivery.id.substring(0, 8)}</td>
              <td>${delivery.customer}</td>
              <td>${store.getWarehouse(delivery.warehouseId)?.name || 'N/A'}</td>
              <td>${delivery.items.length} items</td>
              <td><span class="status-badge status-${delivery.status}">${delivery.status}</span></td>
              <td>${delivery.createdAt.toLocaleDateString()}</td>
              <td>
                <button class="btn btn-sm btn-view" data-delivery-id="${delivery.id}">View</button>
                ${delivery.status !== 'done' && delivery.status !== 'canceled' ? `
                  <button class="btn btn-sm btn-validate" data-delivery-id="${delivery.id}">Validate</button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.btn-validate').forEach((btn) => {
      btn.addEventListener('click', () => {
        const deliveryId = (btn as HTMLElement).dataset.deliveryId;
        if (deliveryId) {
          const delivery = deliveries.find((d) => d.id === deliveryId);
          if (delivery) {
            delivery.status = 'done';
            store.createDelivery(delivery);
            renderDeliveries();
          }
        }
      });
    });
  }

  function showDeliveryModal(delivery?: DeliveryOrder) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const products = store.getProducts();
    const warehouses = store.getWarehouses();
    let items: Array<{ productId: string; quantity: number }> = delivery?.items || [];

    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>${delivery ? 'Edit' : 'Create'} Delivery Order</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form id="delivery-form">
          <div class="form-group">
            <label>Customer</label>
            <input type="text" id="delivery-customer" value="${delivery?.customer || ''}" required />
          </div>
          <div class="form-group">
            <label>Warehouse</label>
            <select id="delivery-warehouse" required>
              ${warehouses.map((w) => `<option value="${w.id}" ${delivery?.warehouseId === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="delivery-status">
              <option value="draft" ${delivery?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="waiting" ${delivery?.status === 'waiting' ? 'selected' : ''}>Waiting</option>
              <option value="ready" ${delivery?.status === 'ready' ? 'selected' : ''}>Ready</option>
              <option value="done" ${delivery?.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
          <div class="form-group">
            <label>Items</label>
            <div id="delivery-items">
              ${items.map((item, idx) => `
                <div class="item-row">
                  <select class="item-product" data-index="${idx}">
                    ${products.map((p) => `<option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                  </select>
                  <input type="number" class="item-quantity" value="${item.quantity}" data-index="${idx}" placeholder="Qty" />
                  <button type="button" class="btn btn-sm btn-remove-item" data-index="${idx}">Remove</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="btn btn-secondary" id="add-item-btn">+ Add Item</button>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    let itemIndex = items.length;
    const addItemBtn = modal.querySelector('#add-item-btn');
    addItemBtn?.addEventListener('click', () => {
      const itemsContainer = modal.querySelector('#delivery-items');
      const itemRow = document.createElement('div');
      itemRow.className = 'item-row';
      itemRow.innerHTML = `
        <select class="item-product" data-index="${itemIndex}">
          ${products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
        <input type="number" class="item-quantity" data-index="${itemIndex}" placeholder="Qty" />
        <button type="button" class="btn btn-sm btn-remove-item" data-index="${itemIndex}">Remove</button>
      `;
      itemsContainer?.appendChild(itemRow);
      itemIndex++;

      itemRow.querySelector('.btn-remove-item')?.addEventListener('click', () => {
        itemRow.remove();
      });
    });

    modal.querySelectorAll('.btn-remove-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        (btn as HTMLElement).closest('.item-row')?.remove();
      });
    });

    const form = modal.querySelector('#delivery-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const customer = (modal.querySelector('#delivery-customer') as HTMLInputElement).value;
      const warehouseId = (modal.querySelector('#delivery-warehouse') as HTMLSelectElement).value;
      const status = (modal.querySelector('#delivery-status') as HTMLSelectElement).value as any;

      const formItems: typeof items = [];
      modal.querySelectorAll('.item-row').forEach((row) => {
        const productId = (row.querySelector('.item-product') as HTMLSelectElement).value;
        const quantity = parseFloat((row.querySelector('.item-quantity') as HTMLInputElement).value);
        if (productId && quantity > 0) {
          formItems.push({ productId, quantity });
        }
      });

      if (delivery) {
        delivery.customer = customer;
        delivery.warehouseId = warehouseId;
        delivery.status = status;
        delivery.items = formItems;
        store.createDelivery(delivery);
      } else {
        store.createDelivery({
          type: 'delivery',
          customer,
          warehouseId,
          status,
          items: formItems,
        });
      }

      document.body.removeChild(modal);
      renderDeliveries();
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
      <h1>Delivery Orders</h1>
      <button class="btn btn-primary" id="add-delivery-btn">+ New Delivery</button>
    </div>
    <div id="deliveries-list"></div>
  `;

  container.querySelector('#add-delivery-btn')?.addEventListener('click', () => {
    showDeliveryModal();
  });

  renderDeliveries();

  return LayoutComponent(container);
}

