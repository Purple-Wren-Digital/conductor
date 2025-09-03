"use client";

import { CommentList } from "@/components/ui/comments";
import { useCommentCount } from "@/hooks/use-comments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface TicketCommentsSectionProps {
  ticketId: string;
}

export function TicketCommentsSection({
  ticketId,
}: TicketCommentsSectionProps) {
  const commentCount = useCommentCount(ticketId); // Fallback to 2 for demo

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({commentCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CommentList ticketId={ticketId} />
      </CardContent>
    </Card>
  );
}
