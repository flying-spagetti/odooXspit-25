import { api } from '../services/api';
import { store } from '../store/api-store';
import { router } from '../router';
import { LayoutComponent } from './Layout';

export async function StockComponent(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'stock-page';

  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [warehouses, products] = await Promise.all([
      store.getWarehouses(),
      store.getProducts(),
    ]);

    let currentFilters = {
      warehouseId: '',
      productId: '',
      category: '',
      lowStock: false,
      outOfStock: false,
    };

    async function renderStock() {
      const stockList = container.querySelector('#stock-list');
      if (!stockList) return;

      try {
        const filters: any = {};
        if (currentFilters.warehouseId) filters.warehouseId = currentFilters.warehouseId;
        if (currentFilters.productId) filters.productId = currentFilters.productId;
        if (currentFilters.category) filters.category = currentFilters.category;
        if (currentFilters.lowStock) filters.lowStock = 'true';
        if (currentFilters.outOfStock) filters.outOfStock = 'true';

        const response = await api.getAllStockWithFilters(filters);
        const stockData = response.data.data || [];

        if (stockData.length === 0) {
          stockList.innerHTML = '<div class="empty-state">No stock found matching the filters</div>';
          return;
        }

        stockList.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${stockData.map((stock: any) => {
                const statusClass = stock.stock_status === 'out_of_stock' 
                  ? 'status-out' 
                  : stock.stock_status === 'low_stock' 
                  ? 'status-low' 
                  : 'status-ok';
                const statusText = stock.stock_status === 'out_of_stock' 
                  ? 'Out of Stock' 
                  : stock.stock_status === 'low_stock' 
                  ? 'Low Stock' 
                  : 'In Stock';
                
                return `
                  <tr>
                    <td>${stock.product_name || 'N/A'}</td>
                    <td>${stock.sku || 'N/A'}</td>
                    <td>${stock.category || 'N/A'}</td>
                    <td>${stock.warehouse_name || 'N/A'}</td>
                    <td><strong>${stock.quantity || 0}</strong></td>
                    <td>${stock.reorder_level || 'N/A'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                      <a href="#" data-route="/adjustments" class="btn btn-sm btn-secondary">Adjust</a>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;

        // Navigation handlers for adjust buttons
        stockList.querySelectorAll('.btn-secondary').forEach((btn) => {
          btn.addEventListener('click', () => {
            router.navigate('/adjustments');
          });
        });
      } catch (error) {
        stockList.innerHTML = '<div class="error">Error loading stock data</div>';
        console.error('Error loading stock:', error);
      }
    }

    async function renderLowStockAlerts() {
      const alertsSection = container.querySelector('#low-stock-alerts');
      if (!alertsSection) return;

      try {
        const response = await api.getLowStockAlerts(currentFilters.warehouseId || undefined);
        const alerts = response.data.data || [];

        if (alerts.length === 0) {
          alertsSection.innerHTML = '<div class="empty-state">No low stock alerts</div>';
          return;
        }

        alertsSection.innerHTML = `
          <div class="alerts-list">
            ${alerts.map((alert: any) => {
              const alertClass = alert.alert_type === 'out_of_stock' ? 'alert-critical' : 'alert-warning';
              return `
                <div class="alert-item ${alertClass}">
                  <div class="alert-content">
                    <strong>${alert.product_name}</strong> (${alert.sku})
                    <br>
                    <small>${alert.warehouse_name} - Quantity: ${alert.quantity} / Reorder Level: ${alert.reorder_level}</small>
                  </div>
                  <div class="alert-actions">
                    <a href="#" data-route="/adjustments" class="btn btn-sm btn-primary">Adjust Stock</a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Navigation handlers for alert buttons
        alertsSection.querySelectorAll('.btn-primary').forEach((btn) => {
          btn.addEventListener('click', () => {
            router.navigate('/adjustments');
          });
        });
      } catch (error) {
        alertsSection.innerHTML = '<div class="error">Error loading alerts</div>';
        console.error('Error loading alerts:', error);
      }
    }

    // Get unique categories
    const categories = [...new Set(products.map(p => p.category))];

    container.innerHTML = `
      <div class="page-header">
        <h1>Stock Management</h1>
        <p class="page-subtitle">View current stock levels across all warehouses</p>
        <div class="header-actions">
          <a href="#" data-route="/history" class="btn btn-primary">View Stock Ledger</a>
          <a href="#" data-route="/adjustments" class="btn btn-secondary">Create Adjustment</a>
        </div>
      </div>

      <div class="filters-section">
        <div class="filter-group">
          <label>Warehouse</label>
          <select id="filter-warehouse">
            <option value="">All Warehouses</option>
            ${warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Product</label>
          <select id="filter-product">
            <option value="">All Products</option>
            ${products.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Category</label>
          <select id="filter-category">
            <option value="">All Categories</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>
            <input type="checkbox" id="filter-low-stock" />
            Low Stock Only
          </label>
        </div>
        <div class="filter-group">
          <label>
            <input type="checkbox" id="filter-out-stock" />
            Out of Stock Only
          </label>
        </div>
        <div class="filter-group">
          <button class="btn btn-secondary" id="apply-filters-btn">Apply Filters</button>
          <button class="btn btn-secondary" id="clear-filters-btn">Clear</button>
        </div>
      </div>

      <div class="stock-sections">
        <div class="section">
          <h2>Low Stock Alerts</h2>
          <div id="low-stock-alerts"></div>
        </div>

        <div class="section">
          <h2>Stock Levels</h2>
          <div id="stock-list"></div>
        </div>
      </div>
    `;

    // Filter handlers
    container.querySelector('#apply-filters-btn')?.addEventListener('click', async () => {
      currentFilters.warehouseId = (container.querySelector('#filter-warehouse') as HTMLSelectElement).value;
      currentFilters.productId = (container.querySelector('#filter-product') as HTMLSelectElement).value;
      currentFilters.category = (container.querySelector('#filter-category') as HTMLSelectElement).value;
      currentFilters.lowStock = (container.querySelector('#filter-low-stock') as HTMLInputElement).checked;
      currentFilters.outOfStock = (container.querySelector('#filter-out-stock') as HTMLInputElement).checked;
      await renderStock();
      await renderLowStockAlerts();
    });

    container.querySelector('#clear-filters-btn')?.addEventListener('click', async () => {
      currentFilters = {
        warehouseId: '',
        productId: '',
        category: '',
        lowStock: false,
        outOfStock: false,
      };
      (container.querySelector('#filter-warehouse') as HTMLSelectElement).value = '';
      (container.querySelector('#filter-product') as HTMLSelectElement).value = '';
      (container.querySelector('#filter-category') as HTMLSelectElement).value = '';
      (container.querySelector('#filter-low-stock') as HTMLInputElement).checked = false;
      (container.querySelector('#filter-out-stock') as HTMLInputElement).checked = false;
      await renderStock();
      await renderLowStockAlerts();
    });

    // Navigation handlers
    container.querySelectorAll('[data-route]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = (link as HTMLElement).dataset.route;
        if (route) {
          router.navigate(route);
        }
      });
    });

    // Initial render
    await renderStock();
    await renderLowStockAlerts();

    return LayoutComponent(container);
  } catch (error) {
    container.innerHTML = '<div class="error">Error loading stock management</div>';
    return LayoutComponent(container);
  }
}

