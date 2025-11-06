"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCreateComment } from "@/hooks/use-comments";
import { Button } from "../button";
import { Textarea } from "../textarea";
import { Switch } from "../switch";
import { Label } from "../label";
import { Send } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { useAuth, useUser } from "@clerk/nextjs";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";
import { API_BASE } from "@/lib/api/utils";
import { parseJsonSafe } from "@/lib/utils";

interface CommentFormProps {
  ticketId: string;
}

const DRAFT_KEY_PREFIX = "comment_draft_";

export function CommentForm({ ticketId }: CommentFormProps) {
  const { user: clerkUser } = useUser();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = `${DRAFT_KEY_PREFIX}${ticketId}`;

  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  const createMutation = useCreateComment();
  const { getToken } = useAuth();

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

  const fetchTicket = async (ticketId: string) => {
    if (!ticketId) return;
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!currentUser?.id) return;
    if (content.trim()) {
      createMutation.mutate(
        {
          userId: currentUser?.id as string,
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
      // if (ticket?.assignee) {
      //   await sendNewCommentNotifications(ticket || null);
      // }

      //  [ticket?.assignee, ticket?.creatorId].forEach(async (user)=>{await sendNewCommentNotifications(ticket || null);})
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
          <>
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
            <div />
          </>
        )}

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
