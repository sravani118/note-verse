import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Document from '@/lib/models/Document';
import DocumentShare from '@/lib/models/DocumentShare';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Profile API - Session:', session);
    
    if (!session?.user?.email) {
      console.log('Profile API - No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get user with all profile data
    const user = await User.findOne({ email: session.user.email }).select(
      'name email image displayName cursorColor timeZone theme fontSize fontFamily lineSpacing autoSave role lastLogin createdAt'
    );

    console.log('Profile API - User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('Profile API - User not found for email:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get activity statistics
    const documentsCreated = await Document.countDocuments({ owner: user._id });
    const documentsShared = await DocumentShare.countDocuments({ sharedBy: user._id });
    
    // Get last edited document
    const lastDocument = await Document.findOne({ owner: user._id })
      .sort({ updatedAt: -1 })
      .select('title updatedAt');

    // Get recent activity (last 10 document updates)
    const recentDocs = await Document.find({ owner: user._id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title updatedAt createdAt');

    const recentActivity = recentDocs.map(doc => ({
      id: doc._id.toString(),
      action: doc.createdAt.getTime() === doc.updatedAt.getTime() ? 'Created' : 'Edited',
      document: doc.title,
      timestamp: doc.updatedAt.toISOString()
    }));

    // Build profile response
    const profile = {
      name: user.name,
      email: user.email,
      image: user.image || null,
      displayName: user.displayName || user.name,
      cursorColor: user.cursorColor,
      timeZone: user.timeZone,
      role: user.role,
      lastLogin: user.lastLogin,
      preferences: {
        theme: user.theme,
        fontSize: user.fontSize,
        fontFamily: user.fontFamily,
        lineSpacing: user.lineSpacing,
        autoSave: user.autoSave
      },
      stats: {
        documentsCreated,
        documentsShared,
        lastEditedDocument: lastDocument ? lastDocument.title : 'No documents yet'
      },
      recentActivity
    };

    return NextResponse.json(profile);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching profile:', err);
    console.error('Error stack:', err.stack);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Profile UPDATE - Session:', session);
    
    if (!session?.user?.email) {
      console.log('Profile UPDATE - No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    console.log('Profile UPDATE - Request body:', body);
    
    const {
      name,
      displayName,
      cursorColor,
      timeZone,
      theme,
      fontSize,
      fontFamily,
      lineSpacing,
      autoSave,
      image
    } = body;

    // Find and update user
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      console.log('Profile UPDATE - User not found for email:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Profile UPDATE - User found, updating fields...');

    // Update fields if provided with validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      if (name.length > 100) {
        return NextResponse.json({ error: 'Name cannot exceed 100 characters' }, { status: 400 });
      }
      user.name = name.trim();
    }
    
    if (displayName !== undefined) {
      if (displayName && displayName.length > 100) {
        return NextResponse.json({ error: 'Display name cannot exceed 100 characters' }, { status: 400 });
      }
      user.displayName = displayName;
    }
    
    if (cursorColor !== undefined) {
      // Validate hex color format
      if (cursorColor && !/^#[0-9A-F]{6}$/i.test(cursorColor)) {
        return NextResponse.json({ error: 'Invalid cursor color format. Use hex format like #6366F1' }, { status: 400 });
      }
      user.cursorColor = cursorColor;
    }
    
    if (timeZone !== undefined) user.timeZone = timeZone;
    
    if (theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(theme)) {
        return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
      }
      user.theme = theme;
    }
    
    if (fontSize !== undefined) user.fontSize = fontSize;
    if (fontFamily !== undefined) user.fontFamily = fontFamily;
    if (lineSpacing !== undefined) user.lineSpacing = lineSpacing;
    if (autoSave !== undefined) user.autoSave = autoSave;
    if (image !== undefined) user.image = image;

    // Save with validation error handling
    try {
      await user.save();
      console.log('Profile UPDATE - User saved successfully');
    } catch (saveError: unknown) {
      const err = saveError as Error & { name: string; errors?: Record<string, { message: string }> };
      console.error('Profile UPDATE - Validation error:', err);
      
      // Handle Mongoose validation errors
      if (err.name === 'ValidationError' && err.errors) {
        const errors = Object.values(err.errors).map((e) => e.message);
        return NextResponse.json(
          { error: 'Validation failed', details: errors.join(', ') },
          { status: 400 }
        );
      }
      
      throw saveError; // Re-throw if not a validation error
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: {
        name: user.name,
        displayName: user.displayName,
        cursorColor: user.cursorColor,
        timeZone: user.timeZone,
        image: user.image,
        preferences: {
          theme: user.theme,
          fontSize: user.fontSize,
          fontFamily: user.fontFamily,
          lineSpacing: user.lineSpacing,
          autoSave: user.autoSave
        }
      }
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string };
    console.error('Error updating profile:', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    // Provide more detailed error response
    const errorResponse: { error: string; details?: string; type?: string } = { 
      error: 'Failed to update profile' 
    };
    
    if (err.message) {
      errorResponse.details = err.message;
    }
    
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      errorResponse.type = 'database';
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete all user's documents
    await Document.deleteMany({ owner: user._id });

    // Delete all shares created by user
    await DocumentShare.deleteMany({ sharedBy: user._id });

    // Delete user account
    await User.deleteOne({ _id: user._id });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
