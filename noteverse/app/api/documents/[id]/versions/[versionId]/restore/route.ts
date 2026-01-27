/**
 * Restore Document Version API Route
 * 
 * POST - Restore a document to a specific version
 * The restored content will sync to all active collaborators in real-time via Yjs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/documents/[id]/versions/[versionId]/restore
 * Restore document to a specific version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
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
    const { id: documentId, versionId } = await params;

    // Validate ObjectIds
    if (!ObjectId.isValid(documentId) || !ObjectId.isValid(versionId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const userId = new ObjectId(session.user.id);
    const docObjectId = new ObjectId(documentId);
    const versionObjectId = new ObjectId(versionId);

    // Fetch document
    const document = await db.collection('documents').findOne({
      _id: docObjectId
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check write permissions
    const isOwner = document.owner.equals(userId);
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

    // Fetch the version to restore
    const versionToRestore = await db.collection('documentVersions').findOne({
      _id: versionObjectId,
      document: docObjectId
    });

    if (!versionToRestore) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Save current state as a version before restoring (backup)
    const lastVersion = await db.collection('documentVersions')
      .findOne(
        { document: docObjectId },
        { sort: { versionNumber: -1 } }
      );

    const backupVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    await db.collection('documentVersions').insertOne({
      document: docObjectId,
      versionNumber: backupVersionNumber,
      title: document.title,
      content: document.content || '',
      createdBy: userId,
      changeType: 'auto',
      description: `Backup before restoring to v${versionToRestore.versionNumber}`,
      wordCount: document.wordCount || 0,
      characterCount: document.characterCount || 0,
      createdAt: new Date()
    });

    // Restore the document to the selected version
    await db.collection('documents').updateOne(
      { _id: docObjectId },
      {
        $set: {
          title: versionToRestore.title,
          content: versionToRestore.content,
          wordCount: versionToRestore.wordCount,
          characterCount: versionToRestore.characterCount,
          updatedAt: new Date()
        }
      }
    );

    // Create a new version entry for the restore action
    const newVersionNumber = backupVersionNumber + 1;
    
    await db.collection('documentVersions').insertOne({
      document: docObjectId,
      versionNumber: newVersionNumber,
      title: versionToRestore.title,
      content: versionToRestore.content,
      createdBy: userId,
      changeType: 'restore',
      description: `Restored from v${versionToRestore.versionNumber}`,
      wordCount: versionToRestore.wordCount,
      characterCount: versionToRestore.characterCount,
      createdAt: new Date()
    });

    console.log(`🔄 Document ${documentId} restored to version ${versionToRestore.versionNumber}`);

    // Return the restored content
    // The client will update the Yjs document, which will sync to all collaborators
    return NextResponse.json({
      success: true,
      message: `Document restored to version ${versionToRestore.versionNumber}`,
      restoredContent: {
        title: versionToRestore.title,
        content: versionToRestore.content,
        wordCount: versionToRestore.wordCount,
        characterCount: versionToRestore.characterCount,
        versionNumber: versionToRestore.versionNumber
      }
    });

  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
