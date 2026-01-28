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
 * Fetch all collaborators for a document
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

    // Fetch all shares for this document
    const shares = await db.collection('documentshares')
      .find({ documentId: docObjectId.toString() })
      .toArray();

    // Populate shared user details
    const collaborators = await Promise.all(
      shares.map(async (share) => {
        let sharedWithUser = null;
        if (share.sharedWith) {
          sharedWithUser = await db.collection('users').findOne({
            _id: new ObjectId(share.sharedWith)
          });
        }

        return {
          _id: share._id.toString(),
          sharedWithEmail: share.sharedWithEmail,
          permission: share.permission,
          sharedWith: sharedWithUser ? {
            name: sharedWithUser.name,
            email: sharedWithUser.email
          } : null,
          createdAt: share.createdAt
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
 * Invite a new collaborator
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

    // Check if already shared
    const existingShare = await db.collection('documentshares').findOne({
      documentId: docObjectId.toString(),
      sharedWithEmail: email.toLowerCase(),
    });

    if (existingShare) {
      return NextResponse.json(
        { error: 'Document already shared with this user' },
        { status: 400 }
      );
    }

    // Find the recipient user (if they exist)
    const recipientUser = await db.collection('users').findOne({
      email: email.toLowerCase()
    });

    // Create share record
    const shareDoc = {
      documentId: docObjectId.toString(),
      sharedBy: user._id,
      sharedWith: recipientUser?._id || null,
      sharedWithEmail: email.toLowerCase(),
      permission,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('documentshares').insertOne(shareDoc);

    return NextResponse.json({
      message: 'Document shared successfully',
      share: {
        _id: result.insertedId.toString(),
        ...shareDoc,
        sharedWith: recipientUser ? {
          name: recipientUser.name,
          email: recipientUser.email
        } : null
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
