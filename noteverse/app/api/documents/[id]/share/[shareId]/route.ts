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
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

    const { db } = await connectToDatabase();
    const { id: documentId, shareId } = await params;
    const { permission } = await request.json();

    // Validate permission
    if (!permission || !['viewer', 'editor'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission. Must be "viewer" or "editor"' },
        { status: 400 }
      );
    }

    // Find document and check ownership
    let document;
    if (ObjectId.isValid(documentId)) {
      document = await db.collection('documents').findOne({
        _id: new ObjectId(documentId)
      });
    } else {
      document = await db.collection('documents').findOne({
        customId: documentId
      });
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if user is owner
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user || !document.owner.equals(user._id)) {
      return NextResponse.json(
        { error: 'Only the owner can modify permissions' },
        { status: 403 }
      );
    }

    // Update the share
    const result = await db.collection('documentshares').updateOne(
      { _id: new ObjectId(shareId) },
      { $set: { permission, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Permission updated successfully',
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

    const { db } = await connectToDatabase();
    const { id: documentId, shareId } = await params;

    // Find document and check ownership
    let document;
    if (ObjectId.isValid(documentId)) {
      document = await db.collection('documents').findOne({
        _id: new ObjectId(documentId)
      });
    } else {
      document = await db.collection('documents').findOne({
        customId: documentId
      });
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if user is owner
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user || !document.owner.equals(user._id)) {
      return NextResponse.json(
        { error: 'Only the owner can remove collaborators' },
        { status: 403 }
      );
    }

    // Delete the share
    const result = await db.collection('documentshares').deleteOne({
      _id: new ObjectId(shareId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
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
