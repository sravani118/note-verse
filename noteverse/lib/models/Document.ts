import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';

/**
 * Document Interface
 * Represents a collaborative document
 */
export interface IDocument extends MongooseDocument {
  title: string;
  content: string;
  
  // Ownership
  owner: mongoose.Types.ObjectId | string;
  
  // Collaboration
  collaborators: Array<{
    user: mongoose.Types.ObjectId | string;
    role: 'editor' | 'viewer';
    addedAt: Date;
  }>;
  
  // Email-based sharing (Google Docs style)
  sharedWith: Array<{
    userId: mongoose.Types.ObjectId | string;
    email: string;
    role: 'editor' | 'viewer';
    sharedAt: Date;
  }>;
  
  // Document metadata
  isPublic: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  tags: string[];
  
  // Google Docs-style sharing
  visibility: 'restricted' | 'public'; // Restricted or Anyone with the link
  publicPermission: 'viewer' | 'editor'; // Permission for public access
  
  // Document Settings - Editor Preferences
  chatEnabled: boolean; // Enable/disable document chat
  defaultFont: string; // Default font family for this document
  defaultFontSize: string; // Default font size
  pageWidth: 'normal' | 'wide'; // Page width preference
  spellCheck: boolean; // Enable spell check
  
  // Rich content metadata
  wordCount: number;
  characterCount: number;
  
  // Last activity
  lastEditedBy?: mongoose.Types.ObjectId | string;
  lastEditedAt: Date;
  
  // Version tracking
  currentVersion: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document Schema
 * MongoDB schema for document storage
 */
const DocumentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: 'Untitled Document'
    },
    content: {
      type: String,
      default: '',
      maxlength: [5000000, 'Content cannot exceed 5MB'] // ~5MB limit
    },
    
    // Ownership
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Document must have an owner'],
      index: true
    },
    
    // Collaboration
    collaborators: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        role: {
          type: String,
          enum: ['editor', 'viewer'],
          default: 'viewer'
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Email-based sharing (Google Docs style)
    sharedWith: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        email: {
          type: String,
          required: true,
          lowercase: true,
          trim: true
        },
        role: {
          type: String,
          enum: ['editor', 'viewer'],
          default: 'viewer',
          required: true
        },
        sharedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    
    // Document metadata
    isPublic: {
      type: Boolean,
      default: false,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags: string[]) {
          return tags.length <= 10;
        },
        message: 'Cannot have more than 10 tags'
      }
    },
    
    // Google Docs-style sharing
    visibility: {
      type: String,
      enum: ['restricted', 'public'],
      default: 'restricted',
      index: true
    },
    publicPermission: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer'
    },
    
    // Document Settings - Editor Preferences
    chatEnabled: {
      type: Boolean,
      default: true
    },
    defaultFont: {
      type: String,
      default: 'Arial',
      trim: true
    },
    defaultFontSize: {
      type: String,
      default: '14',
      trim: true
    },
    pageWidth: {
      type: String,
      enum: ['normal', 'wide'],
      default: 'normal'
    },
    spellCheck: {
      type: Boolean,
      default: true
    },
    
    // Rich content metadata
    wordCount: {
      type: Number,
      default: 0,
      min: 0
    },
    characterCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Last activity
    lastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lastEditedAt: {
      type: Date,
      default: Date.now
    },
    
    // Version tracking
    currentVersion: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  {
    timestamps: true,
    collection: 'documents'
  }
);

// Compound indexes for efficient queries
DocumentSchema.index({ owner: 1, createdAt: -1 });
DocumentSchema.index({ owner: 1, isArchived: 1 });
DocumentSchema.index({ 'collaborators.user': 1 });
DocumentSchema.index({ 'sharedWith.userId': 1 }); // For shared document queries
DocumentSchema.index({ 'sharedWith.email': 1 }); // For email-based sharing
DocumentSchema.index({ title: 'text', content: 'text' }); // Full-text search
DocumentSchema.index({ tags: 1 });
DocumentSchema.index({ lastEditedAt: -1 });

// Virtual for share permissions
DocumentSchema.virtual('sharePermissions', {
  ref: 'SharePermission',
  localField: '_id',
  foreignField: 'document'
});

// Virtual for versions
DocumentSchema.virtual('versions', {
  ref: 'DocumentVersion',
  localField: '_id',
  foreignField: 'document'
});

// Virtual for comments
DocumentSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'document'
});

// Pre-save middleware to update metadata
DocumentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Update word and character counts
    this.characterCount = this.content.length;
    this.wordCount = this.content.split(/\s+/).filter(word => word.length > 0).length;
    this.lastEditedAt = new Date();
  }
  next();
});

// Method to check if user is collaborator
DocumentSchema.methods.isCollaborator = function(userId: string) {
  return this.collaborators.some(
    (collab: any) => collab.user.toString() === userId.toString()
  );
};

// Method to check if user can edit
DocumentSchema.methods.canEdit = function(userId: string) {
  if (this.owner.toString() === userId.toString()) return true;
  
  const collaborator = this.collaborators.find(
    (collab: any) => collab.user.toString() === userId.toString()
  );
  
  return collaborator && collaborator.role === 'editor';
};

// Static method to find user's documents
DocumentSchema.statics.findByUser = function(userId: string) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.user': userId }
    ],
    isArchived: false
  }).sort({ lastEditedAt: -1 });
};

// Static method to search documents
DocumentSchema.statics.searchDocuments = function(userId: string, query: string) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.user': userId }
    ],
    $text: { $search: query },
    isArchived: false
  }).sort({ score: { $meta: 'textScore' } });
};

const Document: Model<IDocument> = mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);

export default Document;
