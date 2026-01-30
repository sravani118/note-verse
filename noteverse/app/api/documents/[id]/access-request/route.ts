/**
 * Document Access Request API
 * POST - Request edit access to a document
 * GET - Get pending access requests for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/documents/[id]/access-request
 * Request edit access to a document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;

    // Find the document
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
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get requester info
    const requester = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!requester) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already an editor or owner
    if (document.owner?.equals(requester._id)) {
      return NextResponse.json(
        { error: 'You already own this document' },
        { status: 400 }
      );
    }

    const existingShare = document.sharedWith?.find((share: any) => 
      share.userId?.equals(requester._id) && share.role === 'editor'
    );

    if (existingShare) {
      return NextResponse.json(
        { error: 'You already have edit access' },
        { status: 400 }
      );
    }

    // Check if there's already a pending request
    const existingRequest = await db.collection('accessRequests').findOne({
      documentId: document._id,
      requesterEmail: session.user.email,
      status: 'pending'
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending request for this document' },
        { status: 400 }
      );
    }

    // Create access request
    const accessRequest = {
      documentId: document._id,
      documentTitle: document.title,
      requesterEmail: session.user.email,
      requesterName: requester.name || session.user.email,
      requesterId: requester._id,
      ownerId: document.owner,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('accessRequests').insertOne(accessRequest);

    console.log(`📧 Access request created: ${session.user.email} requested edit access to "${document.title}"`);

    return NextResponse.json({
      success: true,
      message: 'Edit access request sent successfully'
    });

  } catch (error) {
    console.error('Error creating access request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/[id]/access-request
 * Get pending access requests for a document (owner only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;

    // Find the document
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
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get current user
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is owner
    if (!document.owner?.equals(user._id)) {
      return NextResponse.json(
        { error: 'Only the owner can view access requests' },
        { status: 403 }
      );
    }

    // Get pending requests
    const requests = await db.collection('accessRequests')
      .find({
        documentId: document._id,
        status: 'pending'
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`📋 Retrieved ${requests.length} pending access requests for document "${document.title}"`);

    return NextResponse.json({
      success: true,
      requests: requests.map(req => ({
        _id: req._id.toString(),
        requesterEmail: req.requesterEmail,
        requesterName: req.requesterName,
        createdAt: req.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching access requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
