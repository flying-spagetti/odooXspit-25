import { store } from '../store';
import { LayoutComponent } from './Layout';

export function DashboardComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dashboard';

  const kpis = store.getDashboardKPIs();
  const receipts = store.getReceipts();
  const deliveries = store.getDeliveries();
  const transfers = store.getTransfers();

  // Get recent documents
  const allDocuments = [
    ...receipts.map((r) => ({ ...r, docType: 'receipt' as const })),
    ...deliveries.map((d) => ({ ...d, docType: 'delivery' as const })),
    ...transfers.map((t) => ({ ...t, docType: 'transfer' as const })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10);

  container.innerHTML = `
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <div class="dashboard-filters">
        <select id="filter-type" class="filter-select">
          <option value="">All Types</option>
          <option value="receipt">Receipts</option>
          <option value="delivery">Deliveries</option>
          <option value="transfer">Transfers</option>
          <option value="adjustment">Adjustments</option>
        </select>
        <select id="filter-status" class="filter-select">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="waiting">Waiting</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>
        <select id="filter-warehouse" class="filter-select">
          <option value="">All Warehouses</option>
        </select>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon">📦</div>
        <div class="kpi-content">
          <div class="kpi-label">Total Products</div>
          <div class="kpi-value">${kpis.totalProducts}</div>
        </div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-icon">⚠️</div>
        <div class="kpi-content">
          <div class="kpi-label">Low Stock Items</div>
          <div class="kpi-value">${kpis.lowStockItems}</div>
        </div>
      </div>
      <div class="kpi-card danger">
        <div class="kpi-icon">🚫</div>
        <div class="kpi-content">
          <div class="kpi-label">Out of Stock</div>
          <div class="kpi-value">${kpis.outOfStockItems}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📥</div>
        <div class="kpi-content">
          <div class="kpi-label">Pending Receipts</div>
          <div class="kpi-value">${kpis.pendingReceipts}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📤</div>
        <div class="kpi-content">
          <div class="kpi-label">Pending Deliveries</div>
          <div class="kpi-value">${kpis.pendingDeliveries}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">🔄</div>
        <div class="kpi-content">
          <div class="kpi-label">Scheduled Transfers</div>
          <div class="kpi-value">${kpis.scheduledTransfers}</div>
        </div>
      </div>
    </div>

    <div class="dashboard-section">
      <h2>Recent Documents</h2>
      <div class="documents-table">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Status</th>
              <th>Warehouse</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${allDocuments.map((doc) => `
              <tr>
                <td>${doc.docType}</td>
                <td><span class="status-badge status-${doc.status}">${doc.status}</span></td>
                <td>${store.getWarehouse(doc.warehouseId)?.name || 'N/A'}</td>
                <td>${doc.createdAt.toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Populate warehouse filter
  const warehouseFilter = container.querySelector('#filter-warehouse') as HTMLSelectElement;
  store.getWarehouses().forEach((warehouse) => {
    const option = document.createElement('option');
    option.value = warehouse.id;
    option.textContent = warehouse.name;
    warehouseFilter.appendChild(option);
  });

  return LayoutComponent(container);
}

