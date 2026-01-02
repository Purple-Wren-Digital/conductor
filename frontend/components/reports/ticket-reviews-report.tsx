"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportProps } from "@/components/reports/reports-dashboard";
import {
  useFetchTicketReviewsReport,
  TicketReview,
} from "@/hooks/use-reports";
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
} from "@/components/ui/dialog/base-dialog";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ExternalLink, Eye } from "lucide-react";

export const ticketReviewsDefaultValues = {
  reviews: [],
  totalReviews: 0,
  averageOverallRating: null,
  averageAssigneeRating: null,
  averageMarketCenterRating: null,
};

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RatingDisplay({ rating, size = 16 }: { rating: number | null; size?: number }) {
  if (rating === null) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-1">
      <StarRating rating={rating} size={size} />
      <span className="text-sm text-muted-foreground">({rating.toFixed(1)})</span>
    </div>
  );
}

function ReviewDetailModal({
  review,
  open,
  onClose,
}: {
  review: TicketReview | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Survey Details</DialogTitle>
            <DialogDescription>
              Review submitted on {formatDate(review.completedAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Ticket Info */}
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Ticket</p>
              <Link
                href={`/dashboard/tickets/${review.ticketId}`}
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                {review.ticketTitle}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* People */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Submitted By</p>
                <p className="font-medium">{review.surveyorName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Assignee</p>
                <p className="font-medium">{review.assigneeName ?? "-"}</p>
              </div>
            </div>

            {review.marketCenterName && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Market Center</p>
                <p className="font-medium">{review.marketCenterName}</p>
              </div>
            )}

            <Separator />

            {/* Ratings */}
            <div className="space-y-4">
              <p className="font-semibold text-[#6D1C24]">Ratings</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overall Rating</span>
                  <RatingDisplay rating={review.overallRating} size={20} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Assignee Rating</span>
                  <RatingDisplay rating={review.assigneeRating} size={20} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Market Center Rating</span>
                  <RatingDisplay rating={review.marketCenterRating} size={20} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div>
              <p className="font-semibold text-[#6D1C24] mb-2">Comments</p>
              {review.comment ? (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No comments provided</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export default function TicketReviewsReport({
  isSelected,
  filters,
}: ReportProps) {
  const [selectedReview, setSelectedReview] = useState<TicketReview | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.marketCenterIds.length > 0) {
      filters.marketCenterIds.forEach((id) =>
        params.append("marketCenterIds", id)
      );
    }
    if (filters.categoryIds.length > 0) {
      filters.categoryIds.forEach((id) => params.append("categoryIds", id));
    }
    if (filters.dateFrom) {
      params.set("dateFrom", filters.dateFrom.toISOString());
    }
    if (filters.dateTo) {
      params.set("dateTo", filters.dateTo.toISOString());
    }
    return params;
  }, [filters.marketCenterIds, filters.categoryIds, filters.dateFrom, filters.dateTo]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const reviewsQueryKey = useMemo(
    () => ["ticket-reviews-report", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: reportData } = useFetchTicketReviewsReport({
    ticketsReportQueryKey: reviewsQueryKey,
    queryParams: queryParams,
    isSelected,
  });

  const handleViewDetails = (review: TicketReview) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  return (
    <div className={`space-y-4 ${!isSelected ? "hidden" : ""}`}>
      <div className="flex flex-wrap justify-between items-center px-4">
        <div>
          <h2 className="text-xl font-semibold text-[#6D1C24]">
            Ticket Reviews
          </h2>
          <p>Survey feedback from resolved tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2 py-1">
            Total Reviews: {reportData?.totalReviews ?? 0}
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
        <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground mb-1">Avg. Overall Rating</span>
          {reportData?.averageOverallRating !== null ? (
            <div className="flex items-center gap-2">
              <StarRating rating={reportData?.averageOverallRating ?? 0} size={20} />
              <span className="font-semibold">
                {reportData?.averageOverallRating?.toFixed(2) ?? "-"}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">No data</span>
          )}
        </div>
        <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground mb-1">Avg. Assignee Rating</span>
          {reportData?.averageAssigneeRating !== null ? (
            <div className="flex items-center gap-2">
              <StarRating rating={reportData?.averageAssigneeRating ?? 0} size={20} />
              <span className="font-semibold">
                {reportData?.averageAssigneeRating?.toFixed(2) ?? "-"}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">No data</span>
          )}
        </div>
        <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground mb-1">Avg. Market Center Rating</span>
          {reportData?.averageMarketCenterRating !== null ? (
            <div className="flex items-center gap-2">
              <StarRating rating={reportData?.averageMarketCenterRating ?? 0} size={20} />
              <span className="font-semibold">
                {reportData?.averageMarketCenterRating?.toFixed(2) ?? "-"}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">No data</span>
          )}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="px-4">
        {reportData?.reviews && reportData.reviews.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Surveyor</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="text-center">Overall</TableHead>
                <TableHead className="text-center">Assignee</TableHead>
                <TableHead className="text-center">Market Center</TableHead>
                <TableHead className="text-center">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.reviews.map((review) => (
                <TableRow key={review.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="whitespace-nowrap">
                    {formatDate(review.completedAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/tickets/${review.ticketId}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="max-w-[200px] truncate">
                        {review.ticketTitle}
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell>{review.surveyorName}</TableCell>
                  <TableCell>{review.assigneeName ?? "-"}</TableCell>
                  <TableCell>
                    <RatingDisplay rating={review.overallRating} />
                  </TableCell>
                  <TableCell>
                    <RatingDisplay rating={review.assigneeRating} />
                  </TableCell>
                  <TableCell>
                    <RatingDisplay rating={review.marketCenterRating} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(review)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No reviews found
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReview}
        open={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
