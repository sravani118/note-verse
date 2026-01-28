import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Update user's profile photo
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { image },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Profile photo updated successfully',
      image: user.image
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    return NextResponse.json(
      { error: 'Failed to update profile photo' },
      { status: 500 }
    );
  }
}
