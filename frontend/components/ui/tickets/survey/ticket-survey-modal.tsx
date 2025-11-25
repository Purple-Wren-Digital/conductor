import React, { useState } from "react";
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
import { useFetchTicketSurveyResults } from "@/hooks/use-tickets";
import { API_BASE } from "@/lib/api/utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export interface TicketSurveyFormProps {
  ticketId: string;
  surveyId?: string;
  showSurveyModal: boolean;
  setShowSurveyModal: (show: boolean) => void;
  refreshSurvey: Promise<void>;
  disabled: boolean;
}

export default function TicketSurveyModal({
  ticketId,
  surveyId,
  showSurveyModal,
  setShowSurveyModal,
  refreshSurvey,
  disabled,
}: TicketSurveyFormProps) {
  const { data: surveyData } = useFetchTicketSurveyResults(
    "RESOLVED",
    surveyId
  );
  const [overAllRating, setOverallRating] = useState(
    surveyData?.overallRating ?? 0
  );
  const [assigneeRating, setAssigneeRating] = useState(
    surveyData?.assigneeRating ?? 0
  );
  const [marketCenterRating, setMarketCenterRating] = useState(
    surveyData?.marketCenterRating ?? 0
  );
  const [comments, setComments] = useState(surveyData?.comment ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();

  const updateSurveyMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!ticketId) throw new Error("Missing Ticket ID");
      setIsSubmitting(true);

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
    },
    onSuccess: () => {
      toast.success(`Rating submitted successfully!`);
      setShowSurveyModal(false);
    },
    onError: (error) => {
      console.error("Error submitting survey:", error);
      toast.error("Failed to submit survey");
    },
    onSettled() {
      refreshSurvey;
      setIsSubmitting(false);
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
            <DialogTitle className="text-lg font-semibold">
              Ticket Survey
            </DialogTitle>
            <DialogDescription className="flex flex-col gap-1">
              <span>
                Ticket:{" "}
                {`${surveyData?.ticket?.title ? `"${surveyData?.ticket?.title}"` : ""}`}
              </span>
              <span>Please provide your feedback below.</span>
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              updateSurveyMutation.mutate(ticketId);
            }}
          >
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="assigneeRating" className="font-semibold">
                {surveyData?.assignee?.name || "Assignee"} Rating:{" "}
                {assigneeRating.toFixed(2)}
              </Label>
              <StarRatingInput
                value={assigneeRating}
                onChange={setAssigneeRating}
                inputId="assigneeRating"
                disabled={disabled || isSubmitting}
                size={20}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="marketCenterRating" className="font-semibold">
                {surveyData?.marketCenter?.name || "Market Center"} Rating:{" "}
                {marketCenterRating.toFixed(2)}
              </Label>

              <StarRatingInput
                value={marketCenterRating}
                onChange={setMarketCenterRating}
                inputId="marketCenterRating"
                disabled={disabled || isSubmitting}
                size={20}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="overallRating" className="font-semibold">
                Overall Rating: {overAllRating.toFixed(2)}
              </Label>

              <StarRatingInput
                value={overAllRating}
                onChange={setOverallRating}
                inputId="overallRating"
                disabled={disabled || isSubmitting}
                size={20}
              />
            </div>

            <Separator />

            {/* COMMENTS */}
            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments:</Label>
              <Textarea
                id="comments"
                name="comments"
                rows={4}
                cols={50}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={disabled || isSubmitting}
              />
            </div>
            <Separator />

            <div className="space-y-2 flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowSurveyModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={disabled || isSubmitting || !ticketId}
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
