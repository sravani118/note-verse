/**
 * Custom Next.js Server with Socket.io
 * 
 * This server enables real-time collaboration by:
 * 1. Running Next.js app
 * 2. Initializing Socket.io for WebSocket connections
 * 3. Handling both HTTP and WebSocket traffic
 * 
 * Run with: node server.js
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import * as Y from 'yjs';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Yjs document storage
const documents = new Map();
const documentUsers = new Map();
const cursorPositions = new Map();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  console.log('✅ Socket.io server initialized');

  // Socket.io event handlers
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
      documentUsers.get(documentId).add(socket.id);

      if (!cursorPositions.has(documentId)) {
        cursorPositions.set(documentId, new Map());
      }

      // Send state
      const ydoc = documents.get(documentId);
      const state = Y.encodeStateAsUpdate(ydoc);
      const users = Array.from(await io.in(documentId).fetchSockets()).map(s => ({
        socketId: s.id,
        user: s.data.user
      }));

      socket.emit('document-state', {
        state: Buffer.from(state).toString('base64'),
        users
      });

      socket.to(documentId).emit('user-joined', { user, socketId: socket.id, users });
    });

    // Sync updates
    socket.on('sync-update', ({ documentId, update }) => {
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

        const users = Array.from(await io.in(documentId).fetchSockets()).map(s => ({
          socketId: s.id,
          user: s.data.user
        }));
        
        socket.to(documentId).emit('user-left', { socketId: socket.id, user, users });
      }
    });
  });

  // Start server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`
    ╔════════════════════════════════════════╗
    ║   🚀 NoteVerse Server Running          ║
    ╠════════════════════════════════════════╣
    ║   📍 Local: http://${hostname}:${port}     ║
    ║   🔌 Socket.io: Ready                  ║
    ║   🌐 Environment: ${dev ? 'Development' : 'Production'}       ║
    ╚════════════════════════════════════════╝
    `);
  });
});
