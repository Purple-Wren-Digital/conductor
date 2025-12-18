"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BasicEditorWithToolbar } from "@/components/ui/tiptap/basic-editor-and-toolbar";
import { Button } from "@/components/ui/button";
import { SafeHtml } from "@/components/ui/safe-html";
import { useStore } from "@/context/store-provider";
import { formatDistanceToNow } from "date-fns";
import { useUpdateComment, useDeleteComment } from "@/hooks/use-comments";
import { Comment } from "@/lib/types";
import { Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface CommentItemProps {
  comment: Comment;
  ticketId: string;
}

export function CommentItem({ comment, ticketId }: CommentItemProps) {
  const { currentUser } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();

  const isOwnComment = currentUser?.id === comment.user?.id;

  const handleSave = () => {
    if (!editContent || !editContent.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    if (editContent && editContent.trim() !== comment.content) {
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
      toast.info("No changes to save");
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      {
        ticketId,
        commentId: comment.id,
      },
      {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
        },
      }
    );
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
    <>
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
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </p>
            {comment.internal && (
              <Badge variant="secondary" className="text-xs">
                Internal
              </Badge>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <BasicEditorWithToolbar
                value={editContent}
                disabled={updateMutation.isPending}
                onChange={setEditContent}
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
                className="text-sm text-foreground break-words rich-text [&_a]:underline [&_a:hover]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:list-item [&_li]:mb-1"
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
                    onClick={() => {
                      setIsDeleteDialogOpen(true);
                    }}
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
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <div>
            <AlertDialogTitle>
              Are you sure you want to delete your comment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </div>
          <div>
            <SafeHtml
              content={comment.content}
              className="text-sm text-foreground break-words border rich-text [&_a]:underline [&_a:hover]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:list-item [&_li]:mb-1 p-4 bg-gray-50 rounded-md mt-2"
            />
          </div>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="ml-2"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
