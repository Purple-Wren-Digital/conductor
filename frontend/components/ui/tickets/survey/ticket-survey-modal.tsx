import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StarRatingInput } from "@/components/ui/ratingInput/star-rating-input";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE } from "@/lib/api/utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Survey } from "@/lib/types";

export interface TicketSurveyFormProps {
  ticketId: string;
  survey: Survey;

  showSurveyModal: boolean;
  setShowSurveyModal: (show: boolean) => void;
  refreshSurvey: () => Promise<void>;
  disabled: boolean;
}

export default function TicketSurveyModal({
  ticketId,
  survey,
  showSurveyModal,
  setShowSurveyModal,
  refreshSurvey,
  disabled,
}: TicketSurveyFormProps) {
  const [overAllRating, setOverallRating] = useState(0);
  const [assigneeRating, setAssigneeRating] = useState(0);
  const [marketCenterRating, setMarketCenterRating] = useState(0);
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { getToken } = useAuth();

  const prefillSurveyValues = useCallback(() => {
    setOverallRating(survey?.overallRating ?? 0);
    setAssigneeRating(survey?.assigneeRating ?? 0);
    setMarketCenterRating(survey?.marketCenterRating ?? 0);
    setComments(survey?.comment ?? "");
  }, [survey]);

  useEffect(() => {
    if (showSurveyModal && survey) {
      prefillSurveyValues();
    }
  }, [showSurveyModal, survey, prefillSurveyValues]);

  const validateSurveyInputs = (): boolean => {
    if (overAllRating < 0 || assigneeRating < 0 || marketCenterRating < 0) {
      toast.error("Please provide ratings for all categories.");
      return false;
    }
    if (
      survey.completed &&
      survey?.overallRating === overAllRating &&
      survey?.assigneeRating === assigneeRating &&
      survey?.marketCenterRating === marketCenterRating &&
      survey?.comment === comments
    ) {
      setErrorMessage("Please make changes before submitting");
      return false;
    }
    return true;
  };

  const updateSurveyMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!ticketId) throw new Error("Missing Ticket ID");
      setIsLoading(true);

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(`${API_BASE}/ticket/surveys/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId: ticketId,
          overallRating: overAllRating,
          assigneeRating: assigneeRating,
          marketCenterRating: marketCenterRating,
          comments: comments,
        }),
      });

      if (!response.ok) throw new Error("Failed to update survey");
      const data = await response.json();
      return data;
    },
    onSuccess: async () => {
      toast.success(`Rating submitted successfully!`);
      setShowSurveyModal(false);
    },
    onError: () => {
      toast.error("Failed to submit survey");
    },
    onSettled: async () => {
      await refreshSurvey();
      setIsLoading(false);
    },
  });

  return (
    <Dialog
      open={showSurveyModal}
      onOpenChange={() => setShowSurveyModal(!showSurveyModal)}
    >
      <DialogPortal>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Survey</DialogTitle>

            <DialogDescription className="flex flex-col gap-0.5 my-2">
              <span>
                Please evaluate your experience with this ticket, using a 0–5
                scale.
              </span>
              <span>0 = poor, 5 = excellent</span>
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (!validateSurveyInputs()) return;
              updateSurveyMutation.mutate(ticketId);
            }}
          >
            <div className="space-y-2">
              <Label
                htmlFor="assigneeRating"
                className="flex flex-col gap-1 items-start font-semibold"
              >
                <span className="flex justify-between gap-2 w-full">
                  <span>{survey?.assignee?.name || "Assignee"} Rating:</span>
                  <span>{assigneeRating.toFixed(2)}</span>
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Staff person assigned to your ticket
                </span>
              </Label>
              <StarRatingInput
                value={assigneeRating}
                onChange={setAssigneeRating}
                inputId="assigneeRating"
                disabled={disabled || isLoading}
                size={20}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label
                htmlFor="marketCenterRating"
                className="flex flex-col gap-1 items-start font-semibold"
              >
                <span className="flex justify-between gap-2 w-full">
                  {survey?.marketCenter?.name || "Market Center"} Rating:
                  <span>{marketCenterRating.toFixed(2)}</span>
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Market Center handling your ticket
                </span>
              </Label>

              <StarRatingInput
                value={marketCenterRating}
                onChange={setMarketCenterRating}
                inputId="marketCenterRating"
                disabled={disabled || isLoading}
                size={20}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label
                htmlFor="overallRating"
                className="flex flex-col gap-1 items-start font-semibold"
              >
                <span className="flex justify-between gap-2 w-full">
                  <span>Overall Rating:</span>
                  <span>{overAllRating.toFixed(2)}</span>
                </span>

                <span className="text-xs text-muted-foreground font-medium">
                  Overall experience with your ticket
                </span>
              </Label>

              <StarRatingInput
                value={overAllRating}
                onChange={setOverallRating}
                inputId="overallRating"
                disabled={disabled || isLoading}
                size={20}
              />
            </div>

            <Separator />

            {/* COMMENTS */}
            <div className="space-y-2">
              <Label htmlFor="comments" className="mb-3">
                Additional Comments:
              </Label>
              <Textarea
                id="comments"
                name="comments"
                rows={4}
                cols={50}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={disabled || isLoading}
                autoFocus={false}
              />
            </div>
            <Separator />

            <div className="space-y-2 flex items-center justify-end gap-2 mt-4">
              {errorMessage && (
                <p className="text-sm text-red-600 mr-auto font-medium">
                  {errorMessage}
                </p>
              )}
              <Button
                variant="outline"
                onClick={() => setShowSurveyModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={disabled || isLoading || !ticketId || !survey}
              >
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
