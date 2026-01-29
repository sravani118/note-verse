/**
 * Documents API Route
 * 
 * GET - Fetch all documents for the current user
 * POST - Create a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * GET /api/documents
 * Fetch all documents owned by or shared with the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();

    // Find the user
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch documents owned by the user
    const ownedDocuments = await db.collection('documents')
      .find({ owner: user._id })
      .sort({ updatedAt: -1 })
      .toArray();

    // Fetch documents shared with the user (using sharedWith array)
    const sharedDocuments = await db.collection('documents')
      .find({ 
        'sharedWith.userId': user._id
      })
      .sort({ updatedAt: -1 })
      .toArray();

    // Format owned documents
    const formattedOwnedDocs = ownedDocuments.map(doc => ({
      id: doc.customId || doc._id.toString(),
      title: doc.title,
      content: doc.content || '',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isOwner: true,
      isShared: false
    }));

    // Format shared documents
    const formattedSharedDocs = await Promise.all(
      sharedDocuments.map(async (doc) => {
        // Get the owner info
        const owner = await db.collection('users').findOne({
          _id: doc.owner
        });

        // Find the current user's role in sharedWith
        const shareInfo = doc.sharedWith?.find((share: any) => 
          share.userId?.equals(user._id)
        );

        return {
          id: doc.customId || doc._id.toString(),
          title: doc.title,
          content: doc.content || '',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          isOwner: false,
          isShared: true,
          role: shareInfo?.role || 'viewer', // Include the user's role
          sharedAt: shareInfo?.sharedAt,
          owner: owner ? {
            name: owner.name,
            email: owner.email
          } : null
        };
      })
    );

    return NextResponse.json({
      success: true,
      documents: formattedOwnedDocs,
      sharedDocuments: formattedSharedDocs
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
/**
 * POST /api/documents
 * Create a new document (e.g., for "Make a copy")
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();

    // Find the user
    const user = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get title and content from request
    const { title, content } = await request.json();

    // Create new document
    const newDocument = {
      title: title || 'Untitled Document',
      content: content || '',
      owner: user._id,
      visibility: 'restricted', // Default to private
      publicPermission: 'viewer',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('documents').insertOne(newDocument);

    return NextResponse.json({
      success: true,
      message: 'Document created successfully',
      document: {
        _id: result.insertedId.toString(),
        ...newDocument
      }
    });

  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
