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
import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

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
    
    // Send immediate confirmation to client
    socket.emit('connection-confirmed', { socketId: socket.id });

    /**
     * JOIN DOCUMENT ROOM
     * When a user opens a document, they join its room
     */
    socket.on('join-document', async ({ documentId, user }) => {
      console.log(`📄 User ${user.name} (${socket.id}) joining document ${documentId}`);

      // Join the Socket.io room for this document
      socket.join(documentId);
      console.log(`  ✅ Socket ${socket.id} joined room: ${documentId}`);

      // Store user info on socket for later use
      socket.data.documentId = documentId;
      socket.data.user = user;

      // Initialize document if it doesn't exist
      if (!documents.has(documentId)) {
        const ydoc = new Y.Doc();
        
        // 🔥 FETCH CONTENT FROM MONGODB AND LOAD INTO YOJS
        try {
          console.log(`🔍 Loading document ${documentId} from MongoDB...`);
          console.log(`  - Is valid ObjectId: ${ObjectId.isValid(documentId)}`);
          const { db } = await connectToDatabase();
          console.log(`  ✅ Connected to MongoDB`);
          
          // Try to find document by MongoDB ObjectId or custom ID
          let document;
          if (ObjectId.isValid(documentId)) {
            console.log(`  - Searching by _id (ObjectId)`);
            document = await db.collection('documents').findOne({
              _id: new ObjectId(documentId)
            });
          } else {
            console.log(`  - Searching by customId (string)`);
            document = await db.collection('documents').findOne({
              customId: documentId
            });
          }
          
          console.log(`  - Document found: ${!!document}`);
          if (document) {
            console.log(`  - Document title: ${document.title}`);
            console.log(`  - Content length: ${document.content?.length || 0}`);
            console.log(`  - Content preview: ${document.content?.substring(0, 100) || 'empty'}`);
          }
          
          if (document && document.content && document.content.trim()) {
            const savedContent = document.content;
            console.log(`✅ Found document with ${savedContent.length} characters of content`);
            
            // Store the HTML content as metadata for the client to use
            ydoc.getMap('metadata').set('initialContent', savedContent);
            console.log(`📦 Stored content in Yjs metadata`);
          } else {
            console.log(`ℹ️ Document ${documentId} has no saved content, starting fresh`);
          }
        } catch (error) {
          console.error(`❌ Error loading document content from MongoDB:`, error);
          // Continue with empty document on error
        }
        
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
     * CHAT MESSAGE
     * Handle real-time chat messages in document
     */
    socket.on('send-chat-message', ({ documentId, message }) => {
      const user = socket.data.user;
      
      console.log(`\ud83d\udcac Received send-chat-message event`);
      console.log(`  - Document ID: ${documentId}`);
      console.log(`  - Message: ${message}`);
      console.log(`  - User data:`, user);
      console.log(`  - Socket ID: ${socket.id}`);
      
      if (!user || !documentId) {
        console.error('\u274c Cannot send chat message: Missing user or documentId');
        console.error(`  - User:`, user);
        console.error(`  - DocumentId:`, documentId);
        return;
      }
      // Verify socket is in the room
      const rooms = Array.from(socket.rooms);
      console.log(`  - Socket rooms:`, rooms);
      console.log(`  - Is in document room: ${rooms.includes(documentId)}`);
      console.log(`\ud83d\udce3 Broadcasting chat message to room ${documentId}`);

      // Broadcast chat message to all users in the document (including sender)
      const chatMessage = {
        id: `temp-${Date.now()}-${socket.id}`,
        senderId: user.id,
        senderName: user.name,
        senderEmail: user.email,
        message: message,
        timestamp: new Date()
      };
      
      console.log(`  - Message object:`, chatMessage);
      
      // Get all sockets in the room
      const socketsInRoom = io.sockets.adapter.rooms.get(documentId);
      console.log(`  - Sockets in room ${documentId}:`, socketsInRoom ? Array.from(socketsInRoom) : 'none');
      
      console.log(`📢 Broadcasting to room ${documentId}...`);
      
      // GUARANTEED DELIVERY: Send to sender FIRST (direct)
      socket.emit('receive-chat-message', chatMessage);
      console.log(`  ✅ Sent to sender directly`);
      
      // THEN broadcast to everyone else in the room
      socket.to(documentId).emit('receive-chat-message', chatMessage);
      console.log(`  ✅ Broadcast to ${(socketsInRoom?.size || 1) - 1} other sockets`);
      
      console.log(`✅ Chat message delivery complete`);
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
