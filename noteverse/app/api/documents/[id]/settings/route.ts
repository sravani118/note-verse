/**
 * Document Settings API Route
 * 
 * GET /api/documents/[id]/settings - Get document settings
 * PATCH /api/documents/[id]/settings - Update document settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET document settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;

    // Handle both MongoDB ObjectId and custom document IDs
    let document;
    
    if (ObjectId.isValid(documentId)) {
      // Standard MongoDB ObjectId
      document = await db.collection('documents').findOne({
        _id: new ObjectId(documentId)
      });
    } else {
      // Custom string ID (e.g., doc-1769406684982-dkluhj1r6)
      document = await db.collection('documents').findOne({
        customId: documentId
      });
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get current user
    const currentUser = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check access permission
    const isOwner = document.owner.equals(currentUser._id);
    const isCollaborator = document.collaborators?.some(
      (collab: { user: ObjectId; role: string }) => collab.user.equals(currentUser._id)
    );

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get owner info
    const owner = await db.collection('users').findOne({
      _id: document.owner
    });

    // Return document settings
    return NextResponse.json({
      title: document.title || 'Untitled Document',
      owner: {
        name: owner?.name || 'Unknown',
        email: owner?.email || 'unknown@email.com',
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      visibility: document.visibility || 'restricted',
      publicPermission: document.publicPermission || 'viewer',
      chatEnabled: document.chatEnabled ?? true,
      defaultFont: document.defaultFont || 'Arial',
      defaultFontSize: document.defaultFontSize || '14',
      pageWidth: document.pageWidth || 'normal',
      spellCheck: document.spellCheck ?? true,
      isArchived: document.isArchived || false,
      collaboratorCount: document.collaborators?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching document settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH update document settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;

    // Get update data
    const updates = await request.json();

    // Handle both MongoDB ObjectId and custom document IDs
    let document;
    let docObjectId: ObjectId;
    if (ObjectId.isValid(documentId)) {
      // Standard MongoDB ObjectId
      docObjectId = new ObjectId(documentId);
      document = await db.collection('documents').findOne({
        _id: docObjectId
      });
    } else {
      // Custom string ID
      document = await db.collection('documents').findOne({
        customId: documentId
      });
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      docObjectId = document._id;
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get current user
    const currentUser = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = document.owner.equals(currentUser._id);

    // Only owner can change most settings
    const ownerOnlyFields = [
      'visibility',
      'publicPermission',
      'chatEnabled',
      'defaultFont',
      'defaultFontSize',
      'pageWidth',
      'spellCheck',
      'isArchived',
    ];

    // Check if trying to update owner-only fields
    const hasOwnerOnlyUpdates = Object.keys(updates).some(key =>
      ownerOnlyFields.includes(key)
    );

    if (hasOwnerOnlyUpdates && !isOwner) {
      return NextResponse.json(
        { error: 'Only document owner can update these settings' },
        { status: 403 }
      );
    }

    // Apply updates (validate allowed fields)
    const allowedUpdates = [
      'visibility',
      'publicPermission',
      'chatEnabled',
      'defaultFont',
      'defaultFontSize',
      'pageWidth',
      'spellCheck',
      'isArchived',
    ];

    const updateFields: Record<string, unknown> = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateFields[key] = updates[key];
      }
    });

    // Update the document
    updateFields.updatedAt = new Date();
    
    await db.collection('documents').updateOne(
      { _id: docObjectId },
      { $set: updateFields }
    );

    // Fetch updated document
    const updatedDocument = await db.collection('documents').findOne({
      _id: docObjectId
    });

    if (!updatedDocument) {
      return NextResponse.json({ error: 'Document not found after update' }, { status: 404 });
    }

    // Get owner info
    const owner = await db.collection('users').findOne({
      _id: updatedDocument.owner
    });

    // Return updated settings
    return NextResponse.json({
      title: updatedDocument.title || 'Untitled Document',
      owner: {
        name: owner?.name || 'Unknown',
        email: owner?.email || 'unknown@email.com',
      },
      createdAt: updatedDocument.createdAt,
      updatedAt: updatedDocument.updatedAt,
      visibility: updatedDocument.visibility || 'restricted',
      publicPermission: updatedDocument.publicPermission || 'viewer',
      chatEnabled: updatedDocument.chatEnabled ?? true,
      defaultFont: updatedDocument.defaultFont || 'Arial',
      defaultFontSize: updatedDocument.defaultFontSize || '14',
      pageWidth: updatedDocument.pageWidth || 'normal',
      spellCheck: updatedDocument.spellCheck ?? true,
      isArchived: updatedDocument.isArchived || false,
      collaboratorCount: updatedDocument.collaborators?.length || 0,
    });
  } catch (error) {
    console.error('Error updating document settings:', error);
    return NextResponse.json(
      { error: 'Failed to update document settings' },
      { status: 500 }
    );
  }
}
