"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCommentApi } from "@/lib/api/comment-client";
import { Comment } from "@/lib/types";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";
import { realTimeService, CommentEvent } from "@/lib/realtime";
import { ticketDetailQueryKeyParams } from "@/components/ui/tickets/ticket-detail-view";
import { useAuth, useUser } from "@clerk/nextjs";

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

// ------------------- useComments -------------------

export function useComments(ticketId: string) {
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Handle real-time comment events
  const handleCommentEvent = useCallback(
    (event: CommentEvent) => {
      const queryKey = ["comments", ticketId];

      switch (event.type) {
        case "comment.created":
          if (event.comment) {
            queryClient.setQueryData<Comment[]>(queryKey, (oldComments) => {
              if (!oldComments) return [event.comment];
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

  const query = useQuery({
    queryKey: ["comments", ticketId],

    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const commentApi = createCommentApi(token);

      const response = await commentApi.listComments(ticketId);
      return response.comments;
    },
    enabled: isLoaded && !!ticketId,
    refetchInterval: 30000, // Poll every 30 seconds as fallback // TODO: adjust or remove intervals - higher intervals are better for performance
    staleTime: 10000, // Consider data stale after 10 seconds
  });
  return query;
}

// ------------------- useCreateComment -------------------

export function useCreateComment() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      ticketId,
      content,
      internal,
    }: CreateCommentParams) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const commentApi = createCommentApi(token);
      const response = await commentApi.createComment({
        userId,
        ticketId,
        content,
        internal: internal || false,
      });
      return response.comment;
    },
    onMutate: async ({ userId, ticketId, content, internal }) => {
      // Cancel outgoing refetch to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["comments", ticketId] });

      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        ticketId,
      ]);

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
          createdAt: new Date(),
          isActive: true,
          updatedAt: new Date(),
          marketCenterId: null,
          clerkId: clerkUser?.id || "",
          comments: [],
        },
      };

      queryClient.setQueryData<Comment[]>(["comments", ticketId], (old) =>
        old ? [...old, optimisticComment] : [optimisticComment]
      );

      return { previousComments, optimisticComment };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", variables.ticketId],
          context.previousComments
        );
      }
      toast.error(error.message || "Failed to add comment");
    },
    onSuccess: (newComment, { ticketId }, context) => {
      queryClient.setQueryData<Comment[]>(["comments", ticketId], (old) => {
        if (!old) return [newComment];
        return old.map((comment) =>
          comment.id === context?.optimisticComment?.id ? newComment : comment
        );
      });

      realTimeService.simulateEvent({
        type: "comment.created",
        ticketId,
        comment: newComment,
      });

      toast.success("Comment added successfully");
    },
    onSettled: async (data, error, { ticketId }) => {
      await queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
      await queryClient.invalidateQueries({
        queryKey: [
          "ticket-history-recent",
          ticketId,
          ticketDetailQueryKeyParams,
        ],
      });
    },
  });
}

// ------------------- useUpdateComment -------------------

export function useUpdateComment() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      commentId,
      content,
      internal,
    }: UpdateCommentParams) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const commentApi = createCommentApi(token);
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
      realTimeService.simulateEvent({
        type: "comment.updated",
        ticketId,
        comment: updatedComment,
      });

      toast.success("Comment updated successfully");
    },
    onSettled: async (data, error, { ticketId }) => {
      await queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
      await queryClient.invalidateQueries({
        queryKey: [
          "ticket-history-recent",
          ticketId,
          ticketDetailQueryKeyParams,
        ],
      });
    },
  });
}

// ------------------- useDeleteComment -------------------

export function useDeleteComment() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, commentId }: DeleteCommentParams) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const commentApi = createCommentApi(token);
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
      realTimeService.simulateEvent({
        type: "comment.deleted",
        ticketId,
        commentId,
      });

      toast.success("Comment deleted successfully");
    },
    onSettled: async (data, error, { ticketId }) => {
      await queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
      await queryClient.invalidateQueries({
        queryKey: [
          "ticket-history-recent",
          ticketId,
          ticketDetailQueryKeyParams,
        ],
      });
    },
  });
}

// ------------------- useCommentCount -------------------

export function useCommentCount(ticketId: string) {
  const { data: comments } = useComments(ticketId);
  return comments?.length ?? 0;
}
