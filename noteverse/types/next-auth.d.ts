import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      cursorColor?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    cursorColor?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    cursorColor?: string;
  }
}
