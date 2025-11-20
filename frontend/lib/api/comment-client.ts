"use client";

import type { Comment, UsersToNotify } from "@/lib/types";
import { API_BASE } from "./utils";

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText} - ${text || "No body"}`
    );
  }
  if (ct.includes("application/json")) {
    return res.json();
  }
  const text = await res.text().catch(() => "");
  throw new Error(
    `Expected JSON but got ${ct || "unknown content-type"}. First 200 chars:\n${text.slice(0, 200)}`
  );
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
  usersToNotify?: UsersToNotify[];
  ticketTitle?: string;
}

class CommentApiClient {
  constructor(private authToken: string) {}

  async listComments(ticketId: string): Promise<ListCommentsResponse> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
      cache: "no-store",
    });
    return parseJsonSafe<ListCommentsResponse>(res);
  }

  async createComment(request: CreateCommentRequest): Promise<CommentResponse> {
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
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
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments/${request.commentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
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
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments/${request.commentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
        cache: "no-store",
      }
    );
    await parseJsonSafe(res);
  }
}

// Hook to use the comment API client
export function createCommentApi(authToken: string): CommentApiClient {
  return new CommentApiClient(authToken);
}
