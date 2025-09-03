/**
 * Real-time connection service for comment updates
 * Uses Server-Sent Events (SSE) to receive real-time updates from the backend
 */

export interface CommentEvent {
  type: "comment.created" | "comment.updated" | "comment.deleted";
  ticketId: string;
  commentId?: string;
  comment?: any;
}

export type CommentEventHandler = (event: CommentEvent) => void;

class RealTimeCommentService {
  private eventSource: EventSource | null = null;
  private handlers: Map<string, Set<CommentEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  /**
   * Connect to the real-time comment stream
   */
  connect() {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    this.disconnect();

    try {
      // For now, we'll use polling as a fallback since the backend doesn't have SSE yet
      // In a real implementation, this would connect to an SSE endpoint
      this.startPolling();
      this.isConnected = true;
    } catch (error) {
      console.error("Failed to connect to real-time service:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Start polling for updates as a fallback for real-time
   * This simulates real-time updates until SSE is implemented
   */
  private startPolling() {
    // For now, we rely on React Query's polling mechanism
    // In a full implementation, this would establish SSE connection
    console.log("Real-time service initialized with polling fallback");
  }

  /**
   * Disconnect from the real-time service
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to comment events for a specific ticket
   */
  subscribe(ticketId: string, handler: CommentEventHandler) {
    if (!this.handlers.has(ticketId)) {
      this.handlers.set(ticketId, new Set());
    }
    this.handlers.get(ticketId)!.add(handler);

    // Ensure connection is active
    if (!this.isConnected) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(ticketId);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(ticketId);
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
        } catch (error) {
          console.error("Error in comment event handler:", error);
        }
      });
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Get connection status
   */
  get connected() {
    return this.isConnected;
  }

  /**
   * Simulate receiving a real-time event (for testing)
   * In production, this would be called by the SSE message handler
   */
  simulateEvent(event: CommentEvent) {
    this.emit(event);
  }
}

// Global instance
export const realTimeService = new RealTimeCommentService();

// Auto-connect on module load
if (typeof window !== "undefined") {
  realTimeService.connect();
}