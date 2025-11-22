import { store } from '../store';
import { LayoutComponent } from './Layout';

export function HistoryComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'history-page';

  const history = store.getMoveHistory().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  container.innerHTML = `
    <div class="page-header">
      <h1>Move History / Stock Ledger</h1>
    </div>
    <div class="history-table">
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Product</th>
            <th>Warehouse</th>
            <th>Document Type</th>
            <th>Movement</th>
            <th>Quantity</th>
            <th>Before</th>
            <th>After</th>
          </tr>
        </thead>
        <tbody>
          ${history.map((entry) => {
            const product = store.getProduct(entry.productId);
            const warehouse = store.getWarehouse(entry.warehouseId);
            return `
              <tr>
                <td>${entry.timestamp.toLocaleString()}</td>
                <td>${product?.name || 'N/A'}</td>
                <td>${warehouse?.name || 'N/A'}</td>
                <td>${entry.documentType}</td>
                <td>
                  <span class="movement-badge movement-${entry.movementType}">
                    ${entry.movementType === 'in' ? '↑ In' : entry.movementType === 'out' ? '↓ Out' : '↔ Transfer'}
                  </span>
                </td>
                <td class="${entry.quantity >= 0 ? 'positive' : 'negative'}">${entry.quantity >= 0 ? '+' : ''}${entry.quantity}</td>
                <td>${entry.quantityBefore}</td>
                <td><strong>${entry.quantityAfter}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  return LayoutComponent(container);
}

