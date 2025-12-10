/**
 * Real-time connection service for comment updates
 * Uses Encore's Streaming API to receive real-time updates from the backend
 */

import { getEncoreClient } from "@/lib/api/client-side";
import type { comment } from "@/lib/api/encore-client";

export interface CommentEvent {
  type: "comment.created" | "comment.updated" | "comment.deleted";
  ticketId: string;
  commentId?: string;
  comment?: any;
}

export type CommentEventHandler = (event: CommentEvent) => void;

class RealTimeCommentService {
  private streams: Map<string, any> = new Map(); // Map of ticketId to stream
  private handlers: Map<string, Set<CommentEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private authToken: string | null = null;

  /**
   * Set authentication token for Encore client
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Connect to the comment stream for a specific ticket
   */
  private async connectToTicketStream(ticketId: string) {
    // Don't reconnect if stream already exists
    if (this.streams.has(ticketId)) {
      return;
    }

    if (!this.authToken) {
      return;
    }

    try {
      const client = getEncoreClient(this.authToken);
      const stream = await client.comment.commentStream(ticketId);

      this.streams.set(ticketId, stream);

      // Process incoming events
      this.processStream(ticketId, stream);
    } catch {
      this.scheduleReconnect(ticketId);
    }
  }

  /**
   * Process incoming stream events
   */
  private async processStream(ticketId: string, stream: any) {
    try {
      for await (const message of stream) {
        // Extract the event from the message wrapper
        const event = message.event;
        if (event && event.ticketId === ticketId) {
          this.emit(event);
        }
      }
    } catch {
      // Stream error
    } finally {
      // Stream closed, clean up
      this.streams.delete(ticketId);

      // If we still have handlers for this ticket, try to reconnect
      if (this.handlers.has(ticketId) && this.handlers.get(ticketId)!.size > 0) {
        this.scheduleReconnect(ticketId);
      }
    }
  }

  /**
   * Subscribe to comment events for a specific ticket
   */
  subscribe(ticketId: string, handler: CommentEventHandler) {
    if (!this.handlers.has(ticketId)) {
      this.handlers.set(ticketId, new Set());
    }
    this.handlers.get(ticketId)!.add(handler);

    // Connect to the stream for this ticket
    this.connectToTicketStream(ticketId);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(ticketId);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(ticketId);
          // Close the stream for this ticket
          const stream = this.streams.get(ticketId);
          if (stream) {
            stream.close();
            this.streams.delete(ticketId);
          }
        }
      }
    };
  }

  /**
   * Emit an event to all subscribed handlers for a ticket
   */
  private emit(event: CommentEvent) {
    const handlers = this.handlers.get(event.ticketId);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch {
          // Handler error
        }
      });
    }
  }

  /**
   * Schedule a reconnection attempt for a specific ticket
   */
  private scheduleReconnect(ticketId: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connectToTicketStream(ticketId);
    }, delay);
  }

  /**
   * Disconnect all streams
   */
  disconnect() {
    for (const [ticketId, stream] of this.streams.entries()) {
      stream.close();
    }
    this.streams.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Get connection status for a ticket
   */
  isConnected(ticketId: string): boolean {
    return this.streams.has(ticketId);
  }

  /**
   * Simulate receiving a real-time event (for testing and optimistic updates)
   */
  simulateEvent(event: CommentEvent) {
    this.emit(event);
  }
}

// Global instance
export const realTimeService = new RealTimeCommentService();

// Note: Auth token needs to be set when the user logs in
// This can be done in the useComments hook or a global auth provider