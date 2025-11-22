<<<<<<< HEAD
import { store } from '../store/api-store';
=======
import { store } from '../store';
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
import { LayoutComponent } from './Layout';
import type { StockAdjustment } from '../types';

export function AdjustmentsComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'adjustments-page';

  function renderAdjustments() {
    const adjustmentsList = container.querySelector('#adjustments-list');
    if (!adjustmentsList) return;

    const adjustments = store.getAdjustments();
    adjustmentsList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Warehouse</th>
            <th>Reason</th>
            <th>Items</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${adjustments.map((adjustment) => `
            <tr>
              <td>${adjustment.id.substring(0, 8)}</td>
              <td>${store.getWarehouse(adjustment.warehouseId)?.name || 'N/A'}</td>
              <td>${adjustment.reason}</td>
              <td>${adjustment.items.length} items</td>
              <td><span class="status-badge status-${adjustment.status}">${adjustment.status}</span></td>
              <td>${adjustment.createdAt.toLocaleDateString()}</td>
              <td>
                <button class="btn btn-sm btn-view" data-adjustment-id="${adjustment.id}">View</button>
                ${adjustment.status !== 'done' && adjustment.status !== 'canceled' ? `
                  <button class="btn btn-sm btn-validate" data-adjustment-id="${adjustment.id}">Validate</button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.btn-validate').forEach((btn) => {
      btn.addEventListener('click', () => {
        const adjustmentId = (btn as HTMLElement).dataset.adjustmentId;
        if (adjustmentId) {
          const adjustment = adjustments.find((a) => a.id === adjustmentId);
          if (adjustment) {
            adjustment.status = 'done';
            store.createAdjustment(adjustment);
            renderAdjustments();
          }
        }
      });
    });
  }

  function showAdjustmentModal(adjustment?: StockAdjustment) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const products = store.getProducts();
    const warehouses = store.getWarehouses();
    let items: Array<{ productId: string; countedQuantity: number; recordedQuantity: number; difference: number }> = adjustment?.items || [];

    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>${adjustment ? 'Edit' : 'Create'} Stock Adjustment</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form id="adjustment-form">
          <div class="form-group">
            <label>Warehouse</label>
            <select id="adjustment-warehouse" required>
              ${warehouses.map((w) => `<option value="${w.id}" ${adjustment?.warehouseId === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Reason</label>
            <input type="text" id="adjustment-reason" value="${adjustment?.reason || ''}" required />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="adjustment-status">
              <option value="draft" ${adjustment?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="waiting" ${adjustment?.status === 'waiting' ? 'selected' : ''}>Waiting</option>
              <option value="ready" ${adjustment?.status === 'ready' ? 'selected' : ''}>Ready</option>
              <option value="done" ${adjustment?.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
          <div class="form-group">
            <label>Items</label>
            <div id="adjustment-items">
              ${items.map((item, idx) => {
                const product = store.getProduct(item.productId);
                const recordedQty = item.recordedQuantity || store.getProductStock(item.productId, adjustment?.warehouseId || warehouses[0].id);
                return `
                  <div class="item-row">
                    <select class="item-product" data-index="${idx}">
                      ${products.map((p) => `<option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                    <input type="number" class="item-recorded" value="${recordedQty}" data-index="${idx}" placeholder="Recorded" readonly />
                    <input type="number" class="item-counted" value="${item.countedQuantity}" data-index="${idx}" placeholder="Counted" />
                    <span class="item-difference" data-index="${idx}">${item.countedQuantity - recordedQty}</span>
                    <button type="button" class="btn btn-sm btn-remove-item" data-index="${idx}">Remove</button>
                  </div>
                `;
              }).join('')}
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

    // Update difference when counted quantity changes
    modal.querySelectorAll('.item-counted').forEach((input) => {
      input.addEventListener('input', () => {
        const index = parseInt((input as HTMLElement).dataset.index || '0');
        const row = (input as HTMLElement).closest('.item-row');
        const recorded = parseFloat((row?.querySelector('.item-recorded') as HTMLInputElement).value || '0');
        const counted = parseFloat((input as HTMLInputElement).value || '0');
        const differenceEl = row?.querySelector('.item-difference');
        if (differenceEl) {
          differenceEl.textContent = (counted - recorded).toString();
        }
      });
    });

    let itemIndex = items.length;
    const addItemBtn = modal.querySelector('#add-item-btn');
    addItemBtn?.addEventListener('click', () => {
      const itemsContainer = modal.querySelector('#adjustment-items');
      const warehouseId = (modal.querySelector('#adjustment-warehouse') as HTMLSelectElement).value;
      const itemRow = document.createElement('div');
      itemRow.className = 'item-row';
      itemRow.innerHTML = `
        <select class="item-product" data-index="${itemIndex}">
          ${products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
        <input type="number" class="item-recorded" data-index="${itemIndex}" placeholder="Recorded" readonly />
        <input type="number" class="item-counted" data-index="${itemIndex}" placeholder="Counted" />
        <span class="item-difference" data-index="${itemIndex}">0</span>
        <button type="button" class="btn btn-sm btn-remove-item" data-index="${itemIndex}">Remove</button>
      `;
      itemsContainer?.appendChild(itemRow);
      
      // Set recorded quantity when product is selected
      const productSelect = itemRow.querySelector('.item-product') as HTMLSelectElement;
      productSelect.addEventListener('change', () => {
        const productId = productSelect.value;
        const recordedQty = store.getProductStock(productId, warehouseId);
        (itemRow.querySelector('.item-recorded') as HTMLInputElement).value = recordedQty.toString();
      });

      // Update difference when counted changes
      const countedInput = itemRow.querySelector('.item-counted') as HTMLInputElement;
      countedInput.addEventListener('input', () => {
        const recorded = parseFloat((itemRow.querySelector('.item-recorded') as HTMLInputElement).value || '0');
        const counted = parseFloat(countedInput.value || '0');
        (itemRow.querySelector('.item-difference') as HTMLElement).textContent = (counted - recorded).toString();
      });

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

    const form = modal.querySelector('#adjustment-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const warehouseId = (modal.querySelector('#adjustment-warehouse') as HTMLSelectElement).value;
      const reason = (modal.querySelector('#adjustment-reason') as HTMLInputElement).value;
      const status = (modal.querySelector('#adjustment-status') as HTMLSelectElement).value as any;

      const formItems: typeof items = [];
      modal.querySelectorAll('.item-row').forEach((row) => {
        const productId = (row.querySelector('.item-product') as HTMLSelectElement).value;
        const recordedQty = parseFloat((row.querySelector('.item-recorded') as HTMLInputElement).value || '0');
        const countedQty = parseFloat((row.querySelector('.item-counted') as HTMLInputElement).value || '0');
        if (productId && countedQty >= 0) {
          formItems.push({
            productId,
            countedQuantity: countedQty,
            recordedQuantity: recordedQty,
            difference: countedQty - recordedQty,
          });
        }
      });

      if (adjustment) {
        adjustment.warehouseId = warehouseId;
        adjustment.reason = reason;
        adjustment.status = status;
        adjustment.items = formItems;
        store.createAdjustment(adjustment);
      } else {
        store.createAdjustment({
          type: 'adjustment',
          warehouseId,
          reason,
          status,
          items: formItems,
        });
      }

      document.body.removeChild(modal);
      renderAdjustments();
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
      <h1>Stock Adjustments</h1>
      <button class="btn btn-primary" id="add-adjustment-btn">+ New Adjustment</button>
    </div>
    <div id="adjustments-list"></div>
  `;

  container.querySelector('#add-adjustment-btn')?.addEventListener('click', () => {
    showAdjustmentModal();
  });

  renderAdjustments();

  return LayoutComponent(container);
}

