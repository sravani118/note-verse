/**
 * Cleanup Duplicate Collaborators
 * GET /api/documents/cleanup-duplicates
 * 
 * Removes duplicate entries in sharedWith arrays across all documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Find all documents
    const documents = await db.collection('documents').find({
      sharedWith: { $exists: true, $ne: [] }
    }).toArray();

    console.log(`🔍 Found ${documents.length} documents with collaborators`);

    let totalCleaned = 0;
    let documentsUpdated = 0;

    for (const doc of documents) {
      const sharedWith = doc.sharedWith || [];
      
      if (sharedWith.length === 0) continue;

      // Deduplicate by email, keeping the highest permission
      const deduplicatedMap = new Map<string, any>();
      
      sharedWith.forEach((share: any) => {
        const email = share.email?.toLowerCase();
        if (!email) return;
        
        const existing = deduplicatedMap.get(email);
        if (!existing) {
          deduplicatedMap.set(email, share);
        } else {
          // Keep the higher permission
          const permissions = { owner: 3, editor: 2, viewer: 1 };
          const currentLevel = permissions[share.role as keyof typeof permissions] || 0;
          const existingLevel = permissions[existing.role as keyof typeof permissions] || 0;
          
          if (currentLevel > existingLevel) {
            deduplicatedMap.set(email, share);
          }
        }
      });

      const deduplicated = Array.from(deduplicatedMap.values());
      const removedCount = sharedWith.length - deduplicated.length;

      if (removedCount > 0) {
        // Update document with deduplicated array
        await db.collection('documents').updateOne(
          { _id: doc._id },
          {
            $set: {
              sharedWith: deduplicated,
              updatedAt: new Date()
            }
          }
        );

        console.log(`✅ Document "${doc.title}": Removed ${removedCount} duplicate(s)`);
        totalCleaned += removedCount;
        documentsUpdated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${totalCleaned} duplicate entries across ${documentsUpdated} documents`,
      stats: {
        documentsScanned: documents.length,
        documentsUpdated,
        duplicatesRemoved: totalCleaned
      }
    });

  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
