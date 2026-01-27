/**
 * Individual Share Management API Route
 * 
 * Handles operations on specific share records:
 * - PATCH: Update collaborator permission
 * - DELETE: Remove collaborator access
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mongoose from 'mongoose';
import Document from '@/lib/models/Document';
import DocumentShare from '@/lib/models/DocumentShare';
import User from '@/lib/models/User';

/**
 * PATCH /api/documents/[id]/share/[shareId]
 * Update collaborator permission
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    const { id: documentId, shareId } = await params;
    const { permission } = await request.json();

    // Validate permission
    if (!permission || !['viewer', 'editor', 'owner'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission. Must be "viewer", "editor", or "owner"' },
        { status: 400 }
      );
    }

    // Check if user is the owner
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const isOwner = document.owner?.toString() === user._id.toString();
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the owner can modify permissions' },
        { status: 403 }
      );
    }

    // Update the share
    const share = await DocumentShare.findOneAndUpdate(
      { _id: shareId, documentId },
      { permission },
      { new: true }
    ).populate('sharedWith', 'name email');

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Permission updated successfully',
      share: share.toObject(),
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json(
      { error: 'Failed to update permission' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]/share/[shareId]
 * Remove collaborator access
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    const { id: documentId, shareId } = await params;

    // Check if user is the owner
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const isOwner = document.owner?.toString() === user._id.toString();
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the owner can remove collaborators' },
        { status: 403 }
      );
    }

    // Delete the share
    const share = await DocumentShare.findOneAndDelete({
      _id: shareId,
      documentId,
    });

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Collaborator removed successfully',
    });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
}
