/**
 * Socket.io Server Setup for Real-time Collaboration
 * 
 * This server handles:
 * - WebSocket connections for real-time communication
 * - Document synchronization using Yjs CRDT
 * - User presence tracking
 * - Cursor position broadcasting
 * - Awareness information (user name, color, cursor)
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as Y from 'yjs';

// Store for Yjs documents
// Each document has a unique Yjs document instance
const documents = new Map<string, Y.Doc>();

// Store for user presence per document
// Tracks which users are currently viewing/editing each document
const documentUsers = new Map<string, Set<string>>();

// Store for cursor positions
// Maps documentId -> userId -> cursor position
interface CursorData {
  position: { line: number; column: number } | null;
  selection: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  user: { name: string; email?: string; image?: string };
}

const cursorPositions = new Map<string, Map<string, CursorData>>();

/**
 * Initialize Socket.io server with Next.js
 * @param httpServer - HTTP server instance
 */
export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3001',
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Transports configuration
    transports: ['websocket', 'polling'],
    // Connection timeout
    pingTimeout: 60000,
    pingInterval: 25000
  });

  console.log('✅ Socket.io server initialized');

  /**
   * Handle new socket connections
   */
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    /**
     * JOIN DOCUMENT ROOM
     * When a user opens a document, they join its room
     */
    socket.on('join-document', async ({ documentId, user }) => {
      console.log(`📄 User ${user.name} joining document ${documentId}`);

      // Join the Socket.io room for this document
      socket.join(documentId);

      // Store user info on socket for later use
      socket.data.documentId = documentId;
      socket.data.user = user;

      // Initialize document if it doesn't exist
      if (!documents.has(documentId)) {
        const ydoc = new Y.Doc();
        documents.set(documentId, ydoc);
        console.log(`📝 Created new Yjs document: ${documentId}`);
      }

      // Initialize user set for this document
      if (!documentUsers.has(documentId)) {
        documentUsers.set(documentId, new Set());
      }
      documentUsers.get(documentId)!.add(socket.id);

      // Initialize cursor positions for this document
      if (!cursorPositions.has(documentId)) {
        cursorPositions.set(documentId, new Map());
      }

      // Get current users in document
      const usersInDocument = await getUsersInDocument(io, documentId);

      // Send current document state to the new user
      const ydoc = documents.get(documentId)!;
      const state = Y.encodeStateAsUpdate(ydoc);

      socket.emit('document-state', {
        state: Buffer.from(state).toString('base64'),
        users: usersInDocument
      });

      // Notify other users that someone joined
      socket.to(documentId).emit('user-joined', {
        user,
        socketId: socket.id,
        users: usersInDocument
      });

      console.log(`✅ User ${user.name} joined document ${documentId}. Total users: ${usersInDocument.length}`);
    });

    /**
     * SYNC DOCUMENT UPDATES
     * Handle Yjs update events from clients
     */
    socket.on('sync-update', ({ documentId, update }) => {
      const ydoc = documents.get(documentId);
      if (!ydoc) {
        console.error(`❌ Document ${documentId} not found for sync`);
        return;
      }

      try {
        // Apply the update to the Yjs document
        const updateBuffer = Buffer.from(update, 'base64');
        Y.applyUpdate(ydoc, updateBuffer);

        // Broadcast the update to all other clients in the room
        // except the one who sent it
        socket.to(documentId).emit('sync-update', {
          update,
          origin: socket.data.user
        });

        // Optional: Persist to database
        // This can be done async in background
        // await saveDocumentToDatabase(documentId, ydoc);
      } catch (error) {
        console.error('❌ Error applying Yjs update:', error);
        socket.emit('sync-error', { error: 'Failed to sync update' });
      }
    });

    /**
     * CURSOR POSITION UPDATE
     * Broadcast cursor position to other users
     */
    socket.on('cursor-update', ({ documentId, position, selection }) => {
      const user = socket.data.user;
      if (!user || !documentId) return;

      // Store cursor position
      const docCursors = cursorPositions.get(documentId);
      if (docCursors) {
        docCursors.set(socket.id, { position, selection, user });
      }

      // Broadcast to other users in the document
      socket.to(documentId).emit('cursor-update', {
        socketId: socket.id,
        user,
        position,
        selection
      });
    });

    /**
     * USER AWARENESS UPDATE
     * Update user status (typing, idle, etc.)
     */
    socket.on('awareness-update', ({ documentId, status }) => {
      const user = socket.data.user;
      if (!user || !documentId) return;

      // Broadcast awareness to other users
      socket.to(documentId).emit('awareness-update', {
        socketId: socket.id,
        user,
        status
      });
    });

    /**
     * TYPING INDICATOR
     * Show when a user is actively typing
     */
    socket.on('typing-start', ({ documentId }) => {
      const user = socket.data.user;
      if (!user) return;

      socket.to(documentId).emit('user-typing', {
        socketId: socket.id,
        user,
        isTyping: true
      });
    });

    socket.on('typing-stop', ({ documentId }) => {
      const user = socket.data.user;
      if (!user) return;

      socket.to(documentId).emit('user-typing', {
        socketId: socket.id,
        user,
        isTyping: false
      });
    });

    /**
     * LEAVE DOCUMENT
     * Handle user leaving a document
     */
    socket.on('leave-document', async ({ documentId }) => {
      await handleUserLeave(io, socket, documentId);
    });

    /**
     * DISCONNECT
     * Handle socket disconnection
     */
    socket.on('disconnect', async () => {
      const documentId = socket.data.documentId;
      const user = socket.data.user;

      console.log(`🔌 Client disconnected: ${socket.id}${user ? ` (${user.name})` : ''}`);

      if (documentId) {
        await handleUserLeave(io, socket, documentId);
      }
    });

    /**
     * ERROR HANDLING
     */
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  return io;
}

/**
 * Helper: Handle user leaving a document
 */
async function handleUserLeave(
  io: SocketIOServer,
  socket: Socket,
  documentId: string
) {
  const user = socket.data.user;

  // Remove from document users
  const docUsers = documentUsers.get(documentId);
  if (docUsers) {
    docUsers.delete(socket.id);
    
    // Clean up if no users left
    if (docUsers.size === 0) {
      documentUsers.delete(documentId);
      cursorPositions.delete(documentId);
      
      // Optional: Clean up Yjs document after some time
      // You might want to persist it first
      setTimeout(() => {
        if (documentUsers.get(documentId)?.size === 0) {
          documents.delete(documentId);
          console.log(`🗑️ Cleaned up document ${documentId}`);
        }
      }, 60000); // 1 minute delay
    }
  }

  // Remove cursor position
  const docCursors = cursorPositions.get(documentId);
  if (docCursors) {
    docCursors.delete(socket.id);
  }

  // Get remaining users
  const usersInDocument = await getUsersInDocument(io, documentId);

  // Notify others that user left
  socket.to(documentId).emit('user-left', {
    socketId: socket.id,
    user,
    users: usersInDocument
  });

  // Leave the room
  socket.leave(documentId);

  console.log(`👋 User ${user?.name} left document ${documentId}. Remaining: ${usersInDocument.length}`);
}

/**
 * Helper: Get all users currently in a document
 */
async function getUsersInDocument(
  io: SocketIOServer,
  documentId: string
): Promise<Array<{ socketId: string; user: { name: string; email?: string; image?: string } }>> {
  const sockets = await io.in(documentId).fetchSockets();
  return sockets.map(s => ({
    socketId: s.id,
    user: s.data.user
  }));
}

export { documents, documentUsers, cursorPositions };
