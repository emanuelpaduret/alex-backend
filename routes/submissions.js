/**
 * Submission Routes
 * 
 * RESTful API endpoints for managing form submissions from various sources
 * (moving forms, contact forms, service requests, etc.)
 * 
 * Key Features:
 * - Full CRUD operations with validation
 * - Advanced filtering and pagination
 * - Workflow management (status, assignment, priority)
 * - Analytics and reporting endpoints
 * - Bulk operations for efficiency
 * - Comprehensive error handling and logging
 * 
 * Route Structure:
 * GET    /api/submissions           - Get all submissions with filtering
 * GET    /api/submissions/:id       - Get specific submission
 * POST   /api/submissions           - Create new submission
 * PUT    /api/submissions/:id       - Update entire submission
 * PATCH  /api/submissions/:id/status - Update status/stage only
 * DELETE /api/submissions/:id       - Delete submission
 * GET    /api/submissions/type/:type - Get submissions by type
 * GET    /api/submissions/stats/dashboard - Get analytics data
 */

const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');

// ========================================
// GET ALL SUBMISSIONS
// Main endpoint with advanced filtering, pagination, and sorting
// ========================================

/**
 * GET /api/submissions
 * 
 * Retrieve submissions with optional filtering, pagination, and sorting
 * 
 * Query Parameters:
 * - type: Filter by submissionType (moving, contact, etc.)
 * - stage: Filter by stage (Initial Demand, Quote Sent, etc.)
 * - source: Filter by source (Website, Gmail, etc.)
 * - status: Filter by status (new, in_progress, etc.)
 * - priority: Filter by priority (low, medium, high, urgent)
 * - assignedTo: Filter by assigned user
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 10)
 * - sort: Sort field and direction (default: -createdAt)
 * - search: Search in name, email, or message fields
 * 
 * Examples:
 * GET /api/submissions?type=moving&stage=Initial Demand&page=2&limit=5
 * GET /api/submissions?status=new&priority=high&sort=createdAt
 * GET /api/submissions?search=john&assignedTo=alex@company.com
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔍 GET /api/submissions - Query params:', req.query);
    
    const { 
      type,           // submissionType filter
      stage,          // stage filter
      source,         // source filter
      status,         // status filter
      priority,       // priority filter
      assignedTo,     // assigned user filter
      search,         // text search
      page = 1,       // pagination
      limit = 10,     // items per page
      sort = '-createdAt'  // sort order (- for descending)
    } = req.query;
    
    // ========================================
    // BUILD FILTER OBJECT
    // Dynamically construct MongoDB filter based on provided parameters
    // ========================================
    
    const filter = {};
    
    // Add filters only if parameters are provided
    if (type) filter.submissionType = type;
    if (stage) filter.stage = stage;
    if (source) filter.source = source;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Text search across multiple fields using MongoDB regex
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },      // Case-insensitive name search
        { email: { $regex: search, $options: 'i' } },     // Case-insensitive email search
        { message: { $regex: search, $options: 'i' } }    // Case-insensitive message search
      ];
    }
    
    console.log('🔍 Applied filters:', filter);
    
    // ========================================
    // EXECUTE QUERY WITH PAGINATION
    // ========================================
    
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Get submissions with filters, sorting, and pagination
    const submissions = await Submission.find(filter)
      .sort(sort)                    // Sort by specified field
      .limit(limitNumber)            // Limit results per page
      .skip(skip)                    // Skip for pagination
      .lean();                       // Return plain objects for better performance
    
    // Get total count for pagination info
    const total = await Submission.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNumber);
    
    console.log(`✅ Found ${submissions.length} submissions (${total} total)`);
    
    // ========================================
    // RETURN PAGINATED RESPONSE
    // ========================================
    
    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNumber,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1
        },
        filters: {
          type,
          stage,
          source,
          status,
          priority,
          assignedTo,
          search
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching submissions', 
      error: error.message 
    });
  }
});

// ========================================
// GET SINGLE SUBMISSION
// Retrieve a specific submission by ID
// ========================================

/**
 * GET /api/submissions/:id
 * 
 * Get a single submission by its MongoDB ObjectId
 * Returns full submission data including all nested objects
 */
router.get('/:id', async (req, res) => {
  try {
    console.log(`🔍 GET /api/submissions/${req.params.id}`);
    
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      console.log('❌ Submission not found');
      return res.status(404).json({ 
        success: false,
        message: 'Submission not found' 
      });
    }
    
    console.log('✅ Submission found:', submission.name);
    
    res.json({
      success: true,
      data: submission
    });
    
  } catch (error) {
    console.error('❌ Error fetching submission:', error);
    
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid submission ID format' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching submission', 
      error: error.message 
    });
  }
});

// ========================================
// CREATE NEW SUBMISSION
// Main endpoint for receiving new submissions (from n8n, forms, etc.)
// ========================================

/**
 * POST /api/submissions
 * 
 * Create a new submission from form data
 * This is the main endpoint that n8n will call with parsed email data
 * 
 * Request Body: Complete submission object (see Submission model)
 * 
 * Automatic Processing:
 * - Validates required fields
 * - Sets default values
 * - Creates timestamps
 * - Assigns priority based on content
 */
