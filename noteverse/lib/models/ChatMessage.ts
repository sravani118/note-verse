/**
 * ChatMessage Model
 * 
 * Represents a chat message in a document's chat space
 * Messages are scoped to a specific document and include sender information
 */

import { ObjectId } from 'mongodb';

export interface ChatMessage {
  _id?: ObjectId;
  documentId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}

/**
 * Create a new chat message document
 */
export function createChatMessage(
  documentId: ObjectId,
  senderId: ObjectId,
  senderName: string,
  senderEmail: string,
  message: string
): ChatMessage {
  const now = new Date();
  
  return {
    documentId,
    senderId,
    senderName,
    senderEmail,
    message: message.trim(),
    createdAt: now,
    updatedAt: now,
    isDeleted: false
  };
}
