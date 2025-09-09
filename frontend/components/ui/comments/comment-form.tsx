"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCreateComment } from "@/hooks/use-comments";
import { Button } from "../button";
import { Textarea } from "../textarea";
import { Switch } from "../switch";
import { Label } from "../label";
import { Send } from "lucide-react";
import { Ticket } from "../../../lib/types";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useStore } from "@/app/store-provider";
import { API_BASE } from "@/lib/api/utils";

interface CommentFormProps {
  ticketId: string;
  userId: string;
}

const DRAFT_KEY_PREFIX = "comment_draft_";

export function CommentForm({ ticketId, userId }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = `${DRAFT_KEY_PREFIX}${ticketId}`;

  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const createMutation = useCreateComment();

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setContent(draft.content || "");
        setIsInternal(draft.isInternal || false);
      } catch (error) {
        // Invalid JSON, clear the draft
        localStorage.removeItem(draftKey);
      }
    }
  }, [draftKey]);

  // Save draft to localStorage whenever content changes
  useEffect(() => {
    if (content.trim() || isInternal) {
      localStorage.setItem(draftKey, JSON.stringify({ content, isInternal }));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [content, isInternal, draftKey]);

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
      `Expected JSON but got ${
        ct || "unknown content-type"
      }. First 200 chars:\n${text.slice(0, 200)}`
    );
  }

  const fetchTicket = async (ticketId: string) => {
    if (!ticketId) return;
    try {
      const accessToken = await getAuth0AccessToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const ticketData = await parseJsonSafe<{ ticket: Ticket }>(response);
      return ticketData.ticket;
    } catch (error) {
      console.error("Failed to fetch ticket for new comment email");
    }
  };

  const sendNewCommentEmail = async (ticket: Ticket | null) => {
    if (!ticket || !ticket.id) {
      throw new Error("Ticket was null");
    }

    const ticketNewCommentEmailBody = {
      ticketNumber: ticketId,
      ticketTitle: ticket?.title,
      createdOn: ticket?.createdAt,
      commentedOn: new Date(),
      commenter: currentUser,
      comment: content.trim(),
      isInternal: isInternal,
      assignee: ticket?.assignee,
    };
    try {
      const response = await fetch("/api/send/newComment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(ticketNewCommentEmailBody),
      });
      if (!response.ok) {
        console.error("Failed to send email, status:", response.status);
      } else {
        await response.json();
      }
    } catch (err) {
      console.error("Failed to send email", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createMutation.mutate(
        {
          userId,
          ticketId,
          content: content.trim(),
          internal: isInternal,
        },
        {
          onSuccess: () => {
            setContent("");
            setIsInternal(false);
            localStorage.removeItem(draftKey);
          },
        }
      );
      const ticket = await fetchTicket(ticketId);
      await sendNewCommentEmail(ticket || null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (content.trim()) {
        handleSubmit(e);
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Simple text formatting helpers
  const insertText = (beforeText: string, afterText: string = "") => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);

    const newText =
      content.substring(0, start) +
      beforeText +
      selectedText +
      afterText +
      content.substring(end);

    setContent(newText);

    // Set cursor position after formatting
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + beforeText.length + selectedText.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor="comment">Add a comment</Label>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            id="comment"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your comment... (Cmd/Ctrl + Enter to submit)"
            className="min-h-[100px] resize-none pr-12"
            disabled={createMutation.isPending}
          />

          {/* Simple formatting toolbar */}
          <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => insertText("**", "**")}
              className="hover:text-foreground"
              title="Bold"
            >
              **Bold**
            </button>
            <button
              type="button"
              onClick={() => insertText("*", "*")}
              className="hover:text-foreground"
              title="Italic"
            >
              *Italic*
            </button>
            <button
              type="button"
              onClick={() => insertText("`", "`")}
              className="hover:text-foreground"
              title="Code"
            >
              `Code`
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {permissions?.canCreateInternalComments && (
          <div className="flex items-center space-x-2">
            <Switch
              id="internal"
              checked={isInternal}
              onCheckedChange={setIsInternal}
              disabled={createMutation.isPending}
            />
            <Label htmlFor="internal" className="text-sm">
              Internal note (staff only)
            </Label>
          </div>
        )}
        {!permissions?.canCreateInternalComments && <div />}

        <Button
          type="submit"
          disabled={!content.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? (
            "Posting..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Post Comment
            </>
          )}
        </Button>
      </div>

      {content && (
        <p className="text-xs text-muted-foreground">
          Draft saved automatically • Cmd/Ctrl + Enter to submit
        </p>
      )}
    </form>
  );
}
