import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Document from '@/lib/models/Document';
import DocumentShare from '@/lib/models/DocumentShare';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get user data
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all user's documents
    const documents = await Document.find({ owner: user._id })
      .select('title content tags isPublic createdAt updatedAt')
      .lean();

    // Get shares
    const shares = await DocumentShare.find({ sharedBy: user._id })
      .populate('documentId', 'title')
      .populate('sharedWith', 'name email')
      .lean();

    // Build export data
    const exportData = {
      profile: {
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        theme: user.theme,
        preferences: {
          fontSize: user.fontSize,
          fontFamily: user.fontFamily,
          lineSpacing: user.lineSpacing,
          autoSave: user.autoSave
        },
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      documents: documents.map(doc => ({
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        isPublic: doc.isPublic,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      })),
      shares: shares.map(share => ({
        document: (share.documentId as any)?.title,
        sharedWith: (share.sharedWith as any)?.email,
        permission: share.permission,
        createdAt: share.createdAt
      })),
      stats: {
        totalDocuments: documents.length,
        totalShares: shares.length
      },
      exportedAt: new Date().toISOString()
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2);

    // Return as downloadable file
    return new NextResponse(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="noteverse-export-${Date.now()}.json"`
      }
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
