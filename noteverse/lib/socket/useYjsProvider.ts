/**
 * Yjs Collaborative Provider Hook
 * 
 * Manages Yjs document synchronization with Socket.io
 * Handles CRDT operations and real-time updates
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import * as Y from 'yjs';

interface User {
  id: string;
  name: string;
  email: string;
  cursorColor: string;
}

interface YjsProviderOptions {
  socket: Socket | null;
  documentId: string;
  user: User;
  onSync?: (ydoc: Y.Doc) => void;
  onUsersChange?: (users: User[]) => void;
}

interface DocumentState {
  state: string;
  users: User[];
}

export function useYjsProvider({
  socket,
  documentId,
  user,
  onSync,
  onUsersChange
}: YjsProviderOptions) {
  const [ydoc] = useState<Y.Doc>(() => new Y.Doc());
  const [synced, setSynced] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  /**
   * Initialize Yjs document
   */
  useEffect(() => {
    if (!socket || !documentId) return;

    // Join document room
    socket.emit('join-document', {
      documentId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cursorColor: user.cursorColor
      }
    });

    console.log(`📄 Joined Yjs document: ${documentId}`);

    return () => {
      // Leave document on cleanup
      socket.emit('leave-document', { documentId });
      ydoc.destroy();
    };
  }, [socket, documentId, user.id, ydoc]);

  /**
   * Handle document state from server
   */
  useEffect(() => {
    if (!socket || !ydoc) return;

    const handleDocumentState = ({ state, users }: DocumentState) => {
      try {
        // Apply initial state from server
        const stateBuffer = Buffer.from(state, 'base64');
        Y.applyUpdate(ydoc, stateBuffer);
        
        setSynced(true);
        setActiveUsers(users);
        
        if (onSync) {
          onSync(ydoc);
        }
        if (onUsersChange) {
          onUsersChange(users);
        }

        console.log('✅ Yjs document synced with server');
      } catch (error) {
        console.error('❌ Error applying document state:', error);
      }
    };

    socket.on('document-state', handleDocumentState);

    return () => {
      socket.off('document-state', handleDocumentState);
    };
  }, [socket, ydoc, onSync, onUsersChange]);

  /**
   * Handle incoming updates from other clients
   */
  useEffect(() => {
    if (!socket || !ydoc) return;

    const handleSyncUpdate = ({ update, origin }: { update: string; origin?: User }) => {
      try {
        const updateBuffer = Buffer.from(update, 'base64');
        
        // Apply update from other client
        // Yjs automatically handles conflict resolution
        Y.applyUpdate(ydoc, updateBuffer, origin);
        
        console.log('📥 Received update from:', origin?.name);
      } catch (error) {
        console.error('❌ Error applying sync update:', error);
      }
    };

    socket.on('sync-update', handleSyncUpdate);

    return () => {
      socket.off('sync-update', handleSyncUpdate);
    };
  }, [socket, ydoc]);

  /**
   * Observe local changes and send to server
   */
  useEffect(() => {
    if (!socket || !ydoc || !synced) return;

    const updateHandler = (update: Uint8Array, origin: unknown) => {
      // Don't send updates that came from the server
      if (origin !== ydoc) return;

      // Send update to server
      const updateBase64 = Buffer.from(update).toString('base64');
      socket.emit('sync-update', {
        documentId,
        update: updateBase64,
        origin: user
      });

      console.log('📤 Sent update to server');
    };

    // Listen for document changes
    ydoc.on('update', updateHandler);

    return () => {
      ydoc.off('update', updateHandler);
    };
  }, [socket, ydoc, synced, documentId, user.id]);

  /**
   * Handle user presence updates
   */
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = ({ user: newUser, users }: { user: User; users: User[] }) => {
      setActiveUsers(users);
      if (onUsersChange) {
        onUsersChange(users);
      }
      console.log('👤 User joined:', newUser.name);
    };

    const handleUserLeft = ({ user: leftUser, users }: { user: User; users: User[] }) => {
      setActiveUsers(users);
      if (onUsersChange) {
        onUsersChange(users);
      }
      console.log('👋 User left:', leftUser?.name);
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, onUsersChange]);

  /**
   * Get or create Yjs text type
   */
  const getText = useCallback((key: string = 'content'): Y.Text | null => {
    if (!ydoc) return null;
    return ydoc.getText(key);
  }, [ydoc]);

  /**
   * Get or create Yjs map type
   */
  const getMap = useCallback((key: string): Y.Map<unknown> | null => {
    if (!ydoc) return null;
    return ydoc.getMap(key);
  }, [ydoc]);

  /**
   * Get or create Yjs array type
   */
  const getArray = useCallback((key: string): Y.Array<unknown> | null => {
    if (!ydoc) return null;
    return ydoc.getArray(key);
  }, [ydoc]);

  return {
    ydoc,
    synced,
    activeUsers,
    getText,
    getMap,
    getArray
  };
}
