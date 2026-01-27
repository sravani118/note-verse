import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Comment Interface
 * Represents a comment on a document
 */
export interface IComment extends Document {
  document: mongoose.Types.ObjectId | string;
  author: mongoose.Types.ObjectId | string;
  
  // Comment content
  content: string;
  
  // Threading support
  parentComment?: mongoose.Types.ObjectId | string;
  replies: Array<mongoose.Types.ObjectId | string>;
  
  // Position in document (for inline comments)
  position?: {
    start: number;
    end: number;
    selectedText?: string;
  };
  
  // Comment status
  isResolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId | string;
  resolvedAt?: Date;
  
  // Reactions/Likes
  reactions: Array<{
    user: mongoose.Types.ObjectId | string;
    emoji: string;
    createdAt: Date;
  }>;
  
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Comment Schema
 * MongoDB schema for document comments
 */
const CommentSchema = new Schema<IComment>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Comment must be associated with a document'],
      index: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment must have an author'],
      index: true
    },
    
    // Comment content
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [5000, 'Comment cannot exceed 5000 characters']
    },
    
    // Threading support
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true
    },
    replies: [{
      type: Schema.Types.ObjectId,
      ref: 'Comment'
    }],
    
    // Position in document
    position: {
      start: {
        type: Number,
        min: 0
      },
      end: {
        type: Number,
        min: 0
      },
      selectedText: {
        type: String,
        maxlength: [500, 'Selected text cannot exceed 500 characters']
      }
    },
    
    // Comment status
    isResolved: {
      type: Boolean,
      default: false,
      index: true
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    
    // Reactions/Likes
    reactions: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      emoji: {
        type: String,
        required: true,
        enum: ['👍', '❤️', '😊', '🎉', '🤔', '👎']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'comments'
  }
);

// Compound indexes
CommentSchema.index({ document: 1, createdAt: -1 });
CommentSchema.index({ document: 1, isResolved: 1, isDeleted: 1 });
CommentSchema.index({ parentComment: 1 });
CommentSchema.index({ author: 1, createdAt: -1 });

// Virtual for reply count
CommentSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Method to resolve comment
CommentSchema.methods.resolve = function(userId: string) {
  this.isResolved = true;
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  return this.save();
};

// Method to unresolve comment
CommentSchema.methods.unresolve = function() {
  this.isResolved = false;
  this.resolvedBy = undefined;
  this.resolvedAt = undefined;
  return this.save();
};

// Method to add reaction
CommentSchema.methods.addReaction = function(userId: string, emoji: string) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    (r: any) => r.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId as any,
    emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
CommentSchema.methods.removeReaction = function(userId: string) {
  this.reactions = this.reactions.filter(
    (r: any) => r.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to soft delete
CommentSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Static method to get document comments
CommentSchema.statics.getDocumentComments = function(
  documentId: string,
  includeResolved: boolean = false
) {
  const query: any = {
    document: documentId,
    parentComment: null, // Only top-level comments
    isDeleted: false
  };
  
  if (!includeResolved) {
    query.isResolved = false;
  }
  
  return this.find(query)
    .populate('author', 'name email image cursorColor')
    .populate({
      path: 'replies',
      match: { isDeleted: false },
      populate: { path: 'author', select: 'name email image' }
    })
    .sort({ createdAt: -1 });
};

// Static method to get comment thread
CommentSchema.statics.getCommentThread = function(commentId: string) {
  return this.findById(commentId)
    .populate('author', 'name email image')
    .populate({
      path: 'replies',
      match: { isDeleted: false },
      populate: { path: 'author', select: 'name email image' }
    });
};

const Comment: Model<IComment> = 
  mongoose.models.Comment || 
  mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;
