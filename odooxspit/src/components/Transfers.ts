import { store } from '../store/api-store';
import { LayoutComponent } from './Layout';
import type { InternalTransfer } from '../types';

export async function TransfersComponent(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'transfers-page';

  const warehouses = await store.getWarehouses();

  async function renderTransfers() {
    const transfersList = container.querySelector('#transfers-list');
    if (!transfersList) return;

    const transfers = await store.getTransfers();
    transfersList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>From</th>
            <th>To</th>
            <th>Items</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${transfers.map((transfer) => `
            <tr>
              <td>${transfer.id.substring(0, 8)}</td>
              <td>${warehouses.find(w => w.id === transfer.fromWarehouseId)?.name || 'N/A'}</td>
              <td>${warehouses.find(w => w.id === transfer.toWarehouseId)?.name || 'N/A'}</td>
              <td>${transfer.items.length} items</td>
              <td><span class="status-badge status-${transfer.status}">${transfer.status}</span></td>
              <td>${transfer.createdAt.toLocaleDateString()}</td>
              <td>
                <button class="btn btn-sm btn-view" data-transfer-id="${transfer.id}">View</button>
                ${transfer.status !== 'done' && transfer.status !== 'canceled' ? `
                  <button class="btn btn-sm btn-validate" data-transfer-id="${transfer.id}">Validate</button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.btn-validate').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const transferId = (btn as HTMLElement).dataset.transferId;
        if (transferId) {
          try {
            const validatedTransfer = await store.validateTransfer(transferId);
            if (validatedTransfer) {
              await renderTransfers();
            } else {
              alert('Failed to validate transfer. Please try again.');
            }
          } catch (error) {
            alert('Failed to validate transfer. Please try again.');
            console.error('Validate transfer error:', error);
          }
        }
      });
    });
  }

  function showTransferModal(transfer?: InternalTransfer) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const products = store.getProducts();
    const warehouses = store.getWarehouses();
    let items: Array<{ productId: string; quantity: number }> = transfer?.items || [];

    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>${transfer ? 'Edit' : 'Create'} Internal Transfer</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form id="transfer-form">
          <div class="form-group">
            <label>From Warehouse</label>
            <select id="transfer-from" required>
              ${warehouses.map((w) => `<option value="${w.id}" ${transfer?.fromWarehouseId === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>To Warehouse</label>
            <select id="transfer-to" required>
              ${warehouses.map((w) => `<option value="${w.id}" ${transfer?.toWarehouseId === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="transfer-status">
              <option value="draft" ${transfer?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="waiting" ${transfer?.status === 'waiting' ? 'selected' : ''}>Waiting</option>
              <option value="ready" ${transfer?.status === 'ready' ? 'selected' : ''}>Ready</option>
              <option value="done" ${transfer?.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
          <div class="form-group">
            <label>Items</label>
            <div id="transfer-items">
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
      const itemsContainer = modal.querySelector('#transfer-items');
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

    const form = modal.querySelector('#transfer-form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fromWarehouseId = (modal.querySelector('#transfer-from') as HTMLSelectElement).value;
      const toWarehouseId = (modal.querySelector('#transfer-to') as HTMLSelectElement).value;
      const status = (modal.querySelector('#transfer-status') as HTMLSelectElement).value as any;

      const formItems: typeof items = [];
      modal.querySelectorAll('.item-row').forEach((row) => {
        const productId = (row.querySelector('.item-product') as HTMLSelectElement).value;
        const quantity = parseFloat((row.querySelector('.item-quantity') as HTMLInputElement).value);
        if (productId && quantity > 0) {
          formItems.push({ productId, quantity });
        }
      });

      if (formItems.length === 0) {
        alert('Please add at least one item to the transfer.');
        return;
      }

      try {
        if (transfer) {
          await store.updateTransfer(transfer.id, {
            fromWarehouseId,
            toWarehouseId,
            status,
            items: formItems,
          });
        } else {
          await store.createTransfer({
            type: 'transfer',
            fromWarehouseId,
            toWarehouseId,
            warehouseId: fromWarehouseId, // For document base
            status,
            items: formItems,
          });
        }

        document.body.removeChild(modal);
        await renderTransfers();
      } catch (error) {
        alert('Failed to save transfer. Please try again.');
        console.error('Transfer save error:', error);
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
      <h1>Internal Transfers</h1>
      <button class="btn btn-primary" id="add-transfer-btn">+ New Transfer</button>
    </div>
    <div id="transfers-list"></div>
  `;

  container.querySelector('#add-transfer-btn')?.addEventListener('click', async () => {
    await showTransferModal();
  });

  await renderTransfers();

  return LayoutComponent(container);
}

