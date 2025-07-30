const mongoose = require('mongoose');

/**
 * Submission Schema - Updated to match n8n parser output
 * 
 * This schema is designed to work seamlessly with the n8n email parser
 * All fields align with what the parser extracts and sends
 */
const submissionSchema = new mongoose.Schema({
  
  // ========================================
  // CORE FIELDS (from n8n parser)
  // ========================================
  
  name: { 
    type: String, 
    required: true,
    default: 'NOT FOUND',
    trim: true
  },
  
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  
  phone: { 
    type: String, 
    required: false,
    trim: true
  },
  
  dateOfFirstContact: { 
    type: String,  // n8n sends as formatted string "YYYY-MM-DD HH:MM:SS EST"
    required: true
  },
  
  message: { 
    type: String, 
    default: 'NOT FOUND',
    trim: true
  },
  
  // ========================================
  // CATEGORIZATION FIELDS
  // ========================================
  
  submissionType: { 
    type: String, 
    default: 'moving',
    required: true
  },
  
  stage: { 
    type: String,
    default: 'Initial Demand'
  },
  
  source: { 
    type: String,
    required: true,
    enum: ['Alex', 'Demelina', 'Website Form'],
    default: 'Website Form'
  },
  
  status: {
    type: String,
    enum: ['new', 'in_progress', 'completed', 'archived', 'spam'],
    default: 'new'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // ========================================
  // MOVING DETAILS (nested object from n8n)
  // ========================================
  
  movingDetails: {
    movingDate: { 
      type: String,
      default: 'NOT FOUND',
      trim: true
    },
    firstAddress: { 
      type: String,
      default: 'NOT FOUND',
      trim: true
    },
    secondAddress: { 
      type: String,
      default: 'NOT FOUND',
      trim: true
    },
    housingTypeDepart: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    housingTypeDest: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    numberOfRooms: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    packingServices: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    currentStage: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    destinationStage: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    departmentElevator: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    destinationElevator: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    canCall: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    },
    preferredCallTime: { 
      type: String,
      default: 'NOT SPECIFIED',
      trim: true
    }
  },
  
  // ========================================
  // ADDITIONAL FIELDS (for future use)
  // ========================================
  
  // Who is handling this submission
  assignedTo: {
    type: String,
    trim: true
  },
  
  // Internal notes from staff
  internalNotes: {
    type: [String],
    default: []
  },
  
  // Follow up tracking
  followUpDate: {
    type: Date
  },
  
  lastContactDate: {
    type: Date
  },
  
  // Tags for organization
  tags: {
    type: [String],
    default: []
  },
  
  // Store any processing errors from n8n
  processingErrors: {
    type: [String],
    default: []
  },
  
  // ========================================
  // TIMESTAMPS
  // ========================================
  
  createdAt: { 
    type: Date, 
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ========================================
// MIDDLEWARE
// ========================================

// Update timestamps on save
submissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Update timestamps on update
submissionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ========================================
// INDEXES for performance
// ========================================

submissionSchema.index({ email: 1 });
submissionSchema.index({ submissionType: 1 });
submissionSchema.index({ stage: 1 });
submissionSchema.index({ source: 1 });
submissionSchema.index({ createdAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ priority: 1 });
submissionSchema.index({ assignedTo: 1 });

// Compound indexes for common queries
submissionSchema.index({ status: 1, priority: -1 });
submissionSchema.index({ submissionType: 1, status: 1 });
submissionSchema.index({ source: 1, createdAt: -1 });

// ========================================
// EXPORT
// ========================================

module.exports = mongoose.model('Submission', submissionSchema);