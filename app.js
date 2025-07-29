/**
 * Main Application Entry Point
 * 
 * This is the core Express.js application that handles:
 * - Database connections (MongoDB)
 * - Middleware setup (CORS, JSON parsing, security)
 * - Route mounting (submissions API)
 * - Error handling and logging
 * - Health checks and monitoring
 * - Server startup and graceful shutdown
 * 
 * The app is designed to receive form submissions from various sources:
 * - n8n workflows (primary use case)
 * - Direct API calls
 * - Frontend applications
 * - Third-party integrations
 * 
 * HOSTING: Optimized for Render.com deployment
 * - Automatic port detection from Render
 * - Health checks for Render's load balancer
 * - Proper CORS setup for Render URLs
 * - Production logging optimized for Render's logs
 * 
 * Environment Variables Required:
 * - MONGO_URI: MongoDB connection string (set in Render dashboard)
 * - PORT: Server port (automatically set by Render)
 * - NODE_ENV: Environment (automatically set to 'production' by Render)
 * - RENDER_EXTERNAL_URL: Your Render app URL (optional, for CORS)
 */

// ========================================
// CORE DEPENDENCIES
// Import required packages and modules
// ========================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file

// ========================================
// CREATE EXPRESS APPLICATION
// Initialize the main Express app instance
// ========================================

const app = express();
console.log('🚀 Starting application...');

// ========================================
// ENVIRONMENT CONFIGURATION
// Set up environment-specific settings for Render deployment
// ========================================

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000; // Render automatically sets this
const MONGO_URI = process.env.MONGO_URI;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL; // Your Render app URL

console.log(`📋 Environment: ${NODE_ENV}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🗄️  MongoDB URI: ${MONGO_URI ? 'Configured' : 'Missing!'}`);
console.log(`🌐 Render URL: ${RENDER_EXTERNAL_URL || 'Not set'}`);

// Validate required environment variables
if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is required');
  console.error('💡 Set this in your Render dashboard under Environment Variables');
  process.exit(1); // Exit if critical config is missing
}

// ========================================
// MIDDLEWARE SETUP
// Configure Express middleware in correct order
// ========================================

/**
 * CORS (Cross-Origin Resource Sharing)
 * Allows frontend applications to make requests to this API
 * Optimized for Render hosting with proper domain configuration
 */
if (NODE_ENV === 'production') {
  // Production: Configure CORS for Render deployment
  const allowedOrigins = [
    'https://yourdomain.com',           // Your production frontend
    'https://app.yourdomain.com',       // Your app subdomain
    'https://n8n.yourdomain.com'        // Your n8n instance
  ];
  
  // Add Render URL if available
  if (RENDER_EXTERNAL_URL) {
    allowedOrigins.push(RENDER_EXTERNAL_URL);
    console.log(`🔗 Added Render URL to CORS: ${RENDER_EXTERNAL_URL}`);
  }
  
  const corsOptions = {
    origin: allowedOrigins,
    credentials: true,                     // Allow cookies/auth headers
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };
  
  app.use(cors(corsOptions));
  console.log('🔒 CORS configured for production with restricted origins');
  console.log('🔒 Allowed origins:', allowedOrigins);
} else {
  // Development: Allow all origins for easier testing
  app.use(cors());
  console.log('🔓 CORS configured for development (all origins allowed)');
}

/**
 * JSON Body Parser
 * Parse incoming JSON requests (from n8n, forms, etc.)
 * Set size limit to handle large form submissions
 */
app.use(express.json({ 
  limit: '10mb',        // Allow larger payloads for submissions with long messages
  strict: true          // Only parse objects and arrays
}));

/**
 * URL-encoded Body Parser
 * Handle form submissions and URL-encoded data
 */
app.use(express.urlencoded({ 
  extended: true,       // Use rich objects and arrays
  limit: '10mb'
}));

console.log('📦 Middleware configured: CORS, JSON parser, URL-encoded parser');

// ========================================
// REQUEST LOGGING MIDDLEWARE
// Log all incoming requests for debugging and monitoring
// ========================================

/**
 * Custom request logger
 * Logs method, URL, IP, and timestamp for each request
 * More detailed in development, concise in production
 */
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  
  if (NODE_ENV === 'development') {
    // Detailed logging for development
    console.log(`📥 ${timestamp} | ${method} ${url} | IP: ${ip}`);
    
    // Log request body for POST/PUT/PATCH (but limit size)
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      const bodyStr = JSON.stringify(req.body);
      const truncatedBody = bodyStr.length > 200 ? bodyStr.substring(0, 200) + '...' : bodyStr;
      console.log(`📄 Request body: ${truncatedBody}`);
    }
  } else {
    // Concise logging for production
    console.log(`${method} ${url} - ${ip}`);
  }
  
  next();
});

// ========================================
// MONGODB CONNECTION
// Connect to MongoDB with proper error handling and options
// ========================================

/**
 * MongoDB Connection Configuration
 * Optimized for Render's network and MongoDB Atlas
 */
const mongoOptions = {
  useNewUrlParser: true,       // Use new URL parser
  useUnifiedTopology: true,    // Use new connection management engine
  maxPoolSize: 10,             // Maximum number of connections in pool
  serverSelectionTimeoutMS: 10000,  // Increased for Render's network
  socketTimeoutMS: 45000,      // How long to wait for a response
  family: 4,                   // Use IPv4, skip IPv6
  retryWrites: true,           // Retry writes on network errors
  w: 'majority'                // Wait for majority of replica set
};

/**
 * Connect to MongoDB with retry logic
 */
