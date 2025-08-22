"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  MessageSquare,
  Edit,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { format } from "date-fns"
import type { Ticket, Comment, User as UserType, TicketStatus, Urgency } from "@/lib/types"
import { EditTicketForm as TicketForm } from "./ticket-form/edit-ticket-form"
import { getAccessToken, useUser } from "@auth0/nextjs-auth0"

interface TicketDetailViewProps {
  ticketId: string; 
  onClose?: () => void; 
}

const statusOptions: TicketStatus[] = ["ASSIGNED", "AWAITING_RESPONSE", "IN_PROGRESS", "RESOLVED"]
const urgencyOptions: Urgency[] = ["HIGH", "MEDIUM", "LOW"]

const API_BASE =  "http://localhost:4000";

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text || "No body"}`);
  }
  if (ct.includes("application/json")) {
    return res.json();
  }
  const text = await res.text().catch(() => "");
  throw new Error(
    `Expected JSON but got ${ct || "unknown content-type"}. First 200 chars:\n${text.slice(0, 200)}`
  );
}

export function TicketDetailView({ ticketId, onClose }: TicketDetailViewProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)

  const [newComment, setNewComment] = useState("")
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const { user: authUser } = useUser();

  const getAuthToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") {
      return "local";
    }
    return await getAccessToken();
  }, []);

  const refreshAllData = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const accessToken = await getAuthToken();
      const headers: HeadersInit = {
        Authorization: `Bearer ${accessToken}`,
      };

      const [ticketRes, commentsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/tickets/${ticketId}`, { headers, cache: "no-store" }),
        fetch(`${API_BASE}/tickets/${ticketId}/comments`, { headers, cache: "no-store" }),
        fetch(`${API_BASE}/users`, { headers, cache: "no-store" }),
      ]);

      const ticketData = await parseJsonSafe<{ ticket: Ticket }>(ticketRes);
      const commentsData = await parseJsonSafe<{ comments: Comment[] }>(commentsRes);
      const usersData = await parseJsonSafe<{ users: UserType[] }>(usersRes);

      setTicket(ticketData.ticket);
      setComments(commentsData.comments || []);
      setUsers(usersData.users || []);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setTicket(null); 
    } finally {
      setLoading(false);
    }
  }, [ticketId, getAuthToken]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const handleUpdateTicket = async (field: keyof Ticket, value: any) => {
    if (!ticket) return;

    const prev = ticket;
    setTicket({ ...ticket, [field]: value });

    try {
      const accessToken = await getAuthToken();
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({ [field]: value }),
      });
      await parseJsonSafe(res);
      await refreshAllData();
    } catch (error) {
      console.error(error);
      setTicket(prev);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!ticket) return;

    const prev = ticket;
    const nextAssignee =
      newAssigneeId === "unassigned" ? undefined : users.find((u) => u.id === newAssigneeId);
    setTicket({
      ...ticket,
      assignee: nextAssignee
        ? ({ id: nextAssignee.id, name: nextAssignee.name, role: nextAssignee.role } as any)
        : undefined,
    });

    try {
      const accessToken = await getAuthToken();
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({ assigneeId: newAssigneeId === "unassigned" ? null : newAssigneeId }),
      });
      await parseJsonSafe(res);
      await refreshAllData();
    } catch (error) {
      console.error(error);
      setTicket(prev);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !ticket) return;
    setIsSubmittingComment(true);
    try {
      const accessToken = await getAuthToken();
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          content: newComment,
          internal: isInternalComment,
        }),
      });
      const data = await parseJsonSafe<{ comment: Comment }>(res);
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
      setIsInternalComment(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!ticket) return;
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        const accessToken = await getAuthToken();
        const res = await fetch(`${API_BASE}/tickets/${ticket.id}/comments/${commentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        await parseJsonSafe(res);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "RESOLVED":
        return "default"
      case "IN_PROGRESS":
        return "default"
      case "ASSIGNED":
        return "secondary"
      case "AWAITING_RESPONSE":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getUrgencyColor = (urgency: Urgency) => {
    switch (urgency) {
      case "HIGH":
        return "destructive"
      case "MEDIUM":
        return "default"
      case "LOW":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case "RESOLVED":
        return <CheckCircle className="h-4 w-4" />
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading ticket…</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Ticket not found or could not be loaded.</p>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="mt-4 bg-transparent">
            Go Back
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Tickets
          </Button>
        )}
        <div className="flex items-center gap-2">
          {getStatusIcon(ticket.status)}
          <h1 className="text-2xl font-bold">#{ticket.id.substring(0, 8)}...</h1>
        </div>
        <div className="ml-auto">
          <Button variant="outline" onClick={() => setShowEditForm(true)} className="gap-2">
            <Edit className="h-4 w-4" /> Edit Ticket
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-xl">{ticket.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(ticket.status)}>{ticket.status.replace("_", " ")}</Badge>
                    <Badge variant={getUrgencyColor(ticket.urgency)}>{ticket.urgency}</Badge>
                    <Badge variant="outline">{ticket.category}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground leading-relaxed">{ticket.description}</p>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created by:</span>
                    <span className="font-medium">{ticket.creator?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{format(new Date(ticket.createdAt), "PPP")}</span>
                  </div>
                  {ticket.assignee && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned to:</span>
                      <span className="font-medium">{ticket.assignee.name}</span>
                    </div>
                  )}
                  {ticket.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due date:</span>
                      <span className="font-medium">{format(new Date(ticket.dueDate), "PPP")}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {comment.user?.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.user?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), "PPp")}
                          </span>
                          {comment.internal && (
                            <Badge variant="secondary" className="text-xs">
                              Internal
                            </Badge>
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            comment.internal ? "bg-yellow-50 border border-yellow-200" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{comment.content}</p>
                        </div>
                        {comment.user?.id === authUser?.sub && (
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {authUser?.name?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="internal-comment"
                            checked={isInternalComment}
                            onCheckedChange={(checked) => setIsInternalComment(!!checked)}
                          />
                          <Label htmlFor="internal-comment" className="text-sm">
                            Internal note
                          </Label>
                        </div>
                        <Button onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmittingComment} className="gap-2">
                          <Send className="h-4 w-4" /> {isSubmittingComment ? "Posting..." : "Post Comment"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={ticket.status} onValueChange={(value: TicketStatus) => handleUpdateTicket("status", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select value={ticket.urgency} onValueChange={(value: Urgency) => handleUpdateTicket("urgency", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {urgencyOptions.map((urgency) => (
                      <SelectItem key={urgency} value={urgency}>
                        {urgency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={ticket.assignee?.id || "unassigned"} onValueChange={handleAssigneeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TicketForm
        ticket={ticket ?? undefined}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={(updated) => {
          if (updated) setTicket(updated);
          setShowEditForm(false);
          void refreshAllData();
        }}
      />
    </div>
  )
}
