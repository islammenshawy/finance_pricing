import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';

import loansRouter from './routes/loans';
import feeConfigsRouter from './routes/feeConfigs';
import currenciesRouter from './routes/currencies';
import customersRouter from './routes/customers';

const app = express();
const PORT = process.env.PORT || 4001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/loan_pricing';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build
// When running from dist/index.js, __dirname is server/dist
// When running with tsx, __dirname is server/src
const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Request logging (development)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/customers', customersRouter);
app.use('/api/loans', loansRouter);
app.use('/api/fee-configs', feeConfigsRouter);
app.use('/api/currencies', currenciesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Connect to MongoDB and start server
async function start() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Available routes:');
      console.log('  GET    /api/health');
      console.log('  GET    /api/loans');
      console.log('  GET    /api/loans/:id');
      console.log('  PUT    /api/loans/:id');
      console.log('  POST   /api/loans/:id/preview-pricing');
      console.log('  POST   /api/loans/:id/split');
      console.log('  GET    /api/loans/:id/audit');
      console.log('  POST   /api/loans/:id/fees');
      console.log('  PUT    /api/loans/:loanId/fees/:feeId');
      console.log('  DELETE /api/loans/:loanId/fees/:feeId');
      console.log('  GET    /api/fee-configs');
      console.log('  POST   /api/fee-configs');
      console.log('  PUT    /api/fee-configs/:id');
      console.log('  DELETE /api/fee-configs/:id');
      console.log('  GET    /api/currencies');
      console.log('  POST   /api/currencies');
      console.log('  GET    /api/currencies/rates');
      console.log('  POST   /api/currencies/rates');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

start();
