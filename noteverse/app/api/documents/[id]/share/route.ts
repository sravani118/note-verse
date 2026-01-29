/**
 * Document Share API Route
 * 
 * Handles document sharing operations:
 * - GET: Fetch all collaborators for a document
 * - POST: Invite a new collaborator
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Document from '@/lib/models/Document';
import DocumentShare from '@/lib/models/DocumentShare';

/**
 * GET /api/documents/[id]/share
 * Fetch all collaborators for a document from sharedWith array
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;

    // Find document by MongoDB ObjectId or custom ID
    let document;
    let docObjectId: ObjectId;
    
    if (ObjectId.isValid(documentId)) {
      docObjectId = new ObjectId(documentId);
      document = await db.collection('documents').findOne({
        _id: docObjectId
      });
    } else {
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

    // Check ownership - get owner's email
    let isOwner = false;
    if (document.owner) {
      const ownerUser = await db.collection('users').findOne({
        _id: document.owner
      });
      isOwner = ownerUser?.email === session.user.email;
    }

    // Get collaborators from document.sharedWith array
    const sharedWith = document.sharedWith || [];
    
    // Populate user details for each shared user
    const collaborators = await Promise.all(
      sharedWith.map(async (share: any) => {
        let sharedWithUser = null;
        if (share.userId) {
          sharedWithUser = await db.collection('users').findOne({
            _id: share.userId
          });
        }

        return {
          email: share.email,
          role: share.role,
          sharedAt: share.sharedAt,
          sharedWith: sharedWithUser ? {
            name: sharedWithUser.name,
            email: sharedWithUser.email
          } : {
            email: share.email
          }
        };
      })
    );

    return NextResponse.json({
      collaborators,
      shares: collaborators, // Keep both for compatibility
      isOwner,
    });
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborators' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/[id]/share
 * Invite a new collaborator by email (Google Docs style)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;
    const { email, permission } = await request.json();

    // Validate input
    if (!email || !permission) {
      return NextResponse.json(
        { error: 'Email and permission are required' },
        { status: 400 }
      );
    }

    if (!['viewer', 'editor'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission. Must be "viewer" or "editor"' },
        { status: 400 }
      );
    }

    // Find document
    let document;
    let docObjectId: ObjectId;
    
    if (ObjectId.isValid(documentId)) {
      docObjectId = new ObjectId(documentId);
      document = await db.collection('documents').findOne({
        _id: docObjectId
      });
    } else {
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

    // Check if user is the owner
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isOwner = document.owner?.equals(user._id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the owner can share this document' },
        { status: 403 }
      );
    }

    // Prevent sharing with self
    if (email.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'You cannot share with yourself' },
        { status: 400 }
      );
    }

    // Find the recipient user by email
    const recipientUser = await db.collection('users').findOne({
      email: email.toLowerCase()
    });

    if (!recipientUser) {
      return NextResponse.json(
        { error: 'User with this email does not exist. They need to create an account first.' },
        { status: 404 }
      );
    }

    // Check if already shared with this user
    const sharedWith = document.sharedWith || [];
    const alreadyShared = sharedWith.some((share: any) => 
      share.userId?.equals(recipientUser._id) || 
      share.email?.toLowerCase() === email.toLowerCase()
    );

    if (alreadyShared) {
      return NextResponse.json(
        { error: 'Already has access' },
        { status: 400 }
      );
    }

    // Add user to document.sharedWith array
    const result = await db.collection('documents').updateOne(
      { _id: docObjectId },
      {
        $push: {
          sharedWith: {
            userId: recipientUser._id,
            email: email.toLowerCase(),
            role: permission,
            sharedAt: new Date()
          }
        } as any,
        $set: {
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to share document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Document shared successfully',
      share: {
        sharedWith: {
          name: recipientUser.name,
          email: recipientUser.email
        },
        role: permission,
        sharedAt: new Date()
      },
    });
  } catch (error) {
    console.error('Error sharing document:', error);
    return NextResponse.json(
      { error: 'Failed to share document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]/share
 * Remove a collaborator from document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find document
    let document;
    let docObjectId: ObjectId;
    
    if (ObjectId.isValid(documentId)) {
      docObjectId = new ObjectId(documentId);
      document = await db.collection('documents').findOne({
        _id: docObjectId
      });
    } else {
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

    // Check if user is the owner
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isOwner = document.owner?.equals(user._id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the owner can remove collaborators' },
        { status: 403 }
      );
    }

    // Remove user from document.sharedWith array
    const result = await db.collection('documents').updateOne(
      { _id: docObjectId },
      {
        $pull: {
          sharedWith: {
            email: email.toLowerCase()
          }
        } as any,
        $set: {
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'User not found in shared list or already removed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Access removed successfully'
    });
  } catch (error) {
    console.error('Error removing share:', error);
    return NextResponse.json(
      { error: 'Failed to remove access' },
      { status: 500 }
    );
  }
}
