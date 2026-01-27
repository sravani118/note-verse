/**
 * DocumentShare Model
 * 
 * Manages sharing permissions for collaborative documents.
 * Tracks who has access to each document and their permission level.
 */

import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';

/**
 * Permission levels for document access:
 * - view: Can only view the document (read-only)
 * - edit: Can view and edit the document
 * - owner: Full control (delete, share, etc.)
 */
export type SharePermission = 'view' | 'edit' | 'owner';

/**
 * Interface for DocumentShare document
 */
export interface IDocumentShare extends MongooseDocument {
  documentId: mongoose.Types.ObjectId;
  sharedBy: mongoose.Types.ObjectId; // User who shared the document
  sharedWith: mongoose.Types.ObjectId; // User who received access
  sharedWithEmail: string; // Email address of recipient
  permission: SharePermission;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DocumentShare Schema
 */
const DocumentShareSchema = new Schema<IDocumentShare>(
  {
    // Reference to the document being shared
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    // User who shared the document
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // User who received access (null if not yet registered)
    sharedWith: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Email address of recipient (used for invitations)
    sharedWithEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Permission level
    permission: {
      type: String,
      enum: ['view', 'edit', 'owner'],
      default: 'view',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate shares
DocumentShareSchema.index(
  { documentId: 1, sharedWithEmail: 1 },
  { unique: true }
);

// Index for efficient lookups
DocumentShareSchema.index({ sharedWith: 1 });
DocumentShareSchema.index({ sharedBy: 1 });

/**
 * Export the DocumentShare model
 */
const DocumentShare: Model<IDocumentShare> =
  mongoose.models.DocumentShare ||
  mongoose.model<IDocumentShare>('DocumentShare', DocumentShareSchema);

export default DocumentShare;
