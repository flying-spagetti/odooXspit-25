import { store } from '../store/api-store';
import { LayoutComponent } from './Layout';
import type { DeliveryOrder } from '../types';

export async function DeliveriesComponent(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'deliveries-page';

  const warehouses = await store.getWarehouses();

  let searchQuery = '';
  let viewMode: 'list' | 'kanban' = 'list';

  async function renderDeliveries() {
    const deliveriesList = container.querySelector('#deliveries-list');
    if (!deliveriesList) return;

    const deliveries = await store.getDeliveries();
    
    // Filter by search query
    const filteredDeliveries = deliveries.filter((delivery) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        delivery.reference?.toLowerCase().includes(query) ||
        delivery.customer?.toLowerCase().includes(query) ||
        delivery.deliveryAddress?.toLowerCase().includes(query)
      );
    });

    if (viewMode === 'kanban') {
      // Kanban view grouped by status
      const grouped = {
        draft: filteredDeliveries.filter(d => d.status === 'draft'),
        waiting: filteredDeliveries.filter(d => d.status === 'waiting'),
        ready: filteredDeliveries.filter(d => d.status === 'ready'),
        done: filteredDeliveries.filter(d => d.status === 'done'),
      };

      deliveriesList.innerHTML = `
        <div class="kanban-view">
          <div class="kanban-column">
            <h3>Draft (${grouped.draft.length})</h3>
            ${grouped.draft.map(d => createKanbanCard(d)).join('')}
          </div>
          <div class="kanban-column">
            <h3>Waiting (${grouped.waiting.length})</h3>
            ${grouped.waiting.map(d => createKanbanCard(d)).join('')}
          </div>
          <div class="kanban-column">
            <h3>Ready (${grouped.ready.length})</h3>
            ${grouped.ready.map(d => createKanbanCard(d)).join('')}
          </div>
          <div class="kanban-column">
            <h3>Done (${grouped.done.length})</h3>
            ${grouped.done.map(d => createKanbanCard(d)).join('')}
          </div>
        </div>
      `;
    } else {
      // List view
      deliveriesList.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>From</th>
              <th>To</th>
              <th>Contact</th>
              <th>Schedule Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredDeliveries.length === 0 ? `
              <tr><td colspan="7" class="empty-state">No deliveries found</td></tr>
            ` : filteredDeliveries.map((delivery) => `
              <tr>
                <td>${delivery.reference || delivery.id.substring(0, 8)}</td>
                <td>${warehouses.find(w => w.id === delivery.warehouseId)?.name || 'N/A'}</td>
                <td>${delivery.customer || 'N/A'}</td>
                <td>${delivery.customer || 'N/A'}</td>
                <td>${delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString() : '-'}</td>
                <td><span class="status-badge status-${delivery.status}">${delivery.status}</span></td>
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
    }

    function createKanbanCard(delivery: DeliveryOrder) {
      return `
        <div class="kanban-card" data-delivery-id="${delivery.id}">
          <div class="kanban-card-header">
            <strong>${delivery.reference || delivery.id.substring(0, 8)}</strong>
            <span class="status-badge status-${delivery.status}">${delivery.status}</span>
          </div>
          <div class="kanban-card-body">
            <p><strong>To:</strong> ${delivery.customer || 'N/A'}</p>
            <p><strong>From:</strong> ${warehouses.find(w => w.id === delivery.warehouseId)?.name || 'N/A'}</p>
            ${delivery.scheduledDate ? `<p><strong>Schedule:</strong> ${new Date(delivery.scheduledDate).toLocaleDateString()}</p>` : ''}
            <p><strong>Items:</strong> ${delivery.items.length}</p>
          </div>
          <div class="kanban-card-actions">
            <button class="btn btn-sm btn-view" data-delivery-id="${delivery.id}">View</button>
            ${delivery.status !== 'done' && delivery.status !== 'canceled' ? `
              <button class="btn btn-sm btn-validate" data-delivery-id="${delivery.id}">Validate</button>
            ` : ''}
          </div>
        </div>
      `;
    }

    container.querySelectorAll('.btn-validate').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const deliveryId = (btn as HTMLElement).dataset.deliveryId;
        if (deliveryId) {
          try {
            const validatedDelivery = await store.validateDelivery(deliveryId);
            if (validatedDelivery) {
              await renderDeliveries();
            } else {
              alert('Failed to validate delivery. Please try again.');
            }
          } catch (error) {
            alert('Failed to validate delivery. Please try again.');
            console.error('Validate delivery error:', error);
          }
        }
      });
    });
  }

  async function showDeliveryModal(delivery?: DeliveryOrder) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const [products, modalWarehouses] = await Promise.all([
      store.getProducts(),
      store.getWarehouses(),
    ]);
    let items: Array<{ productId: string; quantity: number }> = delivery?.items || [];

    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>${delivery ? 'Edit' : 'Create'} Delivery Order</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form id="delivery-form">
          ${delivery?.reference ? `<div class="form-group"><label>Reference</label><input type="text" value="${delivery.reference}" readonly /></div>` : ''}
          <div class="form-group">
            <label>To (Customer/Vendor)</label>
            <input type="text" id="delivery-customer" value="${delivery?.customer || ''}" required />
          </div>
          <div class="form-group">
            <label>Warehouse</label>
            <select id="delivery-warehouse" required>
              ${modalWarehouses.map((w) => `<option value="${w.id}" ${delivery?.warehouseId === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Delivery Address</label>
            <textarea id="delivery-address" rows="3">${delivery?.deliveryAddress || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Responsible</label>
            <input type="text" id="delivery-responsible" value="${delivery?.responsible || ''}" />
          </div>
          <div class="form-group">
            <label>Operation Type</label>
            <select id="delivery-operation-type">
              <option value="">Select operation type</option>
              <option value="customer_delivery" ${delivery?.operationType === 'customer_delivery' ? 'selected' : ''}>Customer Delivery</option>
              <option value="return" ${delivery?.operationType === 'return' ? 'selected' : ''}>Return</option>
              <option value="transfer_out" ${delivery?.operationType === 'transfer_out' ? 'selected' : ''}>Transfer Out</option>
            </select>
          </div>
          <div class="form-group">
            <label>Schedule Date</label>
            <input type="date" id="delivery-scheduled-date" value="${delivery?.scheduledDate ? new Date(delivery.scheduledDate).toISOString().split('T')[0] : ''}" />
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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customer = (modal.querySelector('#delivery-customer') as HTMLInputElement).value;
      const warehouseId = (modal.querySelector('#delivery-warehouse') as HTMLSelectElement).value;
      const deliveryAddress = (modal.querySelector('#delivery-address') as HTMLTextAreaElement).value;
      const responsible = (modal.querySelector('#delivery-responsible') as HTMLInputElement).value;
      const operationType = (modal.querySelector('#delivery-operation-type') as HTMLSelectElement).value;
      const status = (modal.querySelector('#delivery-status') as HTMLSelectElement).value as any;
      const scheduledDateInput = (modal.querySelector('#delivery-scheduled-date') as HTMLInputElement).value;
      const scheduledDate = scheduledDateInput ? scheduledDateInput : undefined;

      const formItems: typeof items = [];
      modal.querySelectorAll('.item-row').forEach((row) => {
        const productId = (row.querySelector('.item-product') as HTMLSelectElement).value;
        const quantity = parseFloat((row.querySelector('.item-quantity') as HTMLInputElement).value);
        if (productId && quantity > 0) {
          formItems.push({ productId, quantity });
        }
      });

      // Validate that at least one item is added
      if (formItems.length === 0) {
        alert('Please add at least one item to the delivery.');
        return;
      }

      // Validate customer
      if (!customer || customer.trim() === '') {
        alert('Please enter a customer name.');
        return;
      }

      try {
        if (delivery) {
          // Update existing delivery
          await store.updateDelivery(delivery.id, {
            customer,
            warehouseId,
            status,
            items: formItems,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
            deliveryAddress,
            responsible,
            operationType,
          });
        } else {
          // Create new delivery
          await store.createDelivery({
            type: 'delivery',
            customer,
            warehouseId,
            status,
            items: formItems,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
            deliveryAddress,
            responsible,
            operationType,
          });
        }

        document.body.removeChild(modal);
        await renderDeliveries();
      } catch (error: any) {
        // Show actual error message from backend
        let errorMessage = 'Failed to save delivery.';
        
        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
          errorMessage = 'Network error: Make sure the backend server is running on http://localhost:3001';
        }
        
        alert(`Failed to save delivery: ${errorMessage}`);
        console.error('Delivery save error:', error);
        console.error('Error response:', error?.response);
      }
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

  container.querySelector('#add-delivery-btn')?.addEventListener('click', async () => {
    await showDeliveryModal();
  });

  await renderDeliveries();

  return LayoutComponent(container);
}

