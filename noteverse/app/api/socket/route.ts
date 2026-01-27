/**
 * Socket.io API Route Handler
 * 
 * This API route initializes Socket.io on the Next.js server
 * Works with Next.js App Router
 */

import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import * as Y from 'yjs';

// Store for Yjs documents
const documents = new Map<string, Y.Doc>();
const documentUsers = new Map<string, Set<string>>();
const cursorPositions = new Map<string, Map<string, any>>();

// Global Socket.io instance
let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
function initSocketIO(res: any) {
  if (io) {
    console.log('Socket.io already initialized');
    return io;
  }

  // Get the HTTP server from Next.js response
  const httpServer: HTTPServer = res.socket.server;

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3001',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  console.log('✅ Socket.io initialized');

  // Handle connections
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join document
    socket.on('join-document', async ({ documentId, user }) => {
      console.log(`📄 User ${user.name} joining document ${documentId}`);
      
      socket.join(documentId);
      socket.data.documentId = documentId;
      socket.data.user = user;

      // Initialize document
      if (!documents.has(documentId)) {
        documents.set(documentId, new Y.Doc());
      }
      if (!documentUsers.has(documentId)) {
        documentUsers.set(documentId, new Set());
      }
      documentUsers.get(documentId)!.add(socket.id);

      if (!cursorPositions.has(documentId)) {
        cursorPositions.set(documentId, new Map());
      }

      // Send state
      const ydoc = documents.get(documentId)!;
      const state = Y.encodeStateAsUpdate(ydoc);
      const users = await getUsersInDocument(io!, documentId);

      socket.emit('document-state', {
        state: Buffer.from(state).toString('base64'),
        users
      });

      socket.to(documentId).emit('user-joined', { user, socketId: socket.id, users });
    });

    // Sync updates
    socket.on('sync-update', ({ documentId, update, origin }) => {
      const ydoc = documents.get(documentId);
      if (!ydoc) return;

      try {
        const updateBuffer = Buffer.from(update, 'base64');
        Y.applyUpdate(ydoc, updateBuffer);
        socket.to(documentId).emit('sync-update', { update, origin: socket.data.user });
      } catch (error) {
        console.error('Error applying update:', error);
      }
    });

    // Cursor updates
    socket.on('cursor-update', ({ documentId, position, selection }) => {
      const user = socket.data.user;
      if (!user) return;

      const docCursors = cursorPositions.get(documentId);
      if (docCursors) {
        docCursors.set(socket.id, { position, selection, user });
      }

      socket.to(documentId).emit('cursor-update', {
        socketId: socket.id,
        user,
        position,
        selection
      });
    });

    // Typing indicators
    socket.on('typing-start', ({ documentId }) => {
      socket.to(documentId).emit('user-typing', {
        socketId: socket.id,
        user: socket.data.user,
        isTyping: true
      });
    });

    socket.on('typing-stop', ({ documentId }) => {
      socket.to(documentId).emit('user-typing', {
        socketId: socket.id,
        user: socket.data.user,
        isTyping: false
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      const documentId = socket.data.documentId;
      const user = socket.data.user;

      if (documentId) {
        const docUsers = documentUsers.get(documentId);
        if (docUsers) {
          docUsers.delete(socket.id);
          if (docUsers.size === 0) {
            setTimeout(() => {
              if (documentUsers.get(documentId)?.size === 0) {
                documents.delete(documentId);
                documentUsers.delete(documentId);
                cursorPositions.delete(documentId);
              }
            }, 60000);
          }
        }

        const docCursors = cursorPositions.get(documentId);
        if (docCursors) {
          docCursors.delete(socket.id);
        }

        const users = await getUsersInDocument(io!, documentId);
        socket.to(documentId).emit('user-left', { socketId: socket.id, user, users });
      }
    });
  });

  return io;
}

async function getUsersInDocument(io: SocketIOServer, documentId: string): Promise<any[]> {
  const sockets = await io.in(documentId).fetchSockets();
  return sockets.map(s => ({
    socketId: s.id,
    user: s.data.user
  }));
}

/**
 * GET handler - returns connection info
 */
export async function GET(req: NextRequest) {
  return Response.json({
    message: 'Socket.io endpoint',
    path: '/api/socket',
    status: io ? 'initialized' : 'not initialized'
  });
}

/**
 * Socket.io connection handler
 * This will be called when upgrading to WebSocket
 */
export async function POST(req: NextRequest, res: any) {
  const socketIO = initSocketIO(res);
  
  return Response.json({
    message: 'Socket.io initialized',
    path: '/api/socket'
  });
}
