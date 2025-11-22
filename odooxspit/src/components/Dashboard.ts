import { store } from '../store/api-store';
import { router } from '../router';
import { LayoutComponent } from './Layout';

export async function DashboardComponent(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'dashboard';

  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [kpis, dashboardData] = await Promise.all([
      store.getDashboardKPIs().catch(err => {
        console.error('Error fetching KPIs:', err);
        return {
          totalProducts: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          pendingReceipts: 0,
          pendingDeliveries: 0,
          scheduledTransfers: 0,
        };
      }),
      store.getDashboardData().catch(err => {
        console.error('Error fetching dashboard data:', err);
        return {
          receipts: { toReceive: 0, late: 0, operations: 0, waiting: 0, items: [], topProducts: [] },
          deliveries: { toDeliver: 0, late: 0, operations: 0, waiting: 0, items: [] },
        };
      }),
    ]);

    const receipts = dashboardData.receipts || { toReceive: 0, late: 0, operations: 0, waiting: 0, items: [], topProducts: [] };
    const deliveries = dashboardData.deliveries || { toDeliver: 0, late: 0, operations: 0, waiting: 0, items: [] };

    // Get product names for highlighting (use topProducts if available, otherwise extract from items)
    const receiptProductNames = receipts.topProducts && receipts.topProducts.length > 0
      ? receipts.topProducts.slice(0, 2)
      : receipts.items
          .flatMap((r: any) => r.items || [])
          .map((item: any) => item.productName)
          .filter((name: string, index: number, arr: string[]) => name && arr.indexOf(name) === index)
          .slice(0, 2);

    container.innerHTML = `
      <div class="dashboard-header">
        <h1>Dashboard</h1>
      </div>

      <div class="dashboard-cards">
        <!-- Receipt Card -->
        <div class="dashboard-card receipt-card">
          <div class="card-header">
            <h2>Receipt</h2>
            <div class="card-count">${receipts.toReceive} to receive</div>
          </div>
          <div class="card-stats">
            <div class="stat-item">
              <span class="stat-label">Late:</span>
              <span class="stat-value late">${receipts.late}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Operations:</span>
              <span class="stat-value">${receipts.operations}</span>
            </div>
          </div>
          <div class="card-products">
            ${receiptProductNames.map((name: string, index: number) => {
              const highlightClass = index === 0 ? 'highlight-blue' : 'highlight-green';
              return `<div class="product-tag ${highlightClass}">${name}</div>`;
            }).join('')}
            ${receipts.items.length > 0 ? `<div class="operations-count">${receipts.items.length} operations</div>` : ''}
          </div>
        </div>

        <!-- Delivery Card -->
        <div class="dashboard-card delivery-card">
          <div class="card-header">
            <h2>Delivery</h2>
            <div class="card-count">${deliveries.toDeliver} to Deliver</div>
          </div>
          <div class="card-stats">
            <div class="stat-item">
              <span class="stat-label">Late:</span>
              <span class="stat-value late">${deliveries.late}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Waiting:</span>
              <span class="stat-value waiting">${deliveries.waiting}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Operations:</span>
              <span class="stat-value">${deliveries.operations}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- KPIs Grid -->
      <div class="kpi-grid">
        <a href="#" data-route="/products" class="kpi-card kpi-link">
          <div class="kpi-icon">📦</div>
          <div class="kpi-content">
            <div class="kpi-label">Total Products</div>
            <div class="kpi-value">${kpis.totalProducts}</div>
          </div>
        </a>
        <a href="#" data-route="/products" class="kpi-card warning kpi-link">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-content">
            <div class="kpi-label">Low Stock Items</div>
            <div class="kpi-value">${kpis.lowStockItems}</div>
          </div>
        </a>
        <a href="#" data-route="/products" class="kpi-card danger kpi-link">
          <div class="kpi-icon">🚫</div>
          <div class="kpi-content">
            <div class="kpi-label">Out of Stock</div>
            <div class="kpi-value">${kpis.outOfStockItems}</div>
          </div>
        </a>
        <a href="#" data-route="/receipts" class="kpi-card kpi-link">
          <div class="kpi-icon">📥</div>
          <div class="kpi-content">
            <div class="kpi-label">Pending Receipts</div>
            <div class="kpi-value">${kpis.pendingReceipts}</div>
          </div>
        </a>
        <a href="#" data-route="/deliveries" class="kpi-card kpi-link">
          <div class="kpi-icon">📤</div>
          <div class="kpi-content">
            <div class="kpi-label">Pending Deliveries</div>
            <div class="kpi-value">${kpis.pendingDeliveries}</div>
          </div>
        </a>
        <a href="#" data-route="/transfers" class="kpi-card kpi-link">
          <div class="kpi-icon">🔄</div>
          <div class="kpi-content">
            <div class="kpi-label">Scheduled Transfers</div>
            <div class="kpi-value">${kpis.scheduledTransfers}</div>
          </div>
        </a>
      </div>
    `;

    // Add navigation handlers
    container.querySelectorAll('[data-route]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = (link as HTMLElement).dataset.route;
        if (route) {
          router.navigate(route);
        }
      });
    });

    return LayoutComponent(container);
  } catch (error) {
    console.error('Dashboard error:', error);
    container.innerHTML = `
      <div class="error">
        <h2>Error loading dashboard</h2>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin-top: 1rem;">
          Make sure the database migration has been run to add scheduled_date columns.
        </p>
      </div>
    `;
    return LayoutComponent(container);
  }
}
