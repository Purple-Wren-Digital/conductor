"use client";

import { getAccessToken } from "@auth0/nextjs-auth0";
import type { Comment } from "@/lib/types";
import { API_BASE } from "./utils";
import { parseJsonSafe } from "../utils";

async function getAuth0AccessToken(): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    return "local";
  }
  return await getAccessToken();
}

interface CreateCommentRequest {
  userId: string;
  ticketId: string;
  content: string;
  internal: boolean;
}

interface UpdateCommentRequest {
  ticketId: string;
  commentId: string;
  content: string;
  internal?: boolean;
}

interface DeleteCommentRequest {
  ticketId: string;
  commentId: string;
}

interface ListCommentsResponse {
  comments: Comment[];
}

interface CommentResponse {
  comment: Comment;
}

class CommentApiClient {
  async listComments(ticketId: string): Promise<ListCommentsResponse> {
    const accessToken = await getAuth0AccessToken();
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
    return parseJsonSafe<ListCommentsResponse>(res);
  }

  async createComment(request: CreateCommentRequest): Promise<CommentResponse> {
    const accessToken = await getAuth0AccessToken();
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          content: request.content,
          internal: request.internal,
        }),
      }
    );
    return parseJsonSafe<CommentResponse>(res);
  }

  async updateComment(request: UpdateCommentRequest): Promise<CommentResponse> {
    const accessToken = await getAuth0AccessToken();
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments/${request.commentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          content: request.content,
          internal: request.internal,
        }),
      }
    );
    return parseJsonSafe<CommentResponse>(res);
  }

  async deleteComment(request: DeleteCommentRequest): Promise<void> {
    const accessToken = await getAuth0AccessToken();
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments/${request.commentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );
    await parseJsonSafe(res);
  }
}

// Hook to use the comment API client
export function useCommentApi(): CommentApiClient {
  return new CommentApiClient();
}
