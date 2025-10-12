const express = require('express');
const cors = require('cors');
require('dotenv').config();

const vehicleRoutes = require('./routes/vehicleRoutes');
const { testConnection } = require('./config/elasticsearch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1', vehicleRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'autos-backend',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'AUTOS Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      vehicles: '/api/v1/manufacturer-model-combinations'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server with Elasticsearch connection test
async function startServer() {
  try {
    // Test Elasticsearch connection
    await testConnection();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`AUTOS Backend API listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API endpoint: http://localhost:${PORT}/api/v1/manufacturer-model-combinations`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
