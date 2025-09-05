"use client";

import { useComments } from "@/hooks/use-comments";
import { Comment } from "@/lib/types";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { ScrollArea } from "../scroll-area";

interface CommentListProps {
  ticketId: string;
  className?: string;
}

export function CommentList({ ticketId, className }: CommentListProps) {
  const { data: comments, error, isLoading, refetch } = useComments(ticketId);

  const commentList = comments || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500">Error loading comments</p>
        <button
          onClick={() => refetch()}
          className="text-blue-500 hover:text-blue-700 mt-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold">
          Comments ({commentList.length})
        </h3>
        
        {commentList.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-4 pr-4">
              {commentList.map((comment: Comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  ticketId={ticketId}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* TODO: HARDCODED USER */}
      <CommentForm ticketId={ticketId} userId="u1" />
    </div>
  );
}
