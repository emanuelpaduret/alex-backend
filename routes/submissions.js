const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');

// Test route
router.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Submissions API is working!',
    timestamp: new Date().toISOString()
  });
});

// Main route for n8n
router.post('/', async (req, res) => {
  try {
    console.log('📧 POST /api/submissions');
    console.log('📧 Body:', req.body);
    
    // Basic validation
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    if (!req.body.email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Create submission
    const submission = new Submission(req.body);
    const savedSubmission = await submission.save();
    
    console.log('✅ Submission saved:', savedSubmission._id);
    
    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: savedSubmission
    });
    
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating submission',
      error: error.message
    });
  }
});

module.exports = router;