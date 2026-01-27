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

    // Check ownership - get owner's email
    let isOwner = false;
    if (document.owner) {
      const ownerUser = await db.collection('users').findOne({
        _id: document.owner
      });
      isOwner = ownerUser?.email === session.user.email;
    }

    // For now, return empty collaborators list since DocumentShare uses Mongoose
    // This will be enhanced when share functionality is fully implemented
    return NextResponse.json({
      collaborators: [],
      shares: [],
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

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    const { id: documentId } = await params;
    const { email, permission } = await request.json();

    // Validate input
    if (!email || !permission) {
      return NextResponse.json(
        { error: 'Email and permission are required' },
        { status: 400 }
      );
    }

    if (!['viewer', 'editor', 'owner'].includes(permission)) {
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
    const existingShare = await DocumentShare.findOne({
      documentId,
      sharedWithEmail: email.toLowerCase(),
    });

    if (existingShare) {
      return NextResponse.json(
        { error: 'Document already shared with this user' },
        { status: 400 }
      );
    }

    // Find the recipient user (if they exist)
    const recipientUser = await User.findOne({ email: email.toLowerCase() });

    // Create share record
    const share = await DocumentShare.create({
      documentId,
      sharedBy: user._id,
      sharedWith: recipientUser?._id || null,
      sharedWithEmail: email.toLowerCase(),
      permission,
    });

    // Populate the share before returning
    await share.populate('sharedWith', 'name email');

    // TODO: Send email notification to the recipient
    // This would be implemented with an email service like SendGrid or Resend

    return NextResponse.json({
      message: 'Document shared successfully',
      share: share.toObject(),
    });
  } catch (error) {
    console.error('Error sharing document:', error);
    return NextResponse.json(
      { error: 'Failed to share document' },
      { status: 500 }
    );
  }
}
