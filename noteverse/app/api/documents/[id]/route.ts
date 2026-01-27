/**
 * Document API Routes
 * 
 * Handles CRUD operations for documents
 * GET - Fetch document by ID
 * PUT - Update document (triggers version save)
 * DELETE - Delete document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET /api/documents/[id]
 * Fetch a single document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

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
      // For new documents that don't exist yet, return a default empty document
      // This allows the editor to work and will be created on first save
      if (session?.user?.email) {
        return NextResponse.json({
          success: true,
          document: {
            id: documentId,
            title: 'Untitled Document',
            content: '',
            owner: null,
            userId: {
              email: session.user.email,
              name: session.user.name || session.user.email
            },
            visibility: 'restricted',
            publicPermission: 'viewer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            wordCount: 0,
            characterCount: 0,
            isNew: true // Flag to indicate this is a new document
          }
        });
      }
      
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Fetch owner user details if owner exists
    let ownerUser = null;
    if (document.owner) {
      ownerUser = await db.collection('users').findOne({
        _id: document.owner
      });
    }

    // Note: Access control is handled in the UI layer
    // This endpoint returns document data which the UI uses to determine permissions

    return NextResponse.json({
      success: true,
      document: {
        id: document._id.toString(),
        title: document.title,
        content: document.content,
        owner: document.owner ? document.owner.toString() : null,
        userId: ownerUser ? {
          email: ownerUser.email,
          name: ownerUser.name
        } : null,
        visibility: document.visibility || 'restricted',
        publicPermission: document.publicPermission || 'viewer',
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        wordCount: document.wordCount || 0,
        characterCount: document.characterCount || 0
      }
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/documents/[id]
 * Update document content and metadata
 * Automatically creates version history
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;
    const body = await request.json();
    const { title, content, wordCount, characterCount } = body;

    // Handle guest users (no session) or authenticated users
    let userId: ObjectId | null = null;
    if (session?.user?.email) {
      // Try to find user by email
      const user = await db.collection('users').findOne({
        email: session.user.email
      });
      if (user) {
        userId = user._id;
      } else if (session.user.id && ObjectId.isValid(session.user.id)) {
        // Fallback to session ID if user not found by email
        userId = new ObjectId(session.user.id);
      }
    }

    // Handle both MongoDB ObjectId and custom document IDs
    let currentDocument;
    let docObjectId;
    
    if (ObjectId.isValid(documentId)) {
      // Standard MongoDB ObjectId
      docObjectId = new ObjectId(documentId);
      currentDocument = await db.collection('documents').findOne({
        _id: docObjectId
      });
    } else {
      // Custom string ID (e.g., doc-1769406684982-dkluhj1r6)
      currentDocument = await db.collection('documents').findOne({
        customId: documentId
      });
      docObjectId = currentDocument?._id;
    }

    // If document doesn't exist, create it
    if (!currentDocument) {
      const newDoc = {
        customId: documentId,
        title: title || 'Untitled Document',
        content: content || '',
        owner: userId,
        visibility: 'restricted',
        publicPermission: 'viewer',
        wordCount: wordCount || 0,
        characterCount: characterCount || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('documents').insertOne(newDoc);
      docObjectId = result.insertedId;

      console.log(`📄 Created new document ${documentId}`);

      return NextResponse.json({
        success: true,
        message: 'Document created successfully',
        documentId: result.insertedId.toString()
      });
    }

    // Check permissions (skip for guest users)
    if (userId && currentDocument.owner) {
      const isOwner = currentDocument.owner.equals(userId);
      if (!isOwner) {
        const hasWriteAccess = await db.collection('sharepermissions').findOne({
          document: docObjectId,
          sharedWith: userId,
          permission: { $in: ['edit', 'owner'] }
        });

        if (!hasWriteAccess) {
          return NextResponse.json(
            { error: 'Write access denied' },
            { status: 403 }
          );
        }
      }
    }

    // Update document
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (wordCount !== undefined) updateData.wordCount = wordCount;
    if (characterCount !== undefined) updateData.characterCount = characterCount;

    await db.collection('documents').updateOne(
      { _id: docObjectId },
      { $set: updateData }
    );

    // Create version snapshot (auto-save every 5 minutes or manual save) - only for authenticated users
    if (userId && content) {
      const lastVersion = await db.collection('documentVersions')
        .findOne(
          { document: docObjectId },
          { sort: { versionNumber: -1 } }
        );

      const shouldCreateVersion = !lastVersion || 
        (Date.now() - lastVersion.createdAt.getTime() > 5 * 60 * 1000); // 5 minutes

      if (shouldCreateVersion) {
        const versionNumber = (lastVersion?.versionNumber || 0) + 1;
        
        await db.collection('documentVersions').insertOne({
          document: docObjectId,
          versionNumber,
          title: title || currentDocument.title,
          content,
          createdBy: userId,
          changeType: 'auto',
          wordCount: wordCount || 0,
          characterCount: characterCount || 0,
          createdAt: new Date()
        });

        console.log(`📝 Created version ${versionNumber} for document ${documentId}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Document updated successfully'
    });

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete a document (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const userId = new ObjectId(session.user.id);
    const docObjectId = new ObjectId(documentId);

    // Check if user is owner
    const document = await db.collection('documents').findOne({
      _id: docObjectId,
      owner: userId
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Delete document and related data
    await Promise.all([
      db.collection('documents').deleteOne({ _id: docObjectId }),
      db.collection('documentVersions').deleteMany({ document: docObjectId }),
      db.collection('sharepermissions').deleteMany({ document: docObjectId }),
      db.collection('comments').deleteMany({ document: docObjectId })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
