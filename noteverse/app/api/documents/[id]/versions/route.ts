/**
 * Document Versions API Routes
 * 
 * Handles document version history
 * GET - Fetch all versions for a document
 * POST - Create a manual version snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET /api/documents/[id]/versions
 * Fetch version history for a document
 */
export async function GET(
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

    // Check if user has access to document
    const document = await db.collection('documents').findOne({
      _id: docObjectId
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const isOwner = document.owner.equals(userId);
    if (!isOwner) {
      const hasAccess = await db.collection('sharepermissions').findOne({
        document: docObjectId,
        sharedWith: userId
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Fetch all versions, sorted by version number (newest first)
    const versions = await db.collection('documentVersions')
      .aggregate([
        {
          $match: { document: docObjectId }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'author'
          }
        },
        {
          $unwind: '$author'
        },
        {
          $sort: { versionNumber: -1 }
        },
        {
          $project: {
            _id: 1,
            versionNumber: 1,
            title: 1,
            content: 1,
            changeType: 1,
            description: 1,
            wordCount: 1,
            characterCount: 1,
            createdAt: 1,
            author: {
              id: '$author._id',
              name: '$author.name',
              email: '$author.email'
            }
          }
        }
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      versions: versions.map(v => ({
        id: v._id.toString(),
        versionNumber: v.versionNumber,
        title: v.title,
        content: v.content,
        changeType: v.changeType,
        description: v.description,
        wordCount: v.wordCount,
        characterCount: v.characterCount,
        createdAt: v.createdAt,
        author: {
          id: v.author.id.toString(),
          name: v.author.name,
          email: v.author.email
        }
      }))
    });

  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/[id]/versions
 * Create a manual version snapshot
 */
export async function POST(
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
    const body = await request.json();
    const { description } = body;

    // Validate ObjectId
    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    const userId = new ObjectId(session.user.id);
    const docObjectId = new ObjectId(documentId);

    // Fetch current document
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

    // Get next version number
    const lastVersion = await db.collection('documentVersions')
      .findOne(
        { document: docObjectId },
        { sort: { versionNumber: -1 } }
      );

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Create manual version
    const newVersion = {
      document: docObjectId,
      versionNumber,
      title: document.title,
      content: document.content || '',
      createdBy: userId,
      changeType: 'manual',
      description: description || 'Manual save',
      wordCount: document.wordCount || 0,
      characterCount: document.characterCount || 0,
      createdAt: new Date()
    };

    const result = await db.collection('documentVersions').insertOne(newVersion);

    // Fetch author info for response
    const author = await db.collection('users').findOne({ _id: userId });

    return NextResponse.json({
      success: true,
      message: 'Version created successfully',
      version: {
        id: result.insertedId.toString(),
        versionNumber,
        title: newVersion.title,
        changeType: newVersion.changeType,
        description: newVersion.description,
        wordCount: newVersion.wordCount,
        characterCount: newVersion.characterCount,
        createdAt: newVersion.createdAt,
        author: {
          id: userId.toString(),
          name: author?.name,
          email: author?.email
        }
      }
    });

  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
