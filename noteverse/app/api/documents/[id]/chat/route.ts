/**
 * Chat API Route
 * 
 * GET - Fetch all chat messages for a document
 * POST - Send a new chat message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createChatMessage } from '@/lib/models/ChatMessage';

/**
 * GET /api/documents/[id]/chat
 * Fetch all chat messages for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ Chat GET: Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;

    console.log(`📨 Fetching chat messages for document: ${documentId}, user: ${session.user.email}`);

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
      
      // If document doesn't exist yet (new document not saved), return empty chat
      // This is normal behavior - documents are created on first save
      if (!document) {
        console.log(`ℹ️ Chat GET: Document ${documentId} not found (new document - will be created on first save)`);
        return NextResponse.json({
          success: true,
          messages: [],
          count: 0,
          info: 'Document not yet created. Chat will be available after first save.'
        });
      }
      docObjectId = document._id;
    }

    if (!document) {
      console.log(`ℹ️ Chat GET: Document not found: ${documentId} (returning empty chat)`);
      return NextResponse.json({
        success: true,
        messages: [],
        count: 0,
        info: 'Document not yet created. Chat will be available after first save.'
      });
    }

    // Verify user has access to this document
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user) {
      console.log(`❌ Chat GET: User not found: ${session.user.email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if document has owner field
    if (!document.owner) {
      console.log(`❌ Chat GET: Document ${documentId} has no owner field`);
      return NextResponse.json({ error: 'Document has no owner' }, { status: 500 });
    }

    const isOwner = document.owner.toString() === user._id.toString();
    
    // Check if user has shared access
    const shareAccess = await db.collection('documentshares').findOne({
      documentId: docObjectId,
      sharedWithEmail: session.user.email
    });

    // Check if document is public
    const hasPublicAccess = document.visibility === 'public';

    if (!isOwner && !shareAccess && !hasPublicAccess) {
      console.log(`❌ Chat GET: Access denied for ${session.user.email} to document ${documentId}`);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch chat messages for this document
    // Note: Always return an array (even if empty) instead of 404
    // This prevents console errors when a document has no chat messages yet
    const messages = await db.collection('chatmessages')
      .find({ 
        documentId: docObjectId,
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: 1 }) // Oldest first for chat
      .toArray();

    console.log(`📨 Fetched ${messages.length} chat messages for document ${documentId}`);

    // Format messages for response
    const formattedMessages = messages.map(msg => ({
      id: msg._id?.toString() || 'unknown',
      senderId: msg.senderId?.toString() || 'unknown',
      senderName: msg.senderName || 'Unknown User',
      senderEmail: msg.senderEmail || '',
      message: msg.message || '',
      timestamp: msg.createdAt || new Date()
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch chat messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/[id]/chat
 * Send a new chat message
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
    const { message } = await request.json();

    // Validate input
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
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

    // Find user
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user has access (at least viewer permission)
    if (!document.owner) {
      console.log(`❌ Chat POST: Document ${documentId} has no owner field`);
      return NextResponse.json({ error: 'Document has no owner' }, { status: 500 });
    }

    const isOwner = document.owner.toString() === user._id.toString();
    
    const shareAccess = await db.collection('documentshares').findOne({
      documentId: docObjectId,
      sharedWithEmail: session.user.email
    });

    const hasPublicAccess = document.visibility === 'public';

    if (!isOwner && !shareAccess && !hasPublicAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user has permission to send messages (editors and owners only)
    let canSendMessage = isOwner;
    
    if (shareAccess && shareAccess.permission === 'editor') {
      canSendMessage = true;
    }
    
    if (hasPublicAccess && document.publicPermission === 'editor') {
      canSendMessage = true;
    }

    console.log('Chat permission check:', {
      isOwner,
      hasShareAccess: !!shareAccess,
      sharePermission: shareAccess?.permission,
      hasPublicAccess,
      publicPermission: document.publicPermission,
      canSendMessage
    });

    if (!canSendMessage) {
      return NextResponse.json(
        { error: 'Only editors and owners can send messages' },
        { status: 403 }
      );
    }

    // Create chat message
    const chatMessage = createChatMessage(
      docObjectId,
      user._id,
      user.name,
      user.email,
      message
    );

    const result = await db.collection('chatmessages').insertOne(chatMessage);

    return NextResponse.json({
      success: true,
      message: 'Chat message sent',
      chatMessage: {
        id: result.insertedId.toString(),
        senderId: user._id.toString(),
        senderName: user.name,
        senderEmail: user.email,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send chat message' },
      { status: 500 }
    );
  }
}
