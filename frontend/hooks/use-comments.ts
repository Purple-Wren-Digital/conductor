"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCommentApi } from "@/lib/api/comment-client";
import { Comment } from "@/lib/types";
import { toast } from "sonner";

interface CreateCommentParams {
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

  return useQuery({
    queryKey: ["comments", ticketId],
    queryFn: async () => {
      const response = await commentApi.listComments(ticketId);
      return response.comments;
    },
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

export function useCreateComment() {
  const commentApi = useCommentApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, content, internal }: CreateCommentParams) => {
      const response = await commentApi.createComment({
        ticketId,
        content,
        internal: internal || false,
      });
      return response.comment;
    },
    onMutate: async ({ ticketId, content, internal }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["comments", ticketId] });

      // Snapshot of previous value
      const previousComments = queryClient.getQueryData<Comment[]>(["comments", ticketId]);

      // Optimistically update with new comment
      if (previousComments) {
        const optimisticComment: Comment = {
          id: `temp-${Date.now()}`,
          content,
          ticketId,
          userId: "current-user",
          internal: internal || false,
          createdAt: new Date(),
          user: {
            id: "current-user", // Will be replaced by real data
            name: "You",
            email: "",
            role: "AGENT",
            createdAt: new Date().toISOString(),
          },
        };

        queryClient.setQueryData<Comment[]>(
          ["comments", ticketId],
          [...previousComments, optimisticComment]
        );
      }

      return { previousComments };
    },
    onError: (error: any, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", variables.ticketId], context.previousComments);
      }
      toast.error(error.message || "Failed to add comment");
    },
    onSuccess: (newComment, { ticketId }) => {
      // Replace optimistic update with real data
      const comments = queryClient.getQueryData<Comment[]>(["comments", ticketId]);
      if (comments) {
        const updatedComments = comments.map((comment) =>
          comment.id.startsWith("temp-") ? newComment : comment
        );
        queryClient.setQueryData(["comments", ticketId], updatedComments);
      }
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
    mutationFn: async ({ ticketId, commentId, content, internal }: UpdateCommentParams) => {
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

      const previousComments = queryClient.getQueryData<Comment[]>(["comments", ticketId]);

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
        queryClient.setQueryData(["comments", variables.ticketId], context.previousComments);
      }
      toast.error(error.message || "Failed to update comment");
    },
    onSuccess: () => {
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

      const previousComments = queryClient.getQueryData<Comment[]>(["comments", ticketId]);

      if (previousComments) {
        const updatedComments = previousComments.filter((comment) => comment.id !== commentId);
        queryClient.setQueryData(["comments", ticketId], updatedComments);
      }

      return { previousComments };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", variables.ticketId], context.previousComments);
      }
      toast.error(error.message || "Failed to delete comment");
    },
    onSuccess: () => {
      toast.success("Comment deleted successfully");
    },
    onSettled: (data, error, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
    },
  });
}