import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import productsRoutes from './routes/products.routes.js';
import warehousesRoutes from './routes/warehouses.routes.js';
import receiptsRoutes from './routes/receipts.routes.js';
import deliveriesRoutes from './routes/deliveries.routes.js';
import transfersRoutes from './routes/transfers.routes.js';
import adjustmentsRoutes from './routes/adjustments.routes.js';
import historyRoutes from './routes/history.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import stockRoutes from './routes/stock.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/adjustments', adjustmentsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stock', stockRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StockMaster API is running' });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

