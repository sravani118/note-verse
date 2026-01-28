/**
 * Comments API Route
 * 
 * GET - Fetch all comments for a document
 * POST - Create a new comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET /api/documents/[id]/comments
 * Fetch all comments for a document
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

    // Find document
    let document;
    let docObjectId;
    
    if (ObjectId.isValid(documentId)) {
      docObjectId = new ObjectId(documentId);
      document = await db.collection('documents').findOne({
        _id: docObjectId
      });
    } else {
      document = await db.collection('documents').findOne({
        customId: documentId
      });
      docObjectId = document?._id;
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch comments for this document
    const comments = await db.collection('comments')
      .find({ 
        document: docObjectId,
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Populate author details
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const author = await db.collection('users').findOne({
          _id: comment.author
        });

        return {
          id: comment._id.toString(),
          text: comment.content,
          content: comment.content,
          timestamp: comment.createdAt,
          user: author ? {
            id: author._id.toString(),
            name: author.name,
            email: author.email
          } : {
            id: 'unknown',
            name: 'Unknown User',
            email: ''
          },
          isResolved: comment.isResolved || false
        };
      })
    );

    return NextResponse.json({
      success: true,
      comments: commentsWithAuthors
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/[id]/comments
 * Create a new comment
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
    const { content } = await request.json();

    // Validate input
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
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

    // Create comment
    const commentDoc = {
      document: docObjectId,
      author: user._id,
      content: content.trim(),
      isResolved: false,
      isDeleted: false,
      reactions: [],
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('comments').insertOne(commentDoc);

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      comment: {
        id: result.insertedId.toString(),
        text: commentDoc.content,
        content: commentDoc.content,
        timestamp: commentDoc.createdAt,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email
        },
        isResolved: false
      }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
