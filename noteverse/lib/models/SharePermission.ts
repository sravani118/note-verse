import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * SharePermission Interface
 * Represents sharing permissions for a document
 */
export interface ISharePermission extends Document {
  document: mongoose.Types.ObjectId | string;
  
  // User who shared the document
  sharedBy: mongoose.Types.ObjectId | string;
  
  // Recipient
  sharedWith?: mongoose.Types.ObjectId | string; // Null for public links
  email?: string; // For sharing with non-users
  
  // Permission level
  permission: 'view' | 'comment' | 'edit' | 'admin';
  
  // Share type
  shareType: 'user' | 'email' | 'link' | 'public';
  
  // Link sharing
  shareToken?: string; // Unique token for shareable links
  linkExpiry?: Date;
  linkPassword?: string; // Optional password protection
  
  // Access control
  isActive: boolean;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId | string;
  
  // Usage tracking
  accessCount: number;
  lastAccessedAt?: Date;
  
  // Notification preferences
  notifyOnAccess: boolean;
  notifyOnEdit: boolean;
  
  // Expiry
  expiresAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SharePermission Schema
 * MongoDB schema for document sharing permissions
 */
const SharePermissionSchema = new Schema<ISharePermission>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Share permission must be associated with a document'],
      index: true
    },
    
    // User who shared
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Share permission must have a creator'],
      index: true
    },
    
    // Recipient
    sharedWith: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    
    // Permission level
    permission: {
      type: String,
      enum: ['view', 'comment', 'edit', 'admin'],
      default: 'view',
      required: [true, 'Permission level is required']
    },
    
    // Share type
    shareType: {
      type: String,
      enum: ['user', 'email', 'link', 'public'],
      required: [true, 'Share type is required'],
      index: true
    },
    
    // Link sharing
    shareToken: {
      type: String,
      unique: true,
      sparse: true, // Only unique if not null
      index: true
    },
    linkExpiry: {
      type: Date,
      default: null
    },
    linkPassword: {
      type: String,
      select: false // Don't return by default
    },
    
    // Access control
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    // Usage tracking
    accessCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastAccessedAt: {
      type: Date,
      default: null
    },
    
    // Notification preferences
    notifyOnAccess: {
      type: Boolean,
      default: false
    },
    notifyOnEdit: {
      type: Boolean,
      default: true
    },
    
    // Expiry
    expiresAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'sharePermissions'
  }
);

// Compound indexes for efficient queries
SharePermissionSchema.index({ document: 1, sharedWith: 1 }, { unique: true, sparse: true });
SharePermissionSchema.index({ document: 1, shareType: 1, isActive: 1 });
SharePermissionSchema.index({ sharedWith: 1, isActive: 1 });
SharePermissionSchema.index({ shareToken: 1, isActive: 1 });
SharePermissionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual to check if permission is expired
SharePermissionSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual to check if link is expired
SharePermissionSchema.virtual('isLinkExpired').get(function() {
  if (!this.linkExpiry) return false;
  return new Date() > this.linkExpiry;
});

// Pre-save middleware to generate share token
SharePermissionSchema.pre('save', function(next) {
  if (this.shareType === 'link' && !this.shareToken) {
    // Generate unique token
    this.shareToken = `share_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  next();
});

// Method to revoke permission
SharePermissionSchema.methods.revoke = function(userId: string) {
  this.isActive = false;
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedBy = userId;
  return this.save();
};

// Method to track access
SharePermissionSchema.methods.trackAccess = function() {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Method to check if permission is valid
SharePermissionSchema.methods.isValid = function() {
  if (!this.isActive || this.isRevoked) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.linkExpiry && new Date() > this.linkExpiry) return false;
  return true;
};

// Static method to get active permissions for document
SharePermissionSchema.statics.getDocumentPermissions = function(documentId: string) {
  return this.find({
    document: documentId,
    isActive: true,
    isRevoked: false
  })
    .populate('sharedWith', 'name email image')
    .populate('sharedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to get user's shared documents
SharePermissionSchema.statics.getUserSharedDocuments = function(userId: string) {
  return this.find({
    sharedWith: userId,
    isActive: true,
    isRevoked: false
  })
    .populate('document')
    .populate('sharedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to find by token
SharePermissionSchema.statics.findByToken = function(token: string) {
  return this.findOne({
    shareToken: token,
    shareType: 'link',
    isActive: true,
    isRevoked: false
  }).populate('document');
};

// Static method to create public link
SharePermissionSchema.statics.createPublicLink = async function(
  documentId: string,
  userId: string,
  permission: string = 'view',
  expiryDays?: number
) {
  const expiresAt = expiryDays 
    ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
    : undefined;
  
  return this.create({
    document: documentId,
    sharedBy: userId,
    shareType: 'link',
    permission,
    expiresAt
  });
};

const SharePermission: Model<ISharePermission> = 
  mongoose.models.SharePermission || 
  mongoose.model<ISharePermission>('SharePermission', SharePermissionSchema);

export default SharePermission;
