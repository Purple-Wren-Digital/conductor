"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketCenterListItem } from "@/components/ui/list-item/market-center-list-item";
import { API_BASE } from "@/lib/api/utils";
import type { MarketCenter, MarketCenterForm, PrismaUser } from "@/lib/types";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { Building, Plus } from "lucide-react";
import CreateMarketCenter from "@/components/ui/marketCenters/market-center-create-form";
import DeleteMarketCenter from "@/components/ui/marketCenters/market-center-delete-form";
import EditMarketCenter from "@/components/ui/marketCenters/market-center-edit-form";
import { useRouter } from "next/navigation";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useQueryClient } from "@tanstack/react-query";

export default function MarketCenterManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // const [activeMarketCenters, setActiveMarketCenters] = useState<
  //   MarketCenter[]
  // >([]);
  // const [loading, setLoading] = useState(true);

  // TODO: Search Queries
  // const [searchQuery, setSearchQuery] = useState("");
  // const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // ACTIONS
  const [showCreateMCForm, setShowCreateMCForm] = useState(false);

  const [showEditMCForm, setShowEditMCForm] = useState(false);
  const [editingMarketCenter, setEditingMarketCenter] =
    useState<MarketCenter | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<PrismaUser[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<PrismaUser[]>([]);
  const [formData, setFormData] = useState<MarketCenterForm>({
    name: "",
    selectedUsers: [],
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [marketCenterToDelete, setMarketCenterToDelete] =
    useState<MarketCenter | null>(null);

  const { role } = useUserRole();

  // useEffect(() => {
  //   const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
  //   return () => clearTimeout(handler);
  // }, [searchQuery]);

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const { data: marketCentersData, isLoading: marketCentersLoading } =
    useFetchAllMarketCenters(role);

  const marketCenters: MarketCenter[] = marketCentersData?.marketCenters ?? [];
  const totalMarketCenters: number = marketCenters?.length ?? 0;

  const invalidateMarketCenters = queryClient.invalidateQueries({
    queryKey: ["all-market-centers"],
  });

  const fetchActiveUsers = useCallback(async () => {
    // setLoading(true);
    try {
      const accessToken = await getAuth0AccessToken();
      if (!accessToken) {
        throw new Error("No token fetched");
      }
      // TODO: Fetch unassigned users only...
      // const params = new URLSearchParams();
      const response = await fetch(`${API_BASE}/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch users");
      const data: { users: PrismaUser[] } = await response.json();

      const needsAssignment: PrismaUser[] = data.users.filter((user) => {
        if (!user?.marketCenterId) return user;
      });
      console.log("NEEDS ASSIGNMENT", needsAssignment);
      setUnassignedUsers(needsAssignment || []);
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      // setLoading(false);
    }
  }, [getAuth0AccessToken]);

  useEffect(() => {
    fetchActiveUsers();
  }, [fetchActiveUsers]);

  const openCreateModal = () => {
    setEditingMarketCenter(null);
    setMarketCenterToDelete(null);
    setFormData({
      name: "",
      selectedUsers: [],
    });
    setAssignedUsers([]);
    setShowCreateMCForm(true);
  };

  const openEditModal = (marketCenter: MarketCenter) => {
    setEditingMarketCenter(marketCenter);
    setMarketCenterToDelete(null);
    setFormData({
      name: marketCenter.name,
      selectedUsers:
        marketCenter?.users && marketCenter?.users.length
          ? marketCenter.users
          : [],
    });
    setAssignedUsers(
      marketCenter?.users && marketCenter?.users.length
        ? marketCenter.users
        : []
    );
    setShowEditMCForm(true);
  };

  const openDeleteModal = (marketCenter: MarketCenter) => {
    setEditingMarketCenter(null);
    setMarketCenterToDelete(marketCenter);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Market Center Management ({totalMarketCenters})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage all market centers
              </p>
            </div>
            <Button onClick={() => openCreateModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Market Center
            </Button>
          </div>

          <div className="flex items-center gap-4 mt-4">
            {/* TODO: SEARCH BAR - By Name, By Id, By User */}
          </div>
        </CardHeader>

        <CardContent>
          <div
            className={`space-y-4 transition-opacity duration-300 ${marketCentersLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          >
            {marketCentersLoading &&
              (!marketCenters || !marketCenters.length) && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              )}
            {!marketCentersLoading &&
              marketCenters &&
              marketCenters.length > 0 &&
              marketCenters.map((mc) => (
                <MarketCenterListItem
                  key={mc.id}
                  marketCenter={mc}
                  onEdit={() => openEditModal(mc)}
                  onClose={() => openDeleteModal(mc)}
                  onClick={() => {
                    router.push(`/dashboard/marketCenters/${mc.id}`);
                  }}
                  selectable={false}
                />
              ))}

            {!marketCentersLoading &&
              (!marketCenters || !marketCenters.length) && (
                <div className="text-center py-8 text-muted-foreground">
                  No market centers found matching criteria
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* CREATE MARKET CENTER */}
      <CreateMarketCenter
        showCreateMCForm={showCreateMCForm}
        setShowCreateMCForm={setShowCreateMCForm}
        formData={formData}
        setFormData={setFormData}
        refreshMarketCenters={invalidateMarketCenters}
        refreshUsers={fetchActiveUsers}
        unassignedUsers={unassignedUsers}
      />

      {/* EDIT MARKET CENTER */}
      <EditMarketCenter
        editingMarketCenter={editingMarketCenter}
        setEditingMarketCenter={setEditingMarketCenter}
        showEditMCForm={showEditMCForm}
        setShowEditMCForm={setShowEditMCForm}
        formData={formData}
        setFormData={setFormData}
        assignedUsers={assignedUsers}
        unassignedUsers={unassignedUsers}
        refreshMarketCenters={invalidateMarketCenters}
        refreshUsers={fetchActiveUsers}
      />

      {/* DELETE MARKET CENTER */}
      <DeleteMarketCenter
        marketCenterToDelete={marketCenterToDelete}
        setMarketCenterToDelete={setMarketCenterToDelete}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        refreshMarketCenters={invalidateMarketCenters}
        refreshUsers={fetchActiveUsers}
      />
    </div>
  );
}
