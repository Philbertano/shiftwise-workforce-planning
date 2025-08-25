// Main application entry point

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { DatabaseManager } from './database/config';
import { apiRoutes } from './api/routes/index';
import { runMigrations } from './database/migrate';
import { initializePlanningWebSocket } from './api/routes/planning-websocket';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ShiftWise Workforce Planning API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    },
    timestamp: new Date()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    },
    timestamp: new Date()
  });
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  try {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.close();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Run database migrations
    console.log('Running database migrations...');
    await runMigrations();
    
    // Connect to database
    console.log('Connecting to database...');
    const dbManager = DatabaseManager.getInstance();
    await dbManager.connect();
    console.log('Database connected successfully');
    
    // Initialize WebSocket server
    console.log('Initializing WebSocket server...');
    const wsManager = initializePlanningWebSocket(server);
    console.log('WebSocket server initialized');
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`ShiftWise API server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${dbManager.getConfig().type}`);
      console.log(`WebSocket server available at ws://localhost:${PORT}/api/planning/ws`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export app for testing
export { app };

// Start the application only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}