router.post('/', async (req, res) => {
  try {
    console.log('📧 POST /api/submissions - Incoming submission data:');
    console.log('📧 Name:', req.body.name);
    console.log('📧 Email:', req.body.email);
    console.log('📧 Type:', req.body.submissionType);
    console.log('📧 Source:', req.body.source);
    
    // ========================================
    // VALIDATE REQUIRED FIELDS
    // ========================================
    
    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    if (!req.body.email || req.body.email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // ========================================
    // AUTO-ASSIGN PRIORITY BASED ON CONTENT
    // Business logic to automatically set priority
    // ========================================
    
    let autoPriority = 'medium'; // default
    
    // Check for urgent keywords in message
    if (req.body.message) {
      const urgentKeywords = ['urgent', 'asap', 'emergency', 'immediately', 'rush'];
      const messageText = req.body.message.toLowerCase();
      
      if (urgentKeywords.some(keyword => messageText.includes(keyword))) {
        autoPriority = 'urgent';
        
        // Add urgent tag to metadata
        if (!req.body.metadata) req.body.metadata = {};
        if (!req.body.metadata.tags) req.body.metadata.tags = [];
        req.body.metadata.tags.push('auto-urgent');
      }
    }
    
    // Set priority if not provided
    if (!req.body.priority) {
      req.body.priority = autoPriority;
    }
    
    // ========================================
    // CREATE AND SAVE SUBMISSION
    // ========================================
    
    const submission = new Submission(req.body);
    const savedSubmission = await submission.save();
    
    console.log('✅ Submission saved successfully:');
    console.log('✅ ID:', savedSubmission._id);
    console.log('✅ Priority:', savedSubmission.priority);
    console.log('✅ Processing errors:', savedSubmission.metadata?.processingErrors?.length || 0);
    
    // ========================================
    // LOG PROCESSING ERRORS FOR MONITORING
    // ========================================
    
    if (savedSubmission.metadata?.processingErrors?.length > 0) {
      console.log('⚠️  Processing errors detected:');
      savedSubmission.metadata.processingErrors.forEach(error => {
        console.log('⚠️  -', error);
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: savedSubmission
    });
    
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: 'Error creating submission', 
      error: error.message 
    });
  }
});

// ========================================
// UPDATE ENTIRE SUBMISSION
// Replace all fields of an existing submission
// ========================================

/**
 * PUT /api/submissions/:id
 * 
 * Update an entire submission with new data
 * Use this for major changes or when updating from a form
 */
router.put('/:id', async (req, res) => {
  try {
    console.log(`📝 PUT /api/submissions/${req.params.id}`);
    
    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },  // Ensure updatedAt is set
      { 
        new: true,           // Return the updated document
        runValidators: true  // Run schema validation
      }
    );
    
    if (!updated) {
      return res.status(404).json({ 
        success: false,
        message: 'Submission not found' 
      });
    }
    
    console.log('✅ Submission updated:', updated.name);
    
    res.json({
      success: true,
      message: 'Submission updated successfully',
      data: updated
    });
    
  } catch (error) {
    console.error('❌ Error updating submission:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: 'Error updating submission', 
      error: error.message 
    });
  }
});

// ========================================
// UPDATE STATUS/STAGE ONLY
// Quick endpoint for workflow management
// ========================================

/**
 * PATCH /api/submissions/:id/status
 * 
 * Update only the status, stage, priority, or assignment
 * This is more efficient than updating the entire submission
 * 
 * Request Body:
 * {
 *   "stage": "Quote Sent",
 *   "status": "in_progress",
 *   "priority": "high",
 *   "assignedTo": "alex@company.com"
 * }
 */
router.patch('/:id/status', async (req, res) => {
  try {
    console.log(`🔄 PATCH /api/submissions/${req.params.id}/status`);
    console.log('🔄 Updates:', req.body);
    
    const { stage, status, priority, assignedTo } = req.body;
    
    // Build update object with only provided fields
    const updateFields = { updatedAt: new Date() };
    
    if (stage) updateFields.stage = stage;
    if (status) updateFields.status = status;
    if (priority) updateFields.priority = priority;
    if (assignedTo) updateFields.assignedTo = assignedTo;
    
    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(404).json({ 
        success: false,
        message: 'Submission not found' 
      });
    }
    
    console.log('✅ Status updated:', {
      stage: updated.stage,
      status: updated.status,
      priority: updated.priority,
      assignedTo: updated.assignedTo
    });
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: updated
    });
    
  } catch (error) {
    console.error('❌ Error updating submission status:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error updating submission status', 
      error: error.message 
    });
  }
});

// ========================================
// DELETE SUBMISSION
// Remove a submission (use with caution)
// ========================================

/**
 * DELETE /api/submissions/:id
 * 
 * Permanently delete a submission
 * Consider using status 'archived' instead of deletion for audit trail
 */
