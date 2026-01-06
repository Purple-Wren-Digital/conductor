"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateUser from "./create-user-form";
import { useUserRole } from "@/hooks/use-user-role";
import {
  ChevronRight,
  ChevronLeft,
  Filter,
  Users,
  UserPlus,
  X,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  Trash2,
} from "lucide-react";
import { formatPaginationText } from "@/lib/utils";
import { toast } from "sonner";
import { useFetchWithAuth } from "@/lib/api/fetch-with-auth";
import { MarketCenter, UserRole } from "@/lib/types";

type InvitationStatus =
  | "All"
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "CANCELLED";

interface TeamInvitation {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  marketCenterId?: string;
  invitedBy?: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  marketCenter?: MarketCenter;
}

const statusOptions: InvitationStatus[] = [
  "All",
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "CANCELLED",
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />;
    case "ACCEPTED":
      return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />;
    case "EXPIRED":
      return <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />;
    case "CANCELLED":
      return <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />;
    default:
      return <Mail className="h-3 w-3 sm:h-4 sm:w-4" />;
  }
};

export default function UserInvitationManagement() {
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvitationStatus>("All");
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancellationAlert, setShowCancellationAlert] = useState(false);
  const [invitationToCancel, setInvitationToCancel] =
    useState<TeamInvitation | null>(null);

  const { permissions } = useUserRole();
  const fetchWithAuth = useFetchWithAuth();

  const clearFilters = () => {
    setStatusFilter("All");
  };

  const hasActiveFilters = statusFilter !== "All";

  const fetchInvitations = useCallback(async () => {
    if (!permissions?.canManageAllUsers) return;
    setLoadingInvitations(true);

    try {
      const response = await fetchWithAuth("/invitations");

      if (!response.ok) {
        throw new Error("Failed to fetch invitations");
      }

      const data = await response.json();
      setInvitations(data?.invitations ?? []);
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setLoadingInvitations(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions?.canManageAllUsers]);

  useEffect(() => {
    fetchInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions?.canManageAllUsers]);

  const existingEmails = useMemo(
    () => invitations.map((inv) => inv.email),
    [invitations]
  );

  const handleResendInvitation = async (token: string) => {
    setActionLoading(token);
    try {
      const response = await fetchWithAuth(`/invitations/${token}/resend`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resend invitation");
      }

      toast.success("Invitation resent successfully!");
      await fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvitation = async () => {
    if (!invitationToCancel || !invitationToCancel?.token) return;
    setActionLoading(invitationToCancel.token);
    try {
      const response = await fetchWithAuth(
        `/invitations/${invitationToCancel.token}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel invitation");
      }

      toast.success("Invitation cancelled");
      await fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopySignupUrl = async (token: string) => {
    const signupUrl = `${window.location.origin}/sign-up?token=${token}`;
    await navigator.clipboard.writeText(signupUrl);
    toast.success("Signup URL copied to clipboard!");
  };

  // Filter invitations by status
  const filteredInvitations = invitations.filter((inv) => {
    if (statusFilter === "All") return true;
    return inv.status === statusFilter;
  });

  // Paginate
  const totalPages = Math.ceil(filteredInvitations.length / itemsPerPage);
  const paginatedInvitations = filteredInvitations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pendingCount = invitations.filter((i) => i.status === "PENDING").length;
  const acceptedCount = invitations.filter(
    (i) => i.status === "ACCEPTED"
  ).length;

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Invitations ({invitations.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {pendingCount} pending, {acceptedCount} accepted
                </p>
              </div>
              <Button
                onClick={() => setShowCreateUserForm(true)}
                disabled={!permissions?.canCreateUsers || loadingInvitations}
                className="gap-2 w-full sm:w-fit"
                size={"sm"}
              >
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </div>

            {/* FILTER BUTTON */}
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-center sm:justify-end gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent w-full sm:w-fit"
                  onClick={() => setShowFilters(!showFilters)}
                  type="button"
                  disabled={loadingInvitations}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-2 w-2 rounded-full p-0"
                    />
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2 w-full sm:w-fit"
                    type="button"
                    disabled={loadingInvitations}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              {showFilters && (
                <Card className="p-4 bg-muted/50">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={statusFilter}
                        onValueChange={(value: InvitationStatus) => {
                          setStatusFilter(value);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                {status !== "All" && getStatusIcon(status)}
                                {status === "All" ? "All Invitations" : status}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {loadingInvitations && invitations.length === 0 ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`space-y-3 transition-opacity duration-300 ${
                  loadingInvitations
                    ? "opacity-50 pointer-events-none"
                    : "opacity-100"
                }`}
              >
                {paginatedInvitations.length > 0 ? (
                  paginatedInvitations.map((invitation: TeamInvitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between flex-wrap p-4 border rounded-lg  hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:visible sm:h-10 sm:w-10 sm:rounded-full sm:bg-muted sm:flex sm:items-center sm:justify-center">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1 mb-2 sm:mb-0 sm:space-y-0">
                          {invitation?.name && (
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {invitation.name}
                            </span>
                          )}
                          <p className="font-medium text-xs sm:text-base">
                            {invitation.email}
                          </p>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <span className="capitalize">
                              {invitation.role
                                .split("_")
                                .join(" ")
                                .toLowerCase()}
                            </span>
                            <span>•</span>
                            <span>
                              Sent{" "}
                              {new Date(
                                invitation.createdAt
                              ).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>
                              {invitation.status === "ACCEPTED" &&
                                `Accepted
                                  ${
                                    invitation.acceptedAt
                                      ? new Date(
                                          invitation.acceptedAt
                                        ).toLocaleDateString()
                                      : ""
                                  }`}
                              {invitation.status === "PENDING" &&
                                `Expires
                                  ${new Date(
                                    invitation.expiresAt
                                  ).toLocaleDateString()}`}

                              {invitation.status === "EXPIRED" &&
                                `Expired
                                  ${new Date(
                                    invitation.expiresAt
                                  ).toLocaleDateString()}`}

                              {invitation.status === "CANCELLED" &&
                                `Cancelled
                                  ${new Date(
                                    invitation.updatedAt
                                  ).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant={"secondary"}
                          className="gap-2 text-[9px] sm:text-xs"
                        >
                          {getStatusIcon(invitation.status)}
                          {invitation.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {invitation.status === "PENDING" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleCopySignupUrl(invitation.token)
                              }
                              title="Copy signup URL"
                              disabled={actionLoading === invitation.token}
                              className="disabled:text-muted-foreground"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {invitation.status === "PENDING" ||
                            (invitation.status === "EXPIRED" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleResendInvitation(invitation.token)
                                }
                                disabled={actionLoading === invitation.token}
                                title="Resend invitation"
                                className="disabled:text-muted-foreground"
                              >
                                <RefreshCw
                                  className={`h-4 w-4 ${
                                    actionLoading === invitation.token
                                      ? "animate-spin"
                                      : ""
                                  }`}
                                />
                              </Button>
                            ))}
                          {invitation.status !== "CANCELLED" &&
                            invitation.status !== "ACCEPTED" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setShowCancellationAlert(true);
                                  setInvitationToCancel(invitation);
                                }}
                                disabled={actionLoading === invitation.token}
                                title="Cancel invitation"
                                className={
                                  "text-red-800 hover:text-red-950 disabled:text-muted-foreground"
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {statusFilter === "All"
                      ? "No invitations yet. Click 'Invite User' to get started."
                      : `No ${statusFilter.toLowerCase()} invitations found.`}
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {filteredInvitations.length > itemsPerPage && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {formatPaginationText({
                    totalItems: filteredInvitations.length,
                    itemsPerPage,
                    currentPage,
                  })}{" "}
                  of {filteredInvitations.length} invitations
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                    type="button"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CREATE/INVITE USER DIALOG */}
        <CreateUser
          showCreateUserForm={showCreateUserForm}
          setShowCreateUserForm={setShowCreateUserForm}
          queryInvalidation={fetchInvitations}
          existingEmails={existingEmails}
        />
      </div>

      {/* Cancel Invitation Confirmation Dialog */}
      <AlertDialog
        open={showCancellationAlert}
        onOpenChange={setShowCancellationAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="font-medium space-y-1">
                Please note, once {invitationToCancel?.name ?? "the invitee"}'s
                invitation is cancelled, it cannot be reactivated. The following
                will occur:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-3 mt-2">
                <li>The signup link will become invalid</li>
                <li>
                  "{invitationToCancel?.email}" will not be able to be used
                  again
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvitation}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
