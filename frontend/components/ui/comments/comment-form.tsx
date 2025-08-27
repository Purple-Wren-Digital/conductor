"use client";

import { useState, useEffect, useRef } from "react";
import { useCreateComment } from "@/hooks/use-comments";
import { Button } from "../button";
import { Textarea } from "../textarea";
import { Switch } from "../switch";
import { Label } from "../label";
import { Send } from "lucide-react";

interface CommentFormProps {
  ticketId: string;
}

const DRAFT_KEY_PREFIX = "comment_draft_";

export function CommentForm({ ticketId }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = `${DRAFT_KEY_PREFIX}${ticketId}`;
  
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
      localStorage.setItem(
        draftKey,
        JSON.stringify({ content, isInternal })
      );
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [content, isInternal, draftKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createMutation.mutate(
        {
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