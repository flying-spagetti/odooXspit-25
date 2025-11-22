import { store } from '../store/api-store';
import { router } from '../router';
import { LayoutComponent } from './Layout';

export async function HistoryComponent(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'history-page';

  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [history, products, warehouses] = await Promise.all([
      store.getMoveHistory(),
      store.getProducts(),
      store.getWarehouses(),
    ]);

    const sortedHistory = history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    let filteredHistory = sortedHistory;
    let currentFilters = {
      productId: '',
      warehouseId: '',
      documentType: '',
    };

    function getDocumentLink(documentType: string, documentId: string): string {
      const routes: Record<string, string> = {
        receipt: '/receipts',
        delivery: '/deliveries',
        transfer: '/transfers',
        adjustment: '/adjustments',
      };
      return routes[documentType] || '#';
    }

    function renderLedger() {
      const ledgerTable = container.querySelector('#ledger-table');
      if (!ledgerTable) return;

      if (filteredHistory.length === 0) {
        ledgerTable.innerHTML = '<div class="empty-state">No stock movements found</div>';
        return;
      }

      ledgerTable.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th>Document</th>
              <th>Movement</th>
              <th>Quantity Change</th>
              <th>Stock Before</th>
              <th>Stock After</th>
            </tr>
          </thead>
          <tbody>
            ${filteredHistory.map((entry) => {
              const product = products.find(p => p.id === entry.productId);
              const warehouse = warehouses.find(w => w.id === entry.warehouseId);
              const docLink = entry.documentId ? getDocumentLink(entry.documentType, entry.documentId) : '#';
              const docTypeLabel = entry.documentType.charAt(0).toUpperCase() + entry.documentType.slice(1);
              
              return `
                <tr>
                  <td>${entry.timestamp.toLocaleString()}</td>
                  <td>${product?.name || 'N/A'}</td>
                  <td><small>${product?.sku || 'N/A'}</small></td>
                  <td>${warehouse?.name || 'N/A'}</td>
                  <td>
                    ${entry.documentId ? 
                      `<a href="#" data-route="${docLink}" class="document-link">${docTypeLabel} #${entry.documentId.substring(0, 8)}</a>` 
                      : '<span class="text-muted">N/A</span>'}
                  </td>
                  <td>
                    <span class="movement-badge movement-${entry.movementType}">
                      ${entry.movementType === 'in' ? '↑ In' : entry.movementType === 'out' ? '↓ Out' : '↔ Transfer'}
                    </span>
                  </td>
                  <td class="${entry.quantity >= 0 ? 'positive' : 'negative'}">
                    <strong>${entry.quantity >= 0 ? '+' : ''}${entry.quantity}</strong>
                  </td>
                  <td>${entry.quantityBefore}</td>
                  <td><strong class="stock-after">${entry.quantityAfter}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      // Add click handlers for document links
      ledgerTable.querySelectorAll('.document-link').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const route = (link as HTMLElement).dataset.route;
          if (route) {
            router.navigate(route);
          }
        });
      });
    }

    container.innerHTML = `
      <div class="page-header">
        <h1>Stock Ledger</h1>
        <p class="page-subtitle">Complete audit trail of all stock movements</p>
      </div>

      <div class="filters-section">
        <div class="filter-group">
          <label>Product</label>
          <select id="filter-product">
            <option value="">All Products</option>
            ${products.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Warehouse</label>
          <select id="filter-warehouse">
            <option value="">All Warehouses</option>
            ${warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Document Type</label>
          <select id="filter-document-type">
            <option value="">All Types</option>
            <option value="receipt">Receipts</option>
            <option value="delivery">Deliveries</option>
            <option value="transfer">Transfers</option>
            <option value="adjustment">Adjustments</option>
          </select>
        </div>
        <div class="filter-group">
          <button class="btn btn-secondary" id="apply-filters-btn">Apply Filters</button>
          <button class="btn btn-secondary" id="clear-filters-btn">Clear</button>
        </div>
      </div>

      <div class="ledger-summary">
        <div class="summary-item">
          <span class="summary-label">Total Movements:</span>
          <span class="summary-value">${filteredHistory.length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Receipts:</span>
          <span class="summary-value">${filteredHistory.filter(h => h.documentType === 'receipt').length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Deliveries:</span>
          <span class="summary-value">${filteredHistory.filter(h => h.documentType === 'delivery').length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Transfers:</span>
          <span class="summary-value">${filteredHistory.filter(h => h.documentType === 'transfer').length}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Adjustments:</span>
          <span class="summary-value">${filteredHistory.filter(h => h.documentType === 'adjustment').length}</span>
        </div>
      </div>

      <div id="ledger-table" class="history-table"></div>
    `;

    // Filter handlers
    container.querySelector('#apply-filters-btn')?.addEventListener('click', () => {
      currentFilters.productId = (container.querySelector('#filter-product') as HTMLSelectElement).value;
      currentFilters.warehouseId = (container.querySelector('#filter-warehouse') as HTMLSelectElement).value;
      currentFilters.documentType = (container.querySelector('#filter-document-type') as HTMLSelectElement).value;

      filteredHistory = sortedHistory.filter(entry => {
        if (currentFilters.productId && entry.productId !== currentFilters.productId) return false;
        if (currentFilters.warehouseId && entry.warehouseId !== currentFilters.warehouseId) return false;
        if (currentFilters.documentType && entry.documentType !== currentFilters.documentType) return false;
        return true;
      });

      renderLedger();
      // Update summary
      const summaryItems = container.querySelectorAll('.summary-item');
      if (summaryItems.length >= 5) {
        (summaryItems[0] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.length.toString();
        (summaryItems[1] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.filter(h => h.documentType === 'receipt').length.toString();
        (summaryItems[2] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.filter(h => h.documentType === 'delivery').length.toString();
        (summaryItems[3] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.filter(h => h.documentType === 'transfer').length.toString();
        (summaryItems[4] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.filter(h => h.documentType === 'adjustment').length.toString();
      }
    });

    container.querySelector('#clear-filters-btn')?.addEventListener('click', () => {
      currentFilters = { productId: '', warehouseId: '', documentType: '' };
      (container.querySelector('#filter-product') as HTMLSelectElement).value = '';
      (container.querySelector('#filter-warehouse') as HTMLSelectElement).value = '';
      (container.querySelector('#filter-document-type') as HTMLSelectElement).value = '';
      filteredHistory = sortedHistory;
      renderLedger();
      // Update summary
      const summaryItems = container.querySelectorAll('.summary-item');
      if (summaryItems.length >= 5) {
        (summaryItems[0] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.length.toString();
        (summaryItems[1] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.filter(h => h.documentType === 'receipt').length.toString();
        (summaryItems[2] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.filter(h => h.documentType === 'delivery').length.toString();
        (summaryItems[3] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.filter(h => h.documentType === 'transfer').length.toString();
        (summaryItems[4] as HTMLElement).querySelector('.summary-value')!.textContent = filteredHistory.filter(h => h.documentType === 'adjustment').length.toString();
      }
    });

    renderLedger();

    return LayoutComponent(container);
  } catch (error) {
    container.innerHTML = '<div class="error">Error loading stock ledger</div>';
    return LayoutComponent(container);
  }
}

