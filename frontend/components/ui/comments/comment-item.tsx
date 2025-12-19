"use client";

import { useState } from "react";
import { useUpdateComment, useDeleteComment } from "@/hooks/use-comments";
import { Comment } from "@/lib/types";
import { Avatar, AvatarFallback } from "../avatar";
import { Button } from "../button";
import { Textarea } from "../textarea";
import { Badge } from "../badge";
import { SafeHtml } from "../safe-html";
import { formatDistanceToNow } from "date-fns";
import { Edit2, Trash2, Check, X } from "lucide-react";
import { useStore } from "@/context/store-provider";
import { cn } from "@/lib/cn";

interface CommentItemProps {
  comment: Comment;
  ticketId: string;
  isOwn: boolean;
}

export function CommentItem({ comment, ticketId, isOwn }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();

  const handleSave = () => {
    if (editContent.trim() !== comment.content) {
      updateMutation.mutate(
        {
          ticketId,
          commentId: comment.id,
          content: editContent.trim(),
          internal: comment.internal,
        },
        {
          onSuccess: () => {
            setIsEditing(false);
          },
        }
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteMutation.mutate({
        ticketId,
        commentId: comment.id,
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Determine bubble background color
  const getBubbleClasses = () => {
    if (comment.internal) {
      return "bg-violet-100 dark:bg-violet-900/30";
    }
    if (isOwn) {
      return "bg-[#6D1C24]/10 dark:bg-[#6D1C24]/20";
    }
    return "bg-muted";
  };

  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-[85%]",
        isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <Avatar className="w-7 h-7 flex-shrink-0">
        <AvatarFallback className="text-xs">
          {comment.user?.name ? getInitials(comment.user.name) : "U"}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "px-3 py-2 rounded-lg min-w-0",
          getBubbleClasses(),
          isOwn ? "rounded-br-sm" : "rounded-bl-sm"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 mb-1",
            isOwn ? "flex-row-reverse" : ""
          )}
        >
          <p className="text-xs font-medium text-foreground">
            {comment.user?.name || "Unknown User"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
            })}
          </p>
          {comment.internal && (
            <Badge variant="secondary" className="text-xs py-0">
              Internal
            </Badge>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none bg-background"
              placeholder="Write your comment..."
            />
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending || !editContent.trim()}
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <SafeHtml
              content={comment.content}
              className="text-sm text-foreground break-words"
            />
            {isOwn && (
              <div
                className={cn(
                  "flex gap-1 mt-1.5",
                  isOwn ? "justify-end" : "justify-start"
                )}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="h-5 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
