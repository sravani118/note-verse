import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * PATCH /api/documents/[id]/access
 * Update document general access settings (visibility and publicPermission)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await params;
    const { db } = await connectToDatabase();

    // Parse request body
    const { visibility, publicPermission } = await req.json();

    // Validate visibility
    if (visibility && !['restricted', 'public'].includes(visibility)) {
      return NextResponse.json(
        { message: 'Invalid visibility value. Must be "restricted" or "public"' },
        { status: 400 }
      );
    }

    // Validate publicPermission
    if (publicPermission && !['viewer', 'editor'].includes(publicPermission)) {
      return NextResponse.json(
        { message: 'Invalid publicPermission value. Must be "viewer" or "editor"' },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Check if user is owner by comparing with session user
    let isOwner = false;
    if (session?.user?.id && document.owner) {
      // Compare owner ObjectId with session user id
      if (ObjectId.isValid(session.user.id)) {
        const sessionUserId = new ObjectId(session.user.id);
        isOwner = document.owner.equals(sessionUserId);
      }
    }
    
    // If not matched by ID, try by email
    if (!isOwner && document.owner) {
      const ownerUser = await db.collection('users').findOne({
        _id: document.owner
      });
      isOwner = ownerUser?.email === session.user.email;
    }

    if (!isOwner) {
      console.log(`Access denied: ${session.user.email} is not owner of document ${documentId}`);
      return NextResponse.json(
        { message: 'Only the document owner can change general access settings' },
        { status: 403 }
      );
    }

    // Update fields
    const updateFields: Record<string, string> = {};
    if (visibility !== undefined) {
      updateFields.visibility = visibility;
    }
    if (publicPermission !== undefined) {
      updateFields.publicPermission = publicPermission;
    }
    updateFields.updatedAt = new Date().toISOString();

    // Update document using MongoDB native driver
    let result;
    if (ObjectId.isValid(documentId)) {
      result = await db.collection('documents').findOneAndUpdate(
        { _id: new ObjectId(documentId) },
        { $set: updateFields },
        { returnDocument: 'after' }
      );
    } else {
      result = await db.collection('documents').findOneAndUpdate(
        { customId: documentId },
        { $set: updateFields },
        { returnDocument: 'after' }
      );
    }

    if (!result) {
      return NextResponse.json({ message: 'Failed to update document' }, { status: 500 });
    }

    console.log(`📋 Updated document access: ${documentId} -> visibility: ${visibility}, publicPermission: ${publicPermission}`);

    return NextResponse.json({
      message: 'General access updated successfully',
      visibility: result.visibility || visibility,
      publicPermission: result.publicPermission || publicPermission,
    });

  } catch (error) {
    console.error('Error updating general access:', error);
    return NextResponse.json(
      { message: 'Failed to update general access' },
      { status: 500 }
    );
  }
}
