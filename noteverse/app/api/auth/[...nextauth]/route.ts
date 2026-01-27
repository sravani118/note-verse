import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import User, { IUser } from '@/lib/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        const { db } = await connectToDatabase();
        const user = await db.collection<IUser>('users').findOne({
          email: credentials.email.toLowerCase()
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        if (!user.password) {
          throw new Error('Please sign in with Google');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const { db } = await connectToDatabase();
        
        // Check if user exists
        const existingUser = await db.collection<IUser>('users').findOne({
          email: user.email?.toLowerCase()
        });

        if (!existingUser) {
          // Create new user for Google sign-in
          await db.collection<IUser>('users').insertOne({
            name: user.name || '',
            email: user.email?.toLowerCase() || '',
            password: '', // No password for OAuth users
            role: 'owner' as const,
            provider: 'google' as const,
            theme: 'system' as const,
            fontSize: '14px',
            fontFamily: 'Inter',
            lineSpacing: '1.5',
            autoSave: true,
            isActive: true,
            cursorColor: '#6366F1',
            timeZone: 'UTC',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
