# Real-time Collaboration Setup Guide

## 🚀 Overview

This implementation provides real-time collaborative editing using:
- **Socket.io** - WebSocket communication
- **Yjs** - CRDT (Conflict-free Replicated Data Type) for conflict resolution
- **Custom Next.js Server** - Integrated HTTP + WebSocket server

## 📋 Features Implemented

✅ Real-time document synchronization  
✅ Multi-user editing with conflict resolution  
✅ User presence tracking  
✅ Live cursor positions  
✅ Typing indicators  
✅ Auto-reconnection handling  
✅ Connection status display  

## 🛠️ Installation

### 1. Install Dependencies

```bash
npm install
```

New packages added:
- `socket.io` - Server-side WebSocket library
- `socket.io-client` - Client-side WebSocket library
- `yjs` - CRDT library for conflict-free editing
- `mongoose` - MongoDB ODM
- `ts-node` - TypeScript execution for dev server

### 2. Configure Environment Variables

Copy the example file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/noteverse
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
```

### 3. Start MongoDB

Make sure MongoDB is running:
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Or using local installation
mongod
```

### 4. Run the Server

```bash
npm run dev
```

The server will start on **http://localhost:3001**

## 📁 File Structure

```
noteverse/
├── server.js                           # Custom Next.js server with Socket.io
├── lib/
│   ├── socket/
│   │   ├── socketServer.ts            # Socket.io server logic
│   │   ├── useSocket.ts               # Socket.io client hook
│   │   └── useYjsProvider.ts          # Yjs CRDT provider hook
│   └── models/                         # MongoDB Mongoose schemas
│       ├── User.ts
│       ├── Document.ts
│       ├── DocumentVersion.ts
│       ├── Comment.ts
│       └── SharePermission.ts
├── app/
│   ├── components/
│   │   └── editor/
│   │       └── CollaborativeEditor.tsx # Main editor component
│   └── documents/
│       └── [id]/
│           └── page.tsx                # Document editor page
└── package.json                         # Updated with new dependencies
```

## 🔧 Architecture

### Server-Side Flow

```
1. HTTP Server created with Next.js
   ↓
2. Socket.io initialized on same server
   ↓
3. Client connects via WebSocket
   ↓
4. Client joins document room
   ↓
5. Server sends current Yjs document state
   ↓
6. Client applies state and syncs
   ↓
7. Ongoing: Bidirectional update broadcasting
```

### Client-Side Flow

```
1. useSocket() - Establish WebSocket connection
   ↓
2. useYjsProvider() - Initialize Yjs document
   ↓
3. Join document room
   ↓
4. Receive initial state from server
   ↓
5. Bind Yjs to textarea
   ↓
6. Local changes → Yjs update → Socket.io broadcast
   ↓
7. Remote updates → Yjs apply → Local UI update
```

### CRDT Conflict Resolution

```
User A: Types "Hello"
User B: Types "World" (simultaneously)

Without CRDT: ❌ Last write wins → Data loss
With Yjs CRDT: ✅ Both changes merged → "HelloWorld"

Yjs automatically handles:
- Concurrent edits
- Out-of-order updates
- Network delays
- Offline editing
```

## 💡 Usage Example

### Basic Implementation

```tsx
import CollaborativeEditor from '@/app/components/editor/CollaborativeEditor';

export default function DocumentPage() {
  return (
    <CollaborativeEditor
      documentId="doc-123"
      currentUser={{
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
        cursorColor: "#6366F1"
      }}
      initialContent="Start typing..."
      onContentChange={(content) => {
        // Auto-save to database
        console.log('Content changed:', content);
      }}
    />
  );
}
```

### Custom Hook Usage

```tsx
import { useSocket } from '@/lib/socket/useSocket';
import { useYjsProvider } from '@/lib/socket/useYjsProvider';

function MyComponent() {
  const { socket, isConnected } = useSocket();
  const { ydoc, synced, activeUsers } = useYjsProvider({
    socket,
    documentId: 'doc-123',
    user: currentUser
  });

  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Synced: {synced ? 'Yes' : 'No'}</p>
      <p>Active users: {activeUsers.length}</p>
    </div>
  );
}
```

