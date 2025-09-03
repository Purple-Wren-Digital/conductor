"use client";

import { getAccessToken } from "@auth0/nextjs-auth0";
import type { Comment } from "@/lib/types";

const API_BASE = "http://localhost:4000";

// async function getAuthToken(): Promise<string> {
//   if (process.env.NODE_ENV === "development") {
//     return "local";
//   }
//   return await getAccessToken();
// }

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text || "No body"}`);
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
}

class CommentApiClient {
  async listComments(ticketId: string): Promise<ListCommentsResponse> {
    // const accessToken = await getAuthToken();
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
      // headers: {
      //   Authorization: `Bearer ${accessToken}`,
      // },
      cache: "no-store",
    });
    return parseJsonSafe<ListCommentsResponse>(res);
  }

  async createComment(request: CreateCommentRequest): Promise<CommentResponse> {
    // const accessToken = await getAuthToken();
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          userId: request.userId,
          content: request.content,
          internal: request.internal,
        }),
      }
    );
    return parseJsonSafe<CommentResponse>(res);
  }

  async updateComment(request: UpdateCommentRequest): Promise<CommentResponse> {
    // const accessToken = await getAuthToken();
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments/${request.commentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${accessToken}`,
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
    // const accessToken = await getAuthToken();
    const res = await fetch(
      `${API_BASE}/tickets/${request.ticketId}/comments/${request.commentId}`,
      {
        method: "DELETE",
        headers: {
          // Authorization: `Bearer ${accessToken}`,
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
