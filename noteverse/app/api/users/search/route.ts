/**
 * User Search API
 * GET /api/users/search?q=query
 * Search for users by email or name for sharing documents
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

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const { db } = await connectToDatabase();

    // Search for users by email or name (case-insensitive)
    const users = await db.collection('users')
      .find({
        $or: [
          { email: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } }
        ],
        // Exclude current user
        email: { $ne: session.user.email }
      })
      .limit(10)
      .project({ email: 1, name: 1, _id: 0 })
      .toArray();

    console.log(`🔍 User search for "${query}": Found ${users.length} users`);

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
