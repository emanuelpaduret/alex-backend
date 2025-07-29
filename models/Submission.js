const mongoose = require('mongoose');

/**
 * Submission Schema
 * 
 * This schema handles all types of form submissions (moving, contact, service requests, etc.)
 * It's designed to be flexible and scalable while maintaining data integrity.
 * 
 * Key Features:
 * - Type-specific data organization (movingDetails, contactDetails, etc.)
 * - Enhanced metadata for debugging and analytics
 * - Flexible customFields for unique requirements
 * - Built-in workflow management (status, priority, assignment)
 * - Comprehensive audit trail
 */
const submissionSchema = new mongoose.Schema({
  
  // ========================================
  // CORE REQUIRED FIELDS
  // These fields are essential for all submission types
  // ========================================
  
  name: { 
    type: String, 
    required: true,        // Must have a name to create submission
    trim: true            // Remove leading/trailing whitespace
  },
  
  email: { 
    type: String, 
    required: true,        // Must have email for communication
    trim: true,           // Remove whitespace
    lowercase: true       // Store emails in lowercase for consistency
  },
  
  phone: { 
    type: String, 
    required: false,      // Phone is optional (not all forms require it)
    trim: true
  },
  
  dateOfFirstContact: { 
    type: Date, 
    default: Date.now     // Automatically set when submission is created
  },
  
  message: { 
    type: String, 
    required: false,      // Message is optional
    trim: true
  },
  
  // ========================================
  // SUBMISSION CATEGORIZATION
  // These fields help categorize and manage different types of submissions
  // ========================================
  
  submissionType: { 
    type: String, 
    enum: ['moving', 'contact', 'quote', 'service_request', 'other'],
    required: true,
    default: 'other'      // Default to 'other' if type can't be determined
  },
  
  stage: { 
    type: String,
    enum: ['Initial Demand', 'Quote Sent', 'Waiting', 'Negotiation', 'Won', 'Lost'],
    default: 'Initial Demand'  // All submissions start at initial demand
  },
  
  source: { 
    type: String,
    required: true,
    default: 'Unknown'    // Track where the submission came from (Website, Gmail, etc.)
  },
  
  // ========================================
  // MOVING-SPECIFIC DATA
  // Only populated when submissionType is 'moving'
  // All fields are optional since not all moving forms have all data
  // ========================================
  
  movingDetails: {
    movingDate: { 
      type: String,       // Store as string to handle various date formats
      trim: true
    },
    firstAddress: { 
      type: String,       // Moving from address
      trim: true
    },
    secondAddress: { 
      type: String,       // Moving to address
      trim: true
    },
    housingTypeDepart: { 
      type: String,       // Type of housing moving FROM (apartment, house, etc.)
      trim: true
    },
    housingTypeDest: { 
      type: String,       // Type of housing moving TO
      trim: true
    },
    numberOfRooms: { 
      type: String,       // Number of rooms/size of move
      trim: true
    },
    packingServices: { 
      type: String,       // Whether they need packing help
      trim: true
    },
    currentStage: { 
      type: String,       // What floor/stage they're moving from
      trim: true
    },
    destinationStage: { 
      type: String,       // What floor/stage they're moving to
      trim: true
    },
    departmentElevator: { 
      type: String,       // Elevator availability at departure
      trim: true
    },
    destinationElevator: { 
      type: String,       // Elevator availability at destination
      trim: true
    },
    canCall: { 
      type: String,       // Whether customer can be contacted by phone
      trim: true
    },
    preferredCallTime: { 
      type: String,       // When they prefer to be called
      trim: true
    }
  },
  
  // ========================================
  // CONTACT FORM DATA
  // For general inquiries and contact submissions
  // ========================================
  
  contactDetails: {
    subject: { 
      type: String,       // Subject of the inquiry
      trim: true
    },
    department: { 
      type: String,       // Which department the inquiry is for
      trim: true
    },
    urgency: { 
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'   // Default urgency level
    },
    preferredContact: { 
      type: String,
      enum: ['email', 'phone', 'either'],
      default: 'either'   // How they prefer to be contacted
    }
  },
  
  // ========================================
  // SERVICE REQUEST DATA
  // For specific service requests (quotes, consultations, etc.)
  // ========================================
  
  serviceDetails: {
    serviceType: { 
      type: String,       // Type of service requested
      trim: true
    },
    location: { 
      type: String,       // Where the service is needed
      trim: true
    },
    preferredDate: { 
      type: String,       // When they need the service
      trim: true
    },
    budget: { 
      type: String,       // Their budget range
      trim: true
    },
    timeline: { 
      type: String,       // How urgent/timeline for service
      trim: true
    }
  },
  
  // ========================================
  // FLEXIBLE CUSTOM FIELDS
  // For storing any additional data that doesn't fit in standard fields
  // Uses MongoDB Map type for maximum flexibility
  // ========================================
  
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,  // Can store any type of data
    default: new Map()
    // Example usage:
    // customFields.set('specialInstructions', 'Handle with care')
    // customFields.set('referralSource', 'Google Ads')
  },
  
  // ========================================
  // ENHANCED METADATA
  // Critical for debugging, analytics, and audit trails
  // ========================================
  
  metadata: {
    // Timestamp when submission was processed
    timestamp: { 
      type: String,
      default: () => new Date().toLocaleString("fr-CA", {
        timeZone: "America/Toronto",     // Use Toronto timezone
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false                    // 24-hour format
      })
    },
    
    // Store the original email text for debugging
    originalEmailText: { 
      type: String,
      default: ''
      // This allows us to see exactly what the customer sent
      // Useful for debugging parsing issues
    },
    
    // Track any errors that occurred during processing
    processingErrors: {
      type: [String],
      default: []
      // Examples: ["Invalid phone format", "Missing departure address"]
      // Helps identify and fix parsing problems
    },
    
    // Flexible tagging system
    tags: {
      type: [String],
      default: []
      // Examples: ["urgent", "vip", "repeat-customer", "large-move"]
      // Useful for filtering and business logic
    },
    
    // Track IP address for security/analytics
    ipAddress: {
      type: String,
      trim: true
    },
    
    // Track browser/device info
    userAgent: {
      type: String,
      trim: true
    }
  },
  
  // ========================================
  // WORKFLOW MANAGEMENT
  // Fields for managing the business process
  // ========================================
  
  // Current status in the workflow
  status: {
    type: String,
    enum: ['new', 'in_progress', 'completed', 'archived', 'spam'],
    default: 'new'
    // new: Just received, needs attention
    // in_progress: Someone is working on it
    // completed: Fully processed
    // archived: Closed/finished
    // spam: Identified as spam
  },
  
  // Business priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
    // Can be automatically set based on submission content
    // or manually adjusted by staff
  },
  
  // Who is currently handling this submission
  assignedTo: {
    type: String,
    trim: true
    // Store username/email of assigned staff member
  },
  
  // ========================================
  // INTERNAL TRACKING
  // Fields for internal business use
  // ========================================
  
  // Internal notes from staff
  internalNotes: {
    type: [String],
    default: []
    // Example: ["Customer called back", "Sent quote via email", "Follow up needed"]
  },
  
  // When to follow up with this customer
  followUpDate: {
    type: Date
    // Can be used to schedule reminders
  },
  
  // Last time we contacted the customer
  lastContactDate: {
    type: Date
    // Track communication frequency
  },
  
  // ========================================
  // AUTOMATIC TIMESTAMPS
  // MongoDB will handle these automatically
  // ========================================
  
  createdAt: { 
    type: Date, 
    default: Date.now     // When the submission was first created
  },
  
  updatedAt: {
    type: Date,
    default: Date.now     // Last time any field was modified
  }
});

