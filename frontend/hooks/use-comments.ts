"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCommentApi } from "@/lib/api/comment-client";
import { Comment } from "@/lib/types";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";
import { realTimeService, CommentEvent } from "@/lib/realtime";
import { getAccessToken } from "@auth0/nextjs-auth0";

interface CreateCommentParams {
  userId: string;
  ticketId: string;
  content: string;
  internal?: boolean;
}

interface UpdateCommentParams {
  ticketId: string;
  commentId: string;
  content: string;
  internal?: boolean;
}

interface DeleteCommentParams {
  ticketId: string;
  commentId: string;
}

export function useComments(ticketId: string) {
  const commentApi = useCommentApi();
  const queryClient = useQueryClient();

  const getAuthToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  // Handle real-time comment events
  const handleCommentEvent = useCallback(
    (event: CommentEvent) => {
      const queryKey = ["comments", ticketId];

      switch (event.type) {
        case "comment.created":
          if (event.comment) {
            queryClient.setQueryData<Comment[]>(queryKey, (oldComments) => {
              if (!oldComments) return [event.comment];
              // Avoid duplicates by checking if comment already exists
              const exists = oldComments.some((c) => c.id === event.comment.id);
              return exists ? oldComments : [...oldComments, event.comment];
            });
          }
          break;

        case "comment.updated":
          if (event.comment) {
            queryClient.setQueryData<Comment[]>(queryKey, (oldComments) => {
              if (!oldComments) return [];
              return oldComments.map((c) =>
                c.id === event.comment.id ? event.comment : c
              );
            });
          }
          break;

        case "comment.deleted":
          if (event.commentId) {
            queryClient.setQueryData<Comment[]>(queryKey, (oldComments) => {
              if (!oldComments) return [];
              return oldComments.filter((c) => c.id !== event.commentId);
            });
          }
          break;
      }
    },
    [queryClient, ticketId]
  );

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = realTimeService.subscribe(ticketId, handleCommentEvent);
    return unsubscribe;
  }, [ticketId, handleCommentEvent]);

  return useQuery({
    queryKey: ["comments", ticketId],
    queryFn: async () => {
      const response = await commentApi.listComments(ticketId);
      return response.comments;
    },
    refetchInterval: 30000, // Poll every 30 seconds as fallback // TODO: adjust or remove intervals - higher intervals are better for performance
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

export function useCreateComment() {
  const commentApi = useCommentApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      ticketId,
      content,
      internal,
    }: CreateCommentParams) => {
      const response = await commentApi.createComment({
        userId,
        ticketId,
        content,
        internal: internal || false,
      });
      return response.comment;
    },
    onMutate: async ({ userId, ticketId, content, internal }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["comments", ticketId] });

      // Snapshot of previous value
      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        ticketId,
      ]);

      // Optimistically update with new comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}-${Math.random()}`,
        content,
        ticketId,
        userId,
        internal: internal || false,
        createdAt: new Date(),
        user: {
          id: userId,
          name: "You",
          email: "",
          role: "AGENT",
          createdAt: new Date().toISOString(),
        },
      };

      queryClient.setQueryData<Comment[]>(["comments", ticketId], (old) =>
        old ? [...old, optimisticComment] : [optimisticComment]
      );

      return { previousComments, optimisticComment };
    },
    onError: (error: any, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", variables.ticketId],
          context.previousComments
        );
      }
      toast.error(error.message || "Failed to add comment");
    },
    onSuccess: (newComment, { ticketId }, context) => {
      // Replace optimistic update with real data
      queryClient.setQueryData<Comment[]>(["comments", ticketId], (old) => {
        if (!old) return [newComment];
        return old.map((comment) =>
          comment.id === context?.optimisticComment?.id ? newComment : comment
        );
      });

      // Simulate real-time event for other clients
      realTimeService.simulateEvent({
        type: "comment.created",
        ticketId,
        comment: newComment,
      });

      toast.success("Comment added successfully");
    },
    onSettled: (data, error, { ticketId }) => {
      // Always refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
    },
  });
}

export function useUpdateComment() {
  const commentApi = useCommentApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      commentId,
      content,
      internal,
    }: UpdateCommentParams) => {
      const response = await commentApi.updateComment({
        ticketId,
        commentId,
        content,
        internal,
      });
      return response.comment;
    },
    onMutate: async ({ ticketId, commentId, content, internal }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", ticketId] });

      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        ticketId,
      ]);

      if (previousComments) {
        const updatedComments = previousComments.map((comment) =>
          comment.id === commentId
            ? { ...comment, content, internal: internal ?? comment.internal }
            : comment
        );
        queryClient.setQueryData(["comments", ticketId], updatedComments);
      }

      return { previousComments };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", variables.ticketId],
          context.previousComments
        );
      }
      toast.error(error.message || "Failed to update comment");
    },
    onSuccess: (updatedComment, { ticketId }) => {
      // Simulate real-time event for other clients
      realTimeService.simulateEvent({
        type: "comment.updated",
        ticketId,
        comment: updatedComment,
      });

      toast.success("Comment updated successfully");
    },
    onSettled: (data, error, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
    },
  });
}

export function useDeleteComment() {
  const commentApi = useCommentApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, commentId }: DeleteCommentParams) => {
      return commentApi.deleteComment({
        ticketId,
        commentId,
      });
    },
    onMutate: async ({ ticketId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", ticketId] });

      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        ticketId,
      ]);

      if (previousComments) {
        const updatedComments = previousComments.filter(
          (comment) => comment.id !== commentId
        );
        queryClient.setQueryData(["comments", ticketId], updatedComments);
      }

      return { previousComments };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", variables.ticketId],
          context.previousComments
        );
      }
      toast.error(error.message || "Failed to delete comment");
    },
    onSuccess: (result, { ticketId, commentId }) => {
      // Simulate real-time event for other clients
      realTimeService.simulateEvent({
        type: "comment.deleted",
        ticketId,
        commentId,
      });

      toast.success("Comment deleted successfully");
    },
    onSettled: (data, error, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
    },
  });
}

/**
 * Hook to get comment count for real-time updates
 */
export function useCommentCount(ticketId: string) {
  const { data: comments } = useComments(ticketId);
  return comments?.length ?? 0;
}