console.log('🔄 Attempting to connect to MongoDB...');

mongoose.connect(MONGO_URI, mongoOptions)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`🏢 Database: ${mongoose.connection.name}`);
    console.log(`🖥️  Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    
    // In production, you might want to retry or alert monitoring systems
    if (NODE_ENV === 'production') {
      console.error('🚨 Critical: Database connection failed in production');
      // Could send alert to monitoring service here
    }
    
    // Exit process if we can't connect to database
    process.exit(1);
  });

/**
 * MongoDB Event Listeners
 * Monitor connection status for debugging and alerts
 */
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

// ========================================
// API ROUTES
// Mount all route handlers with their base paths
// ========================================

/**
 * Main Submissions API
 * All submission-related endpoints are under /api/submissions
 * This includes CRUD operations, filtering, analytics, etc.
 */
app.use('/api/submissions', require('./routes/submissions'));
console.log('🛣️  Routes mounted: /api/submissions');

/**
 * Future API routes can be added here:
 * app.use('/api/users', require('./routes/users'));
 * app.use('/api/analytics', require('./routes/analytics'));
 * app.use('/api/webhooks', require('./routes/webhooks'));
 */

// ========================================
// HEALTH CHECK ENDPOINTS
// Provide endpoints for monitoring and load balancer health checks
// ========================================

/**
 * Basic Health Check
 * Optimized for Render's health check system
 * Render pings this endpoint to ensure your service is running
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    platform: 'render',
    service: 'submission-api'
  });
});

/**
 * Detailed Health Check
 * Returns comprehensive system status including database connection
 */
app.get('/health/detailed', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get basic database stats
    let dbStats = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const Submission = require('./models/Submission');
        const totalSubmissions = await Submission.countDocuments();
        dbStats = { totalSubmissions };
      } catch (dbError) {
        console.error('Error getting DB stats:', dbError);
      }
    }
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: dbStatus,
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        stats: dbStats
      },
      version: process.version,
      platform: process.platform
    };
    
    res.status(200).json(healthData);
    
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Simple Status Endpoint
 * Minimal response for quick checks
 */
app.get('/status', (req, res) => {
  res.send('Backend is live ✅');
});

console.log('💚 Health check endpoints configured: /health, /health/detailed, /status');

// ========================================
// ROOT ENDPOINT
// Provide API information at the root path
// ========================================

/**
 * API Root Information
 * Returns API documentation and available endpoints
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Submission Management API',
    version: '1.0.0',
    description: 'API for managing form submissions from various sources',
    environment: NODE_ENV,
    endpoints: {
      submissions: '/api/submissions',
      health: '/health',
      detailedHealth: '/health/detailed',
      status: '/status'
    },
    documentation: {
      submissions: {
        'GET /api/submissions': 'Get all submissions with filtering',
        'POST /api/submissions': 'Create new submission',
        'GET /api/submissions/:id': 'Get specific submission',
        'PUT /api/submissions/:id': 'Update submission',
        'DELETE /api/submissions/:id': 'Delete submission',
        'GET /api/submissions/stats/dashboard': 'Get dashboard statistics'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ========================================
// 404 HANDLER
// Handle requests to non-existent endpoints
// ========================================

/**
 * Catch-all for undefined routes
 * Returns helpful 404 message with available endpoints
 */
app.use('*', (req, res) => {
  console.log(`⚠️  404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /health/detailed',
      'GET /status',
      'GET /api/submissions',
      'POST /api/submissions'
    ],
    timestamp: new Date().toISOString()
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// Handle any unhandled errors in the application
// ========================================

/**
 * Global Error Handler
 * Catches any errors that weren't handled by route handlers
 */
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled error:', error);
  
  // Don't leak error details in production
  const errorResponse = {
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  };
  
  // Include more details in development
  if (NODE_ENV === 'development') {
    errorResponse.error = error.message;
    errorResponse.stack = error.stack;
  }
  
  res.status(500).json(errorResponse);
});

// ========================================
// SERVER STARTUP
// Start the HTTP server and handle startup errors
// ========================================

/**
 * Start the server
 * Render automatically assigns a port, so we use process.env.PORT
 */
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🎉 Server startup complete!');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log(`📡 API available at: ${RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
  console.log(`💚 Health check: ${RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/health`);
  console.log('📋 Ready to receive submissions from n8n and other sources');
  
  // Render-specific startup info
  if (NODE_ENV === 'production') {
    console.log('🚀 Running on Render.com');
    console.log('📊 Monitor logs in Render dashboard');
    console.log('🔄 Auto-deploys enabled from Git');
  }
});

/**
 * Handle server startup errors
 */
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error('💡 Try a different port or stop the conflicting service');
  } else {
    console.error('❌ Server startup error:', error);
  }
  process.exit(1);
});

// ========================================
// GRACEFUL SHUTDOWN
// Handle process termination gracefully
// ========================================

/**
 * Graceful Shutdown Handler
 * Properly close database connections and server when process is terminated
 */
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  // Stop accepting new requests
  server.close((err) => {
    if (err) {
      console.error('❌ Error closing server:', err);
      process.exit(1);
    }
    
    console.log('🔌 HTTP server closed');
    
    // Close database connection
    mongoose.connection.close(false, () => {
      console.log('🗄️  MongoDB connection closed');
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    });
  });
  
  // Force exit after timeout
  setTimeout(() => {
    console.error('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 10000); // 10 second timeout
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Handle uncaught exceptions and unhandled promise rejections
 * Log the error and shut down gracefully
 */
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ========================================
// EXPORT APP (for testing)
// ========================================

module.exports = app;