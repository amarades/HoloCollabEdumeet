import type { ChatMessage } from '../realtime/SocketManager';

interface StoredChatMessage extends ChatMessage {
    roomId: string;
}

export class ChatStorage {
    private static readonly STORAGE_KEY = 'holocollab_chat_history';
    private static readonly MAX_MESSAGES = 100; // Limit storage to prevent bloat

    /**
     * Save a chat message to localStorage
     */
    static saveMessage(roomId: string, message: ChatMessage): void {
        try {
            const existingMessages = this.getMessages(roomId);
            const newMessage: StoredChatMessage = {
                ...message,
                roomId,
                timestamp: message.timestamp || Date.now()
            };

            // Add new message and keep only the most recent MAX_MESSAGES
            const updatedMessages = [...existingMessages, newMessage]
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-this.MAX_MESSAGES);

            const storageData = this.getStorageData();
            storageData[roomId] = updatedMessages;
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
        } catch (error) {
            console.error('Failed to save chat message:', error);
        }
    }

    /**
     * Get all messages for a specific room
     */
    static getMessages(roomId: string): StoredChatMessage[] {
        try {
            const storageData = this.getStorageData();
            return storageData[roomId] || [];
        } catch (error) {
            console.error('Failed to get chat messages:', error);
            return [];
        }
    }

    /**
     * Clear all messages for a specific room
     */
    static clearMessages(roomId: string): void {
        try {
            const storageData = this.getStorageData();
            delete storageData[roomId];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
        } catch (error) {
            console.error('Failed to clear chat messages:', error);
        }
    }

    /**
     * Clear all chat history (for privacy/cleanup)
     */
    static clearAllMessages(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear all chat messages:', error);
        }
    }

    /**
     * Get the entire storage data object
     */
    private static getStorageData(): Record<string, StoredChatMessage[]> {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to parse chat storage:', error);
            return {};
        }
    }

    /**
     * Sync messages with remote (when joining a room)
     */
    static syncWithRemote(roomId: string, remoteMessages: ChatMessage[]): void {
        try {
            const localMessages = this.getMessages(roomId);
            
            // Merge local and remote messages, removing duplicates
            const allMessages = [...localMessages, ...remoteMessages.map(msg => ({ ...msg, roomId }))]
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-this.MAX_MESSAGES);

            const storageData = this.getStorageData();
            storageData[roomId] = allMessages;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
        } catch (error) {
            console.error('Failed to sync chat messages:', error);
        }
    }

    /**
     * Get messages since a specific timestamp (for incremental sync)
     */
    static getMessagesSince(roomId: string, sinceTimestamp: number): StoredChatMessage[] {
        try {
            const messages = this.getMessages(roomId);
            return messages.filter(msg => msg.timestamp > sinceTimestamp);
        } catch (error) {
            console.error('Failed to get messages since timestamp:', error);
            return [];
        }
    }
}
