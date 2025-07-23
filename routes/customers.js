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
    const customer = new Customer(req.body); // Uses the JSON body sent from form or automation
    await customer.save();                   // Saves to MongoDB
    res.status(201).json(customer);          // Returns the saved customer
  } catch (error) {
    res.status(400).json({ message: 'Error creating customer', error });
  }
});

// PUT: Update an existing customer (e.g., to change sales stage)
router.put('/:id', async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Error updating customer', error });
  }
});

module.exports = router;
