const express = require('express');              // Import Express web framework
const mongoose = require('mongoose');            // Import Mongoose to work with MongoDB
const cors = require('cors');                    // Enable requests from other origins (like frontend or n8n)
require('dotenv').config();                      // Load variables from .env

const app = express();                           // Create the Express app instance

app.use(cors());                                 // Allow cross-origin requests (e.g., React or n8n)
app.use(express.json());                         // Automatically parse JSON in request bodies

// Connect to MongoDB using the connection string in .env
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Set up API routes
app.use('/api/customers', require('./routes/customers'));

// Start the server on the defined port
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
