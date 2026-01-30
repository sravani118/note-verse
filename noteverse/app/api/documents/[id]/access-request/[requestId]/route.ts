/**
 * Handle Access Request (Approve/Reject)
 * PATCH /api/documents/[id]/access-request/[requestId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
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
    const { id: documentId, requestId } = await params;
    const body = await request.json();
    const { action } = body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Find the access request
    const accessRequest = await db.collection('accessRequests').findOne({
      _id: new ObjectId(requestId),
      status: 'pending'
    });

    if (!accessRequest) {
      return NextResponse.json(
        { error: 'Access request not found or already processed' },
        { status: 404 }
      );
    }

    // Find the document
    const document = await db.collection('documents').findOne({
      _id: accessRequest.documentId
    });

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
        { error: 'Only the owner can approve or reject access requests' },
        { status: 403 }
      );
    }

    if (action === 'approve') {
      // Ensure requesterId is an ObjectId
      const requesterId = accessRequest.requesterId instanceof ObjectId 
        ? accessRequest.requesterId 
        : new ObjectId(accessRequest.requesterId);

      // Remove ALL existing entries for this user (by userId OR email) to prevent duplicates
      await db.collection('documents').updateOne(
        { _id: document._id },
        {
          $pull: {
            sharedWith: {
              $or: [
                { userId: requesterId },
                { email: accessRequest.requesterEmail.toLowerCase() }
              ]
            }
          } as any
        }
      );

      console.log(`🧹 Removed any existing entries for ${accessRequest.requesterEmail}`);

      // Now add the user with editor permission (guaranteed no duplicates)
      await db.collection('documents').updateOne(
        { _id: document._id },
        {
          $push: {
            sharedWith: {
              userId: requesterId,
              email: accessRequest.requesterEmail.toLowerCase(),
              role: 'editor',
              sharedAt: new Date()
            }
          } as any
        }
      );

      console.log(`✅ Access request approved: ${accessRequest.requesterEmail} granted edit access to "${document.title}"`);
      console.log(`   Added to sharedWith: userId=${requesterId.toString()}, role=editor`);
    } else {
      console.log(`❌ Access request rejected: ${accessRequest.requesterEmail} denied edit access to "${document.title}"`);
    }

    // Update request status
    await db.collection('accessRequests').updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: action === 'approve' ? 'approved' : 'rejected',
          processedBy: user._id,
          processedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: action === 'approve' 
        ? 'Edit access granted successfully' 
        : 'Access request rejected'
    });

  } catch (error) {
    console.error('Error processing access request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