router.delete('/:id', async (req, res) => {
  try {
    console.log(`🗑️  DELETE /api/submissions/${req.params.id}`);
    
    const deleted = await Submission.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false,
        message: 'Submission not found' 
      });
    }
    
    console.log('✅ Submission deleted:', deleted.name);
    
    res.json({ 
      success: true,
      message: 'Submission deleted successfully',
      data: { deletedId: req.params.id }
    });
    
  } catch (error) {
    console.error('❌ Error deleting submission:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting submission', 
      error: error.message 
    });
  }
});

// ========================================
// GET SUBMISSIONS BY TYPE
// Convenience endpoint for filtering by submission type
// ========================================

/**
 * GET /api/submissions/type/:type
 * 
 * Get all submissions of a specific type
 * Types: moving, contact, quote, service_request, other
 * 
 * Examples:
 * GET /api/submissions/type/moving
 * GET /api/submissions/type/contact
 */
router.get('/type/:type', async (req, res) => {
  try {
    console.log(`🔍 GET /api/submissions/type/${req.params.type}`);
    
    const submissions = await Submission.find({ 
      submissionType: req.params.type 
    }).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${submissions.length} ${req.params.type} submissions`);
    
    res.json({
      success: true,
      data: {
        submissions,
        type: req.params.type,
        count: submissions.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching submissions by type:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching submissions by type', 
      error: error.message 
    });
  }
});

// ========================================
// ANALYTICS & DASHBOARD STATS
// Provide aggregated data for dashboard views
// ========================================

/**
 * GET /api/submissions/stats/dashboard
 * 
 * Get comprehensive statistics for dashboard display
 * 
 * Returns:
 * - Total submissions count
 * - Breakdown by type
 * - Breakdown by stage
 * - Breakdown by status
 * - Recent submissions
 * - Processing error statistics
 */
router.get('/stats/dashboard', async (req, res) => {
  try {
    console.log('📊 GET /api/submissions/stats/dashboard');
    
    // ========================================
    // PARALLEL AGGREGATION QUERIES
    // Run multiple aggregations simultaneously for performance
    // ========================================
    
    const [
      totalSubmissions,
      typeStats,
      stageStats,
      statusStats,
      recentSubmissions,
      errorStats,
      priorityStats
    ] = await Promise.all([
      
      // Total count
      Submission.countDocuments(),
      
      // Group by submission type
      Submission.aggregate([
        {
          $group: {
            _id: '$submissionType',
            count: { $sum: 1 },
            latestSubmission: { $max: '$createdAt' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Group by stage
      Submission.aggregate([
        {
          $group: {
            _id: '$stage',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Group by status
      Submission.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Get 5 most recent submissions
      Submission.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email submissionType stage status createdAt'),
      
      // Count submissions with processing errors
      Submission.aggregate([
        {
          $match: {
            'metadata.processingErrors.0': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            totalWithErrors: { $sum: 1 },
            commonErrors: { $push: '$metadata.processingErrors' }
          }
        }
      ]),
      
      // Group by priority
      Submission.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);
    
    // ========================================
    // CALCULATE ADDITIONAL METRICS
    // ========================================
    
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const submissionsThisWeek = await Submission.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });
    
    // Calculate error rate
    const errorCount = errorStats[0]?.totalWithErrors || 0;
    const errorRate = totalSubmissions > 0 ? (errorCount / totalSubmissions * 100).toFixed(2) : 0;
    
    console.log('✅ Dashboard stats calculated');
    console.log(`📊 Total: ${totalSubmissions}, This week: ${submissionsThisWeek}, Error rate: ${errorRate}%`);
    
    // ========================================
    // RETURN COMPREHENSIVE STATS
    // ========================================
    
    res.json({
      success: true,
      data: {
        overview: {
          totalSubmissions,
          submissionsThisWeek,
          errorRate: parseFloat(errorRate),
          submissionsWithErrors: errorCount
        },
        breakdowns: {
          byType: typeStats,
          byStage: stageStats,
          byStatus: statusStats,
          byPriority: priorityStats
        },
        recent: recentSubmissions,
        performance: {
          errorRate: parseFloat(errorRate),
          totalWithErrors: errorCount
        },
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard statistics', 
      error: error.message 
    });
  }
});

// ========================================
// BULK OPERATIONS
// Handle multiple submissions at once
// ========================================

/**
 * PATCH /api/submissions/bulk/status
 * 
 * Update status/stage for multiple submissions at once
 * 
 * Request Body:
 * {
 *   "ids": ["id1", "id2", "id3"],
 *   "updates": { "stage": "Quote Sent", "status": "in_progress" }
 * }
 */
router.patch('/bulk/status', async (req, res) => {
  try {
    console.log('🔄 PATCH /api/submissions/bulk/status');
    
    const { ids, updates } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs array is required'
      });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates object is required'
      });
    }
    
    // Add updatedAt to the updates
    updates.updatedAt = new Date();
    
    const result = await Submission.updateMany(
      { _id: { $in: ids } },
      { $set: updates }
    );
    
    console.log(`✅ Bulk update completed: ${result.modifiedCount} submissions updated`);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} submissions updated successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
    
  } catch (error) {
    console.error('❌ Error in bulk status update:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating submissions',
      error: error.message
    });
  }
});

// ========================================
// EXPORT THE ROUTER
// ========================================

module.exports = router;