"use client";

import { useState, useEffect, useCallback } from "react";
import { useCreateComment } from "@/hooks/use-comments";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui//switch";
import { Label } from "@/components/ui/label";
import { BasicEditorWithToolbar } from "@/components/ui/tiptap/basic-editor-and-toolbar";
import { Send } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";
import { toast } from "sonner";

interface CommentFormProps {
  ticketId: string;
  refreshAllData: () => Promise<void>;
}

const DRAFT_KEY_PREFIX = "comment_draft_";

export function CommentForm({ ticketId, refreshAllData }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const draftKey = `${DRAFT_KEY_PREFIX}${ticketId}`;

  const { currentUser } = useStore();
  const { permissions } = useUserRole();

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

  const onSubmitSuccess = useCallback(async () => {
    setContent("");
    setIsInternal(false);
    localStorage.removeItem(draftKey);
    await refreshAllData();
  }, [draftKey, refreshAllData]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (content && content.trim()) {
        createMutation.mutate({
          userId: currentUser?.id as string,
          ticketId,
          content: content.trim(),
          internal: isInternal,
          onSubmitSuccess,
        });
      } else {
        toast.error("Comment content cannot be empty");
      }
    },
    [
      content,
      isInternal,
      ticketId,
      currentUser,
      createMutation,
      onSubmitSuccess,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor="comment">Add a comment</Label>
        <div className="relative">
          <BasicEditorWithToolbar
            value={content}
            disabled={createMutation.isPending}
            onChange={setContent}
            placeholder="Write your comment..."
            onSubmit={handleSubmit}
          />
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
