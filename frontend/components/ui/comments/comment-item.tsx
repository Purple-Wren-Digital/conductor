"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "../avatar";
import { Button } from "../button";
import { Badge } from "../badge";
import { cn } from "@/lib/cn";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BasicEditorWithToolbar } from "@/components/ui/tiptap/basic-editor-and-toolbar";
import { SafeHtml } from "@/components/ui/safe-html";
import { formatDistanceToNow } from "date-fns";
import { useUpdateComment, useDeleteComment } from "@/hooks/use-comments";
import { Comment } from "@/lib/types";
import { Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface CommentItemProps {
  comment: Comment;
  ticketId: string;
  isOwn: boolean;
  refreshAllData: () => Promise<void>;
}

export function CommentItem({
  comment,
  ticketId,
  isOwn,
  refreshAllData,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();

  const handleSave = async () => {
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
    await refreshAllData();
  };

  const handleCancel = async () => {
    setEditContent(comment.content);
    setIsEditing(false);
    await refreshAllData();
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      {
        ticketId,
        commentId: comment.id,
      },
      {
        onSuccess: async () => {
          setIsDeleteDialogOpen(false);
          await refreshAllData();
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
    <>
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
                    onClick={() => setIsDeleteDialogOpen(true)}
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