// ========================================
// MIDDLEWARE FUNCTIONS
// These run automatically before certain operations
// ========================================

/**
 * Pre-save middleware
 * Runs before every save operation (create or update)
 * Updates the updatedAt timestamp and ensures metadata is set
 */
submissionSchema.pre('save', function(next) {
  // Always update the modification timestamp
  this.updatedAt = new Date();
  
  // Ensure metadata timestamp is set (fallback if not already set)
  if (!this.metadata.timestamp) {
    this.metadata.timestamp = new Date().toLocaleString("fr-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }
  
  next(); // Continue with the save operation
});

/**
 * Pre-update middleware
 * Runs before findOneAndUpdate operations
 * Ensures updatedAt is set even for direct updates
 */
submissionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ========================================
// DATABASE INDEXES
// These improve query performance for common searches
// ========================================

// Index on email for quick customer lookup
submissionSchema.index({ email: 1 });

// Index on submission type for filtering by form type
submissionSchema.index({ submissionType: 1 });

// Index on stage for workflow filtering
submissionSchema.index({ stage: 1 });

// Index on source for analytics (where submissions come from)
submissionSchema.index({ source: 1 });

// Index on creation date for chronological sorting (most recent first)
submissionSchema.index({ createdAt: -1 });

// Index on status for workflow management
submissionSchema.index({ status: 1 });

// Compound index for common filtering combinations
submissionSchema.index({ submissionType: 1, stage: 1, status: 1 });

// Index on assigned user for workload management
submissionSchema.index({ assignedTo: 1 });

// ========================================
// EXPORT THE MODEL
// ========================================

module.exports = mongoose.model('Submission', submissionSchema);