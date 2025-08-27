import { Local } from "./encore-client";
import { clientSideEnv } from "../env/client-side";

export interface CreateCommentRequest {
  ticketId: string;
  content: string;
  internal?: boolean;
}

export interface UpdateCommentRequest {
  ticketId: string;
  commentId: string;
  content: string;
  internal?: boolean;
}

export interface DeleteCommentRequest {
  ticketId: string;
  commentId: string;
}

export interface CommentResponse {
  comment: any; // Will use the backend Comment type
}

export interface ListCommentsResponse {
  comments: any[]; // Will use the backend Comment type
}

export function useCommentApi() {
  // Get the correct base URL
  const getBaseUrl = () => {
    if (process.env.NODE_ENV === "development") {
      return Local;
    }
    // In production, use the staging environment
    return `https://staging-conductor-ee92.encr.app`;
  };

  const getHeaders = async () => {
    // In development, always use "local" token
    if (process.env.NODE_ENV === "development") {
      return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer local',
      };
    }

    // Get Auth0 access token from our API route
    try {
      const tokenResponse = await fetch("/api/auth/token");
      if (!tokenResponse.ok) {
        throw new Error("Failed to get access token");
      }
      
      const { accessToken } = await tokenResponse.json();
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      };
    } catch (error) {
      return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer local', // Fallback to local
      };
    }
  };

  return {
    async listComments(ticketId: string): Promise<ListCommentsResponse> {
      const headers = await getHeaders();
      const response = await fetch(`${getBaseUrl()}/tickets/${ticketId}/comments`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch comments: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },

    async createComment(data: CreateCommentRequest): Promise<CommentResponse> {
      const headers = await getHeaders();
      const response = await fetch(`${getBaseUrl()}/tickets/${data.ticketId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: data.content,
          internal: data.internal || false,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create comment: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },

    async updateComment(data: UpdateCommentRequest): Promise<CommentResponse> {
      const headers = await getHeaders();
      const response = await fetch(`${getBaseUrl()}/tickets/${data.ticketId}/comments/${data.commentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          content: data.content,
          internal: data.internal,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update comment: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },

    async deleteComment(data: DeleteCommentRequest): Promise<{ success: boolean; message: string }> {
      const headers = await getHeaders();
      const response = await fetch(`${getBaseUrl()}/tickets/${data.ticketId}/comments/${data.commentId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete comment: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
  };
}