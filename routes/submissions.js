const express = require('express');
const router = express.Router();
const Customer = require('../models/Customers');

// GET all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }); // Newest first
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error });
  }
});

// POST a new customer
router.post('/', async (req, res) => {
  try {
    console.log('🟡 Incoming POST data:', req.body); // Log incoming data

    const customer = new Customer(req.body); // Construct new customer
    await customer.save();                   // Save to DB

    console.log('✅ Customer saved:', customer); // Log saved data
    res.status(201).json(customer);
  } catch (error) {
    console.error('❌ Error creating customer:', error); // Log error
    res.status(400).json({ message: 'Error creating customer', error });
  }
});

// PUT: Update an existing customer
router.put('/:id', async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error updating customer', error });
  }
});

module.exports = router;
