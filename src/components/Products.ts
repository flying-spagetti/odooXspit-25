<<<<<<< HEAD
import { store } from '../store/api-store';
import { LayoutComponent } from './Layout';
import type { Product } from '../types';

export async function ProductsComponent(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'products-page';

  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [products, warehouses] = await Promise.all([
      store.getProducts(),
      store.getWarehouses(),
    ]);

  async function renderProducts() {
    const productsList = container.querySelector('#products-list');
    if (!productsList) return;

    // Build table rows with async stock data
    const tableRows = await Promise.all(
      products.map(async (product) => {
        // Get stock for each warehouse
        const stockData = await Promise.all(
          warehouses.map(async (w) => {
            const stock = await store.getProductStock(product.id, w.id);
            return { warehouseId: w.id, stock };
          })
        );

        const totalStock = stockData.reduce((sum, item) => sum + item.stock, 0);
        const stockCells = stockData.map(item => `<td>${item.stock}</td>`).join('');

        return `
          <tr>
            <td>${product.name}</td>
            <td>${product.sku}</td>
            <td>${product.category}</td>
            <td>${product.unitOfMeasure}</td>
            ${stockCells}
            <td><strong>${totalStock}</strong></td>
            <td>
              <button class="btn btn-sm btn-edit" data-product-id="${product.id}">Edit</button>
              <button class="btn btn-sm btn-delete" data-product-id="${product.id}">Delete</button>
            </td>
          </tr>
        `;
      })
    );

=======
import { store } from '../store';
import { LayoutComponent } from './Layout';
import type { Product } from '../types';

export function ProductsComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'products-page';

  const products = store.getProducts();
  const warehouses = store.getWarehouses();

  function renderProducts() {
    const productsList = container.querySelector('#products-list');
    if (!productsList) return;

>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
    productsList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Unit</th>
            ${warehouses.map((w) => `<th>${w.name}</th>`).join('')}
            <th>Total Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
<<<<<<< HEAD
          ${tableRows.join('')}
=======
          ${products.map((product) => {
            const totalStock = warehouses.reduce((sum, w) => {
              return sum + store.getProductStock(product.id, w.id);
            }, 0);
            return `
              <tr>
                <td>${product.name}</td>
                <td>${product.sku}</td>
                <td>${product.category}</td>
                <td>${product.unitOfMeasure}</td>
                ${warehouses.map((w) => {
                  const stock = store.getProductStock(product.id, w.id);
                  return `<td>${stock}</td>`;
                }).join('')}
                <td><strong>${totalStock}</strong></td>
                <td>
                  <button class="btn btn-sm btn-edit" data-product-id="${product.id}">Edit</button>
                  <button class="btn btn-sm btn-delete" data-product-id="${product.id}">Delete</button>
                </td>
              </tr>
            `;
          }).join('')}
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
        </tbody>
      </table>
    `;

    // Edit handlers
    container.querySelectorAll('.btn-edit').forEach((btn) => {
<<<<<<< HEAD
      btn.addEventListener('click', async () => {
        const productId = (btn as HTMLElement).dataset.productId;
        if (productId) {
          const product = await store.getProduct(productId);
          if (product) showProductModal(product);
        }
      });
    });

    // Delete handlers
    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const productId = (btn as HTMLElement).dataset.productId;
        if (productId && confirm('Are you sure you want to delete this product?')) {
          try {
            await store.deleteProduct?.(productId);
            await renderProducts();
          } catch (error) {
            alert('Failed to delete product');
          }
        }
=======
      btn.addEventListener('click', () => {
        const productId = (btn as HTMLElement).dataset.productId;
        if (productId) showProductModal(store.getProduct(productId));
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
      });
    });
  }

  function showProductModal(product?: Product) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${product ? 'Edit' : 'Create'} Product</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form id="product-form">
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="product-name" value="${product?.name || ''}" required />
          </div>
          <div class="form-group">
            <label>SKU</label>
            <input type="text" id="product-sku" value="${product?.sku || ''}" required />
          </div>
          <div class="form-group">
            <label>Category</label>
            <input type="text" id="product-category" value="${product?.category || ''}" required />
          </div>
          <div class="form-group">
            <label>Unit of Measure</label>
            <input type="text" id="product-unit" value="${product?.unitOfMeasure || ''}" required />
          </div>
          <div class="form-group">
            <label>Reorder Level</label>
            <input type="number" id="product-reorder-level" value="${product?.reorderLevel || ''}" />
          </div>
          <div class="form-group">
            <label>Reorder Quantity</label>
            <input type="number" id="product-reorder-qty" value="${product?.reorderQuantity || ''}" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#product-form') as HTMLFormElement;
<<<<<<< HEAD
    form.addEventListener('submit', async (e) => {
=======
    form.addEventListener('submit', (e) => {
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
      e.preventDefault();
      const name = (modal.querySelector('#product-name') as HTMLInputElement).value;
      const sku = (modal.querySelector('#product-sku') as HTMLInputElement).value;
      const category = (modal.querySelector('#product-category') as HTMLInputElement).value;
      const unit = (modal.querySelector('#product-unit') as HTMLInputElement).value;
      const reorderLevel = parseInt((modal.querySelector('#product-reorder-level') as HTMLInputElement).value) || undefined;
      const reorderQuantity = parseInt((modal.querySelector('#product-reorder-qty') as HTMLInputElement).value) || undefined;

<<<<<<< HEAD
      try {
        if (product) {
          await store.updateProduct(product.id, { name, sku, category, unitOfMeasure: unit, reorderLevel, reorderQuantity });
        } else {
          await store.createProduct({ name, sku, category, unitOfMeasure: unit, reorderLevel, reorderQuantity });
        }
        document.body.removeChild(modal);
        await renderProducts();
      } catch (error) {
        alert('Failed to save product');
      }
=======
      if (product) {
        store.updateProduct(product.id, { name, sku, category, unitOfMeasure: unit, reorderLevel, reorderQuantity });
      } else {
        store.createProduct({ name, sku, category, unitOfMeasure: unit, reorderLevel, reorderQuantity });
      }

      document.body.removeChild(modal);
      renderProducts();
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
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
      <h1>Products</h1>
      <button class="btn btn-primary" id="add-product-btn">+ Add Product</button>
    </div>
    <div id="products-list"></div>
  `;

  container.querySelector('#add-product-btn')?.addEventListener('click', () => {
    showProductModal();
  });

<<<<<<< HEAD
  await renderProducts();

  return LayoutComponent(container);
  } catch (error) {
    container.innerHTML = '<div class="error">Error loading products</div>';
    return LayoutComponent(container);
  }
=======
  renderProducts();

  return LayoutComponent(container);
>>>>>>> 0f5c4b4644f516bf6b6d81e23e64491783026e0d
}

