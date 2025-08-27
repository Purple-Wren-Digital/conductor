"use client";

import { useState } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import { useUpdateComment, useDeleteComment } from "@/hooks/use-comments";
import { Comment } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { Button } from "../button";
import { Textarea } from "../textarea";
import { Badge } from "../badge";
import { SafeHtml } from "../safe-html";
import { formatDistanceToNow } from "date-fns";
import { Edit2, Trash2, Check, X } from "lucide-react";

interface CommentItemProps {
  comment: Comment;
  ticketId: string;
}

export function CommentItem({ comment, ticketId }: CommentItemProps) {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();

  const isOwnComment = user?.sub === comment.user?.id;

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
      deleteMutation.mutate(
        {
          ticketId,
          commentId: comment.id,
        }
      );
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

  return (
    <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card">
      <Avatar className="w-8 h-8">
        <AvatarFallback className="text-xs">
          {comment.user?.name ? getInitials(comment.user.name) : "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <p className="text-sm font-medium text-foreground">
            {comment.user?.name || "Unknown User"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </p>
          {comment.internal && (
            <Badge variant="secondary" className="text-xs">
              Internal
            </Badge>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none"
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
            {isOwnComment && (
              <div className="flex space-x-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-6 px-2 text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}