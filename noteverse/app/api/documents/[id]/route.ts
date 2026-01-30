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
      console.log(`🔍 GET document by ObjectId ${documentId}:`, document ? `Found (title: "${document.title}", content length: ${document.content?.length || 0})` : 'Not found');
    } else {
      // Custom string ID (e.g., doc-1769406684982-dkluhj1r6)
      document = await db.collection('documents').findOne({
        customId: documentId
      });
      console.log(`🔍 GET document by customId ${documentId}:`, document ? `Found (title: "${document.title}", content length: ${document.content?.length || 0})` : 'Not found');
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

    // Enforce access control
    let hasAccess = false;
    let userRole = 'none';
    let currentUser: any = null;
    
    if (session?.user?.email) {
      currentUser = await db.collection('users').findOne({
        email: session.user.email
      });
      
      if (currentUser) {
        // Check if user is the owner
        if (document.owner?.equals(currentUser._id)) {
          hasAccess = true;
          userRole = 'owner';
        } else {
          // Check if user is in sharedWith array
          const sharedWith = document.sharedWith || [];
          const shareInfo = sharedWith.find((share: any) => 
            share.userId?.equals(currentUser._id)
          );
          
          if (shareInfo) {
            hasAccess = true;
            userRole = shareInfo.role;
          }
        }
      }
    }
    
    // Check public access
    if (!hasAccess && document.visibility === 'public') {
      hasAccess = true;
      userRole = document.publicPermission || 'viewer';
    }
    
    // Deny access if not authorized
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to view this document.' },
        { status: 403 }
      );
    }

    console.log(`📤 Returning document content: ${document.content?.length || 0} characters`);
    
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
        userRole, // Add user's role/permission
        canEdit: userRole === 'owner' || userRole === 'editor',
        settings: {
          chatEnabled: document.chatEnabled !== false,
          defaultFont: document.defaultFont || 'Arial',
          defaultFontSize: document.defaultFontSize || '14',
          pageWidth: document.pageWidth || 'normal',
          spellCheck: document.spellCheck !== false
        },
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
    let userEmail: string | null = null;
    
    if (session?.user?.email) {
      userEmail = session.user.email;
      // Try to find user by email
      const user = await db.collection('users').findOne({
        email: session.user.email
      });
      if (user) {
        userId = user._id;
      } else if (session.user.id && ObjectId.isValid(session.user.id)) {
        // Fallback to session ID if user not found by email
        userId = new ObjectId(session.user.id);
      } else {
        console.log(`⚠️ User not found in database: ${session.user.email}`);
        // User has session but no user record - this shouldn't happen for shared docs
      }
    }

    // Handle both MongoDB ObjectId and custom document IDs
    let currentDocument;
    let docObjectId;
    
    console.log(`📝 PUT document ${documentId}:`, { title, contentLength: content?.length || 0 });
    
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
      console.log(`🆕 Creating new document with title: "${title || 'Untitled Document'}"`);
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

      console.log(`✅ Created new document ${documentId} with _id ${result.insertedId}`);

      return NextResponse.json({
        success: true,
        message: 'Document created successfully',
        documentId: result.insertedId.toString()
      });
    }

    console.log(`📄 Updating existing document. Current title: "${currentDocument.title}"`);
    console.log(`🔐 Access check:`, { 
      userId: userId?.toString(), 
      userEmail, 
      hasSession: !!session,
      documentOwner: currentDocument.owner?.toString(),
      sharedWithCount: currentDocument.sharedWith?.length || 0
    });
    
    // Check permissions - Must have userId OR valid session for shared docs
    if (currentDocument.owner) {
      const isOwner = userId && currentDocument.owner.equals(userId);
      
      if (!isOwner) {
        // Check if user has edit permission in sharedWith array
        const sharedWith = currentDocument.sharedWith || [];
        const shareInfo = sharedWith.find((share: any) => 
          (userId && share.userId?.equals(userId)) || 
          (userEmail && share.email === userEmail)
        );
        
        console.log(`🔍 Share lookup for ${userEmail}:`, { 
          foundShare: !!shareInfo, 
          shareRole: shareInfo?.role,
          sharedWithEmails: sharedWith.map((s: any) => s.email)
        });
        
        const hasEditAccess = shareInfo && shareInfo.role === 'editor';
        
        // Also check if document is public with editor permission
        const hasPublicEditAccess = 
          currentDocument.visibility === 'public' && 
          currentDocument.publicPermission === 'editor';

        if (!hasEditAccess && !hasPublicEditAccess) {
          console.log(`❌ Edit access denied for ${userEmail || 'unknown user'}`);
          return NextResponse.json(
            { error: 'Edit access denied. You only have viewer permission.' },
            { status: 403 }
          );
        }
        
        console.log(`✅ Edit access granted for ${userEmail}: ${hasEditAccess ? 'shared editor' : 'public editor'}`);
      } else {
        console.log(`✅ Edit access granted for ${userEmail}: owner`);
      }
    } else {
      console.log(`⚠️ Document has no owner, allowing save for authenticated user`);
    }

    // Update document
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (wordCount !== undefined) updateData.wordCount = wordCount;
    if (characterCount !== undefined) updateData.characterCount = characterCount;

    console.log(`💾 Updating document with:`, { 
      title: updateData.title, 
      contentLength: updateData.content?.length || 0,
      wordCount: updateData.wordCount,
      characterCount: updateData.characterCount 
    });

    const updateResult = await db.collection('documents').updateOne(
      { _id: docObjectId },
      { $set: updateData }
    );

    console.log(`✅ Document updated successfully:`, { 
      matched: updateResult.matchedCount, 
      modified: updateResult.modifiedCount 
    });

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
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const { id: documentId } = await params;

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
      // Custom string ID (e.g., doc-1769406684982-dkluhj1r6)
      document = await db.collection('documents').findOne({
        customId: documentId
      });
      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      docObjectId = document._id;
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user is owner
    if (!document.owner.equals(user._id)) {
      return NextResponse.json(
        { error: 'Only the owner can delete this document' },
        { status: 403 }
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
