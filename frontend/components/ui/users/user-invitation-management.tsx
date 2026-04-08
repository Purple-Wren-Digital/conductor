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
import CreateUser from "@/components/ui/users/create-user-form";
import { TeamSwitcher } from "@/components/ui/team-switcher";
import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { useIsEnterprise } from "@/hooks/useSubscription";
import {
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
  CircleEllipsis,
  BanIcon,
} from "lucide-react";
import { calculateTotalPages } from "@/lib/utils";
import { toast } from "sonner";
import { MarketCenter, UserRole } from "@/lib/types";
import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { useFetchMarketCenterInvitations } from "@/hooks/use-market-center";

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
      return <CircleEllipsis className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" />;
  }
};

export default function UserInvitationManagement() {
  const { currentUser } = useStore();
  const { isEnterprise } = useIsEnterprise();
  const { isSuperuser } = useUserRole();
  const canViewAllMCs = isEnterprise || isSuperuser;

  const defaultMarketCenterId = useMemo(
    () => (canViewAllMCs ? "all" : (currentUser?.marketCenterId ?? "all")),
    [canViewAllMCs, currentUser?.marketCenterId]
  );

  const [showFilters, setShowFilters] = useState(false);
  const [selectedMarketCenterId, setSelectedMarketCenterId] = useState<
    string | "all"
  >(defaultMarketCenterId);
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "All">(
    "All"
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showCancellationAlert, setShowCancellationAlert] = useState(false);
  const [invitationToCancel, setInvitationToCancel] =
    useState<TeamInvitation | null>(null);

  const { permissions } = useUserRole();
  const { getToken } = useAuth();

  const clearFilters = useCallback(() => {
    setStatusFilter("All");
    setSelectedMarketCenterId(defaultMarketCenterId);
    setCurrentPage(1);
  }, [defaultMarketCenterId]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "All") {
      params.append("inviteStatus", statusFilter);
    }
    if (selectedMarketCenterId !== "all") {
      params.append("marketCenterIds", selectedMarketCenterId);
    }

    params.append("limit", String(itemsPerPage));
    params.append("offset", String((currentPage - 1) * itemsPerPage));

    return params;
  }, [statusFilter, selectedMarketCenterId, currentPage, itemsPerPage]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const invitationsQueryKey = useMemo(
    () => ["invitations-management", queryKeyParams] as const,
    [queryKeyParams]
  );

  const {
    data: invitations,
    isLoading: loadingInvitations,
    refetch: fetchInvitations,
  } = useFetchMarketCenterInvitations({
    canManageAllUsers: permissions?.canManageAllUsers ?? false,
    invitationsQueryKey: invitationsQueryKey,
    queryParams,
  });

  const existingEmails = useMemo(() => {
    const emails =
      invitations && invitations.map((inv: TeamInvitation) => inv.email);
    return emails;
  }, [invitations]);

  const hasActiveFilters = useMemo(
    () =>
      (canViewAllMCs && selectedMarketCenterId !== "all") ||
      statusFilter !== "All",
    [canViewAllMCs, selectedMarketCenterId, statusFilter]
  );

  const handleResendInvitation = async (token: string) => {
    setActionLoading(token);
    try {
      const authToken = await getToken();
      if (!authToken) throw new Error("Failed to get authentication token");
      const response = await fetch(`${API_BASE}/invitations/${token}/resend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
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
      const authToken = await getToken();
      if (!authToken) throw new Error("Failed to get authentication token");
      const response = await fetch(
        `${API_BASE}/invitations/${invitationToCancel.token}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
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

  // Paginate
  const invitationsAmount = useMemo(
    () => (invitations ? invitations.length : 0),
    [invitations]
  );
  const totalPages = useMemo(
    () =>
      calculateTotalPages({
        totalItems: invitationsAmount,
        itemsPerPage,
      }),
    [invitationsAmount, itemsPerPage]
  );

  const pendingCount: number = useMemo(() => {
    return invitations
      ? invitations.filter((i: TeamInvitation) => i.status === "PENDING").length
      : 0;
  }, [invitations]);
  const acceptedCount: number = useMemo(() => {
    return invitations
      ? invitations.filter((i: TeamInvitation) => i.status === "ACCEPTED")
          .length
      : 0;
  }, [invitations]);

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Invitations ({invitationsAmount})
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
                    {/* MARKET CENTER */}
                    <div className="space-y-2">
                      <Label>Market Center</Label>
                      <TeamSwitcher
                        selectedMarketCenterId={selectedMarketCenterId}
                        setSelectedMarketCenterId={setSelectedMarketCenterId}
                        handleMarketCenterSelected={() => setCurrentPage(1)}
                      />
                    </div>

                    {/* INVITATION STATUS */}
                    <div className="space-y-2">
                      <Label>Invitation Status</Label>
                      <Select
                        value={statusFilter}
                        onValueChange={(value: InvitationStatus) => {
                          setStatusFilter(value);
                          setCurrentPage(1);
                        }}
                        disabled={loadingInvitations}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status === "All" ? (
                                <p>All Statuses</p>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(status)}
                                  <p>{status}</p>
                                </div>
                              )}
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
            {loadingInvitations && (!invitations || !invitationsAmount) ? (
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
                {invitations && invitations.length > 0 ? (
                  invitations.map((invitation: TeamInvitation) => (
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
                          {(invitation.status === "PENDING" ||
                            invitation.status === "EXPIRED") && (
                            <>
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
                                <BanIcon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {statusFilter === "All"
                      ? `No invitations yet. Click "Invite User" to get started.`
                      : `No ${statusFilter.toLowerCase()} invitations found.`}
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            <PagesAndItemsCount
              type="invitations"
              totalItems={invitationsAmount}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          </CardContent>
        </Card>

        {/* CREATE/INVITE USER DIALOG */}
        <CreateUser
          showCreateUserForm={showCreateUserForm}
          setShowCreateUserForm={setShowCreateUserForm}
          queryInvalidation={async () => {
            await fetchInvitations();
          }}
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
                Please note, once {invitationToCancel?.name ?? "the invitee"}
                &apos;s invitation is cancelled, it cannot be reactivated. The
                following will occur:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-3 mt-2">
                <li>The signup link will become invalid</li>
                <li>
                  &quot;{invitationToCancel?.email}&quot; will not be able to be
                  used again
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
