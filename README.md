# 📝 NoteVerse

A real-time collaborative document editor inspired by Google Docs, built with Next.js, Socket.io, and Yjs CRDT.

## 🌟 Features

### ✅ Real-time Collaboration
- **Multi-user editing** with automatic conflict resolution using Yjs CRDT
- **Live cursors** showing where other users are typing
- **User presence tracking** to see who's online
- **Typing indicators** for active collaborators
- **Auto-reconnection** with connection status display
- **Instant synchronization** across all connected users

### ✅ Rich Text Editor
- **TipTap editor** with Google Docs-style interface
- **Rich formatting**: Bold, Italic, Underline, Headings (H1, H2), Lists, Links, Code blocks
- **Keyboard shortcuts**: Ctrl+B, Ctrl+I, Ctrl+Z, Ctrl+Shift+Z, etc.
- **Auto-save** with visual feedback (Saving.../Saved)
- **Word count** and character count
- **Dark mode** support

### ✅ Version History
- **Automatic versioning** every 5 minutes
- **Manual snapshots** with custom descriptions
- **Version restoration** synced in real-time to all collaborators
- **Version timeline** with author info, timestamps, and word counts
- **Backup creation** before restoring versions

### ✅ Authentication & Security
- **NextAuth.js** integration
- **Google OAuth** login
- **Email/password** authentication
- **Password reset** functionality via email
- **Secure sessions** and protected routes

### ✅ Document Management
- **Create, edit, and delete** documents
- **Share documents** with other users
- **Permission management** (view/edit/admin)
- **Document search** and filtering
- **Dashboard** with document cards

### ✅ Collaboration Features
- **Comments system** (in sidebar)
- **User avatars** with color coding
- **Active collaborators** display
- **Share links** generation
- **Access control** per document

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS, Custom CSS
- **Backend**: Next.js API Routes, Custom Socket.io Server
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js (Google OAuth, Credentials)
- **Real-time**: Socket.io (WebSocket + Polling)
- **CRDT**: Yjs (Conflict-free Replicated Data Type)
- **Rich Text**: TipTap Editor
- **Email**: Nodemailer (for password reset)

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- Google Cloud Console account (for OAuth)

### 1. Clone the Repository
```bash
cd noteverse
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the `noteverse` directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/noteverse

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-super-secret-key-change-this

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (for password reset)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Socket.io
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 3. Setup Google OAuth
Follow the detailed instructions in [noteverse/AUTHENTICATION_SETUP.md](noteverse/AUTHENTICATION_SETUP.md)

### 4. Start MongoDB
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Or use your local MongoDB installation
mongod
```

### 5. Run the Development Server

#### Option A: Run Both Servers (Recommended)
```bash
cd noteverse

# Terminal 1 - Socket.io Server
npm run dev:socket

# Terminal 2 - Next.js App (in a new terminal)
npm run dev:next
```

#### Option B: Run Concurrently (if you have concurrently installed)
```bash
cd noteverse
npm install -g concurrently  # if not already installed
npm run dev:full
```

The application will be available at:
- **Next.js App**: http://localhost:3000
- **Socket.io Server**: http://localhost:3001

## 🌐 Production Deployment

NoteVerse requires a **split deployment architecture** because Vercel doesn't support persistent WebSocket connections.

### Quick Deployment Steps:

1. **Deploy Socket.io Server** to Render/Railway
   - See [SOCKET_DEPLOY.md](noteverse/SOCKET_DEPLOY.md) for quick start
   - Get your server URL: `https://noteverse-socket.onrender.com`

2. **Deploy Frontend** to Vercel
   - Set environment variable: `NEXT_PUBLIC_SOCKET_URL=https://noteverse-socket.onrender.com`
   - Set other env variables (MongoDB, NextAuth, etc.)

3. **Configure CORS**
   - In socket server: `ALLOWED_ORIGINS=https://your-vercel-app.vercel.app`

### Full Deployment Guide
See [DEPLOYMENT.md](noteverse/DEPLOYMENT.md) for complete step-by-step instructions.