## 🔌 Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-document` | `{ documentId, user }` | Join a document room |
| `sync-update` | `{ documentId, update, origin }` | Send Yjs update |
| `cursor-update` | `{ documentId, position, selection }` | Broadcast cursor position |
| `typing-start` | `{ documentId }` | Start typing indicator |
| `typing-stop` | `{ documentId }` | Stop typing indicator |
| `leave-document` | `{ documentId }` | Leave document room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `document-state` | `{ state, users }` | Initial document state |
| `sync-update` | `{ update, origin }` | Yjs update from another user |
| `user-joined` | `{ user, socketId, users }` | Someone joined |
| `user-left` | `{ user, socketId, users }` | Someone left |
| `cursor-update` | `{ socketId, user, position }` | Cursor position update |
| `user-typing` | `{ socketId, user, isTyping }` | Typing indicator |

## 🧪 Testing Real-time Collaboration

### 1. Open Multiple Browser Tabs

```bash
# Terminal 1
npm run dev

# Browser Tab 1
http://localhost:3001/documents/test-doc-1

# Browser Tab 2 (incognito or different browser)
http://localhost:3001/documents/test-doc-1
```

### 2. Test Scenarios

**Simultaneous Editing**
- Type in both tabs simultaneously
- Notice: Both changes appear in real-time, no conflicts

**Cursor Tracking**
- Move cursor in Tab 1
- Notice: Cursor indicator appears in Tab 2

**User Presence**
- Open Tab 1: See yourself
- Open Tab 2: See 2 users
- Close Tab 1: See 1 user in Tab 2

**Network Interruption**
- Disconnect network
- Type offline
- Reconnect
- Notice: Changes sync automatically

## 🐛 Troubleshooting

### Socket connection fails

**Check:**
- Server is running on port 3001
- `NEXT_PUBLIC_SOCKET_URL` matches server URL
- Firewall allows WebSocket connections

**Solution:**
```bash
# Kill any process on 3001
npx kill-port 3001

# Restart server
npm run dev
```

### Updates not syncing

**Check:**
- Multiple users joined same document ID
- Console shows no errors
- Browser console shows "Synced" status

**Solution:**
```bash
# Check server logs for errors
# Verify documentId is identical
# Clear browser cache and reconnect
```

### Cursor positions incorrect

**Known Issue:** Current implementation uses approximate line-height calculation.

**Solution:** For production, use a proper rich text editor library:
- TipTap (with Yjs extension)
- Quill (with y-quill binding)
- Monaco Editor (with y-monaco binding)

## 🚀 Production Deployment

### 1. Environment Variables

Set in production:
```env
NODE_ENV=production
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://...
```

### 2. Build

```bash
npm run build
```

### 3. Start

```bash
npm start
```

### 4. Scaling Considerations

For multiple server instances, use Redis adapter:

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
// socketServer.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## 📚 Additional Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Yjs Documentation](https://docs.yjs.dev/)
- [Next.js Custom Server](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)
- [CRDT Explained](https://crdt.tech/)

## 🔒 Security Notes

1. **Authentication**: Verify user identity before joining documents
2. **Authorization**: Check document permissions before allowing edits
3. **Rate Limiting**: Prevent spam and abuse
4. **Input Validation**: Sanitize all socket events
5. **CORS**: Configure properly for production domains

## 🎯 Next Steps

1. ✅ Real-time collaboration working
2. 🔜 Persist Yjs updates to MongoDB
3. 🔜 Add rich text formatting (TipTap/Quill)
4. 🔜 Implement version history
5. 🔜 Add commenting system
6. 🔜 Share permissions and invites
7. 🔜 Offline support with IndexedDB

---

**Need Help?** Check the inline comments in the code files for detailed explanations of each function and flow.
