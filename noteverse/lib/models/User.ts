import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * User Interface
 * Represents a user in the system
 */
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional for OAuth users
  image?: string;
  emailVerified?: Date;
  role: 'owner' | 'admin' | 'member';
  provider: 'credentials' | 'google' | 'github';
  
  // Profile settings
  displayName?: string;
  cursorColor?: string;
  timeZone?: string;
  
  // Preferences
  theme: 'light' | 'dark' | 'system';
  fontSize: string;
  fontFamily: string;
  lineSpacing: string;
  autoSave: boolean;
  
  // Account status
  isActive: boolean;
  lastLogin?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Schema
 * MongoDB schema for user documents
 */
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      select: false, // Don't return password by default
      minlength: [6, 'Password must be at least 6 characters']
    },
    image: {
      type: String,
      default: null
    },
    emailVerified: {
      type: Date,
      default: null
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'owner'
    },
    provider: {
      type: String,
      enum: ['credentials', 'google', 'github'],
      default: 'credentials'
    },
    
    // Profile settings
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters']
    },
    cursorColor: {
      type: String,
      default: '#6366F1',
      match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color']
    },
    timeZone: {
      type: String,
      default: 'UTC'
    },
    
    // Preferences
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    fontSize: {
      type: String,
      default: '14px'
    },
    fontFamily: {
      type: String,
      default: 'Inter'
    },
    lineSpacing: {
      type: String,
      default: '1.5'
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    
    // Account status
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
    collection: 'users'
  }
);

// Indexes for faster queries
// Note: email index is already created by unique: true in schema definition
UserSchema.index({ createdAt: -1 });
UserSchema.index({ isActive: 1 });

// Virtual field for document count
UserSchema.virtual('documentCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'owner',
  count: true
});

// Method to check if user can access document
UserSchema.methods.canAccessDocument = function(documentId: string) {
  // Implementation will check if user is owner or has share permissions
  return true; // Placeholder
};

// Static method to find active users
UserSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Prevent multiple model compilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

// Legacy export for backward compatibility
export interface UserWithoutPassword {
  _id?: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