### Architecture
```
┌──────────────────────────────────────────────────────────┐
│                                                            │
│  Frontend (Next.js)         Socket.io Server              │
│  Vercel                     Render/Railway                │
│  ↓                           ↓                            │
│  https://noteverse.          https://noteverse-socket.    │
│  vercel.app                  onrender.com                 │
│                                                            │
│  WebSocket ←──────────────────────────────────────────→   │
│  NEXT_PUBLIC_SOCKET_URL     ALLOWED_ORIGINS               │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

## 🚀 Usage

1. **Sign up** or **Login** with Google/Email
2. **Create a new document** from the dashboard
3. **Share the document URL** with collaborators
4. **Edit simultaneously** - see changes in real-time!
5. **Use formatting tools** from the toolbar
6. **Create version snapshots** from the History tab
7. **Restore previous versions** when needed

## 📁 Project Structure

```
noteverse/
├── app/
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   └── documents/            # Document CRUD + versions
│   ├── components/               # React components
│   │   ├── dashboard/            # Dashboard UI
│   │   ├── document/             # Editor components
│   │   └── editor/               # Collaborative editor
│   ├── dashboard/                # Dashboard page
│   ├── document/[id]/            # Document editor page
│   └── login/, signup/           # Auth pages
├── lib/
│   ├── models/                   # MongoDB schemas
│   ├── socket/                   # Socket.io logic
│   ├── email.ts                  # Email utilities
│   └── mongodb.ts                # Database connection
├── server.js                     # Custom Socket.io server
└── package.json
```

## 🔌 Real-time Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   User A    │         │   Server    │         │   User B    │
│  (Browser)  │◄───────►│ (Socket.io) │◄───────►│  (Browser)  │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                       │
       │  1. Type "Hello"      │                       │
       ├──────────────────────►│                       │
       │                       │  2. Broadcast update  │
       │                       ├──────────────────────►│
       │                       │  3. Type "World"      │
       │                       ◄───────────────────────┤
       │  4. Receive update    │                       │
       ◄───────────────────────┤                       │
       │                                               │
       └─── Both see: "HelloWorld" (merged by Yjs) ───┘
```

## 📚 Documentation

- [Authentication Setup Guide](noteverse/AUTHENTICATION_SETUP.md) - Google OAuth & Email configuration
- [Real-time Collaboration](noteverse/REALTIME_COLLABORATION.md) - Socket.io + Yjs architecture
- [Document Editor](noteverse/DOCUMENT_EDITOR_COMPLETE.md) - TipTap editor implementation
- [Version History](noteverse/VERSION_HISTORY_COMPLETE.md) - Versioning system details
- [Implementation Guide](noteverse/IMPLEMENTATION_COMPLETE.md) - Complete feature list

## 🧪 Testing Real-time Collaboration

1. Open `http://localhost:3001/document/test-doc` in **two browser tabs**
2. Start typing in one tab
3. Watch the changes appear **instantly** in the other tab
4. Try typing **simultaneously** - both changes merge automatically!
5. See **live cursors** and **typing indicators**

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CSRF protection with NextAuth
- MongoDB injection prevention
- Secure session management
- Rate limiting on API endpoints
- Environment variable protection

## 🎯 Key Highlights

- **Zero data loss** - Yjs CRDT ensures all edits are preserved
- **Sub-second latency** - Changes sync in real-time
- **Offline-first ready** - Can be extended with IndexedDB
- **Scalable architecture** - Socket.io rooms for document isolation
- **Professional UI** - Matches Google Docs design patterns
- **TypeScript throughout** - Type-safe codebase
- **Responsive design** - Desktop-optimized with mobile support

## 🚀 Future Enhancements

- [ ] Inline comments with replies
- [ ] @mentions for collaborators
- [ ] Export to PDF/DOCX
- [ ] Advanced permissions (viewer/commenter/editor)
- [ ] Document templates
- [ ] Offline editing with sync
- [ ] Mobile app (React Native)
- [ ] AI writing assistant integration

## 📄 License

MIT License - feel free to use this project for learning or production!

## 👨‍💻 Author

Built with ❤️ using Next.js, Socket.io, and Yjs

---

**Server Status**: 🟢 Running on http://localhost:3001
