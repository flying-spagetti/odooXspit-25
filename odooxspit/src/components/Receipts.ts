import { store } from '../store/api-store';
import { LayoutComponent } from './Layout';
import type { Receipt } from '../types';

export async function ReceiptsComponent(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'receipts-page';

  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const warehouses = await store.getWarehouses();

  async function renderReceipts() {
    const receiptsList = container.querySelector('#receipts-list');
    if (!receiptsList) return;

    const receipts = await store.getReceipts();
    receiptsList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Supplier</th>
            <th>Warehouse</th>
            <th>Items</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${receipts.map((receipt) => `
            <tr>
              <td>${receipt.id.substring(0, 8)}</td>
              <td>${receipt.supplier}</td>
              <td>${warehouses.find(w => w.id === receipt.warehouseId)?.name || 'N/A'}</td>
              <td>${receipt.items.length} items</td>
              <td><span class="status-badge status-${receipt.status}">${receipt.status}</span></td>
              <td>${receipt.createdAt.toLocaleDateString()}</td>
              <td>
                <button class="btn btn-sm btn-view" data-receipt-id="${receipt.id}">View</button>
                ${receipt.status !== 'done' && receipt.status !== 'canceled' ? `
                  <button class="btn btn-sm btn-validate" data-receipt-id="${receipt.id}">Validate</button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.btn-validate').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const receiptId = (btn as HTMLElement).dataset.receiptId;
        if (receiptId) {
          try {
            const validatedReceipt = await store.validateReceipt(receiptId);
            if (validatedReceipt) {
              await renderReceipts();
            } else {
              alert('Failed to validate receipt. Please try again.');
            }
          } catch (error) {
            alert('Failed to validate receipt. Please try again.');
            console.error('Validate receipt error:', error);
          }
        }
      });
    });
  }

  async function showReceiptModal(receipt?: Receipt) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const [products, modalWarehouses] = await Promise.all([
      store.getProducts(),
      store.getWarehouses(),
    ]);
    let items: Array<{ productId: string; quantity: number; unitPrice?: number }> = receipt?.items || [];

    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>${receipt ? 'Edit' : 'Create'} Receipt</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form id="receipt-form">
          <div class="form-group">
            <label>Supplier</label>
            <input type="text" id="receipt-supplier" value="${receipt?.supplier || ''}" required />
          </div>
          <div class="form-group">
            <label>Warehouse</label>
            <select id="receipt-warehouse" required>
              ${modalWarehouses.map((w) => `<option value="${w.id}" ${receipt?.warehouseId === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="receipt-status">
              <option value="draft" ${receipt?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="waiting" ${receipt?.status === 'waiting' ? 'selected' : ''}>Waiting</option>
              <option value="ready" ${receipt?.status === 'ready' ? 'selected' : ''}>Ready</option>
              <option value="done" ${receipt?.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
          <div class="form-group">
            <label>Scheduled Date (Optional)</label>
            <input type="date" id="receipt-scheduled-date" value="${receipt?.scheduledDate ? new Date(receipt.scheduledDate).toISOString().split('T')[0] : ''}" />
          </div>
          <div class="form-group">
            <label>Items</label>
            <div id="receipt-items">
              ${items.map((item, idx) => `
                <div class="item-row">
                  <select class="item-product" data-index="${idx}">
                    ${products.map((p) => `<option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                  </select>
                  <input type="number" class="item-quantity" value="${item.quantity}" data-index="${idx}" placeholder="Qty" />
                  <input type="number" class="item-price" value="${item.unitPrice || ''}" data-index="${idx}" placeholder="Price" step="0.01" />
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
      const itemsContainer = modal.querySelector('#receipt-items');
      const itemRow = document.createElement('div');
      itemRow.className = 'item-row';
      itemRow.innerHTML = `
        <select class="item-product" data-index="${itemIndex}">
          ${products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
        <input type="number" class="item-quantity" data-index="${itemIndex}" placeholder="Qty" />
        <input type="number" class="item-price" data-index="${itemIndex}" placeholder="Price" step="0.01" />
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
        const index = parseInt((btn as HTMLElement).dataset.index || '0');
        items = items.filter((_, i) => i !== index);
        (btn as HTMLElement).closest('.item-row')?.remove();
      });
    });

      const form = modal.querySelector('#receipt-form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const supplier = (modal.querySelector('#receipt-supplier') as HTMLInputElement).value;
      const warehouseId = (modal.querySelector('#receipt-warehouse') as HTMLSelectElement).value;
      const status = (modal.querySelector('#receipt-status') as HTMLSelectElement).value as any;
      const scheduledDateInput = (modal.querySelector('#receipt-scheduled-date') as HTMLInputElement).value;
      const scheduledDate = scheduledDateInput ? scheduledDateInput : undefined;

      const formItems: typeof items = [];
      modal.querySelectorAll('.item-row').forEach((row) => {
        const productId = (row.querySelector('.item-product') as HTMLSelectElement).value;
        const quantity = parseFloat((row.querySelector('.item-quantity') as HTMLInputElement).value);
        const unitPrice = parseFloat((row.querySelector('.item-price') as HTMLInputElement).value) || undefined;
        if (productId && quantity > 0) {
          formItems.push({ productId, quantity, unitPrice });
        }
      });

      // Validate that at least one item is added
      if (formItems.length === 0) {
        alert('Please add at least one item to the receipt.');
        return;
      }

      // Validate supplier
      if (!supplier || supplier.trim() === '') {
        alert('Please enter a supplier name.');
        return;
      }

      try {
        if (receipt) {
          // Update existing receipt
          await store.updateReceipt(receipt.id, {
            supplier,
            warehouseId,
            status,
            items: formItems,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          });
        } else {
          // Create new receipt
          await store.createReceipt({
            type: 'receipt',
            supplier,
            warehouseId,
            status,
            items: formItems,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          });
        }

        document.body.removeChild(modal);
        await renderReceipts();
      } catch (error: any) {
        // Show actual error message from backend
        let errorMessage = 'Failed to save receipt.';
        
        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
          errorMessage = 'Network error: Make sure the backend server is running on http://localhost:3001';
        }
        
        alert(`Failed to save receipt: ${errorMessage}`);
        console.error('Receipt save error:', error);
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
      <h1>Receipts</h1>
      <button class="btn btn-primary" id="add-receipt-btn">+ New Receipt</button>
    </div>
    <div id="receipts-list"></div>
  `;

  container.querySelector('#add-receipt-btn')?.addEventListener('click', async () => {
    await showReceiptModal();
  });

  await renderReceipts();

  return LayoutComponent(container);
  } catch (error) {
    container.innerHTML = '<div class="error">Error loading receipts</div>';
    return LayoutComponent(container);
  }
}

