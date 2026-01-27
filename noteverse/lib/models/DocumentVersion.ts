import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * DocumentVersion Interface
 * Represents a snapshot/version of a document
 */
export interface IDocumentVersion extends Document {
  document: mongoose.Types.ObjectId | string;
  versionNumber: number;
  
  // Content snapshot
  title: string;
  content: string;
  
  // Version metadata
  createdBy: mongoose.Types.ObjectId | string;
  description?: string;
  changeType: 'auto' | 'manual' | 'restore';
  
  // Content diff (optional - for showing changes)
  contentDiff?: string;
  
  // Metadata at time of version
  wordCount: number;
  characterCount: number;
  
  // Timestamps
  createdAt: Date;
}

/**
 * DocumentVersion Schema
 * MongoDB schema for document version history
 */
const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Version must be associated with a document'],
      index: true
    },
    versionNumber: {
      type: Number,
      required: [true, 'Version number is required'],
      min: 1
    },
    
    // Content snapshot
    title: {
      type: String,
      required: [true, 'Version must have a title'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Version must have content'],
      default: ''
    },
    
    // Version metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Version must have a creator'],
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    changeType: {
      type: String,
      enum: ['auto', 'manual', 'restore'],
      default: 'auto'
    },
    
    // Content diff (optional)
    contentDiff: {
      type: String,
      default: null
    },
    
    // Metadata at time of version
    wordCount: {
      type: Number,
      default: 0,
      min: 0
    },
    characterCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation
    collection: 'documentVersions'
  }
);

// Compound indexes
DocumentVersionSchema.index({ document: 1, versionNumber: -1 });
DocumentVersionSchema.index({ document: 1, createdAt: -1 });
DocumentVersionSchema.index({ createdBy: 1, createdAt: -1 });

// Ensure version numbers are unique per document
DocumentVersionSchema.index({ document: 1, versionNumber: 1 }, { unique: true });

// Pre-save middleware to calculate metadata
DocumentVersionSchema.pre('save', function(next) {
  // Update word and character counts
  this.characterCount = this.content.length;
  this.wordCount = this.content.split(/\s+/).filter(word => word.length > 0).length;
  next();
});

// Static method to get latest version for a document
DocumentVersionSchema.statics.getLatestVersion = function(documentId: string) {
  return this.findOne({ document: documentId })
    .sort({ versionNumber: -1 })
    .populate('createdBy', 'name email image');
};

// Static method to get version history
DocumentVersionSchema.statics.getVersionHistory = function(
  documentId: string,
  limit: number = 10
) {
  return this.find({ document: documentId })
    .sort({ versionNumber: -1 })
    .limit(limit)
    .populate('createdBy', 'name email image');
};

// Static method to create auto-save version
DocumentVersionSchema.statics.createAutoVersion = async function(
  documentId: string,
  title: string,
  content: string,
  userId: string
) {
  // Get the latest version number
  const latestVersion = await this.findOne({ document: documentId })
    .sort({ versionNumber: -1 })
    .select('versionNumber');
  
  const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
  
  return this.create({
    document: documentId,
    versionNumber: newVersionNumber,
    title,
    content,
    createdBy: userId,
    changeType: 'auto'
  });
};

const DocumentVersion: Model<IDocumentVersion> = 
  mongoose.models.DocumentVersion || 
  mongoose.model<IDocumentVersion>('DocumentVersion', DocumentVersionSchema);

export default DocumentVersion;
