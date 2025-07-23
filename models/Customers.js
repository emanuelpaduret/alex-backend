const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: String,                        // Client's name
  email: String,                       // Email address
  phone: String,                       // Phone number
  dateOfFirstContact: Date,           // Date the client first reached out
  firstAddress: String,               // Moving from
  secondAddress: String,              // Moving to
  message: String,                    // Additional message from the client
  stage: {
    type: String,
    enum: ['Initial Demand', 'Quote Sent', 'Waiting', 'Negotiation', 'Won', 'Lost'],
    default: 'Initial Demand'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Customer', customerSchema);
