"use client";

import { useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { useSlaPolicies, useUpdateSlaPolicy } from "@/hooks/use-sla";
import { formatSlaDuration, getUrgencyColor } from "@/lib/api/sla";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/base-tabs";
import { AlertCircle, Clock, CheckCircle2, Settings, BarChart3, Loader2, Timer } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

type EditType = "response" | "resolution";

export default function SlaSettingsPage() {
  const { role, isLoading: roleLoading } = useUserRole();
  const { data: policiesData, isLoading: policiesLoading, error } = useSlaPolicies();
  const updatePolicy = useUpdateSlaPolicy();

  const [editingPolicy, setEditingPolicy] = useState<{ id: string; type: EditType } | null>(null);
  const [editValues, setEditValues] = useState<{ hours: number; minutes: number }>({
    hours: 0,
    minutes: 0,
  });

  const isAdmin = role === "ADMIN";
  const isStaffLeader = role === "STAFF_LEADER";
  const canView = isAdmin || isStaffLeader;
  const canEdit = isAdmin;

  if (roleLoading || policiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to view SLA settings. This page is only accessible to Admins and Staff Leaders.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load SLA policies. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const policies = policiesData?.policies || [];

  const startEditing = (policyId: string, type: EditType, currentMinutes: number) => {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    setEditingPolicy({ id: policyId, type });
    setEditValues({ hours, minutes });
  };

  const cancelEditing = () => {
    setEditingPolicy(null);
    setEditValues({ hours: 0, minutes: 0 });
  };

  const savePolicy = async (policyId: string, type: EditType) => {
    const totalMinutes = editValues.hours * 60 + editValues.minutes;
    if (totalMinutes <= 0) {
      return;
    }

    const data = type === "response"
      ? { responseTimeMinutes: totalMinutes }
      : { resolutionTimeMinutes: totalMinutes };

    await updatePolicy.mutateAsync({
      policyId,
      data,
    });
    setEditingPolicy(null);
  };

  const togglePolicyActive = async (policyId: string, currentActive: boolean) => {
    await updatePolicy.mutateAsync({
      policyId,
      data: { isActive: !currentActive },
    });
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "HIGH":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "MEDIUM":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "LOW":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const isEditing = (policyId: string, type: EditType) =>
    editingPolicy?.id === policyId && editingPolicy?.type === type;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SLA Management</h1>
          <p className="text-muted-foreground">
            Configure Service Level Agreement targets for response and resolution times
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/sla/reports">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies">
            <Settings className="h-4 w-4 mr-2" />
            Policy Settings
          </TabsTrigger>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          {/* Response SLA Policies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Response Time Policies
              </CardTitle>
              <CardDescription>
                Define the maximum time for initial staff response (assignment or first comment).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div
                    key={`response-${policy.id}`}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {getUrgencyIcon(policy.urgency)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{policy.urgency} Urgency</span>
                          <Badge
                            variant={policy.isActive ? "default" : "secondary"}
                            className={policy.isActive ? "bg-green-100 text-green-800" : ""}
                          >
                            {policy.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {isEditing(policy.id, "response") ? (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="999"
                                value={editValues.hours}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    hours: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className="w-20"
                              />
                              <Label className="text-sm text-muted-foreground">hours</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={editValues.minutes}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    minutes: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className="w-20"
                              />
                              <Label className="text-sm text-muted-foreground">minutes</Label>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Response within {formatSlaDuration(policy.responseTimeMinutes)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <>
                          {isEditing(policy.id, "response") ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => savePolicy(policy.id, "response")}
                                disabled={updatePolicy.isPending}
                              >
                                {updatePolicy.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  startEditing(policy.id, "response", policy.responseTimeMinutes)
                                }
                              >
                                Edit
                              </Button>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={policy.isActive}
                                  onCheckedChange={() =>
                                    togglePolicyActive(policy.id, policy.isActive)
                                  }
                                  disabled={updatePolicy.isPending}
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resolution SLA Policies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Resolution Time Policies
              </CardTitle>
              <CardDescription>
                Define the maximum time from ticket creation to resolution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div
                    key={`resolution-${policy.id}`}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {getUrgencyIcon(policy.urgency)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{policy.urgency} Urgency</span>
                          <Badge
                            variant={policy.isActive ? "default" : "secondary"}
                            className={policy.isActive ? "bg-green-100 text-green-800" : ""}
                          >
                            {policy.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {isEditing(policy.id, "resolution") ? (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="999"
                                value={editValues.hours}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    hours: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className="w-20"
                              />
                              <Label className="text-sm text-muted-foreground">hours</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={editValues.minutes}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    minutes: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className="w-20"
                              />
                              <Label className="text-sm text-muted-foreground">minutes</Label>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Resolve within {formatSlaDuration(policy.resolutionTimeMinutes)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <>
                          {isEditing(policy.id, "resolution") ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => savePolicy(policy.id, "resolution")}
                                disabled={updatePolicy.isPending}
                              >
                                {updatePolicy.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                startEditing(policy.id, "resolution", policy.resolutionTimeMinutes)
                              }
                            >
                              Edit
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How SLA Tracking Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Response SLA:</strong> The clock starts when a ticket is created and stops when a staff member first responds (either by being assigned or leaving a comment).
              </p>
              <p>
                <strong>Resolution SLA:</strong> The clock starts when a ticket is created and stops when the ticket status is changed to Resolved.
              </p>
              <p>
                <strong>Warnings:</strong> Notifications are sent at 50% and 75% of each SLA time to remind assignees about approaching deadlines.
              </p>
              <p>
                <strong>Breaches:</strong> If the SLA deadline passes without the required action, the ticket is marked as breached and admins are notified.
              </p>
              <p>
                <strong>Compliance:</strong> SLA compliance is calculated separately for response and resolution as the percentage of tickets that met their respective targets.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <SlaOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SlaOverview() {
  const { data: policiesData } = useSlaPolicies();
  const policies = policiesData?.policies || [];

  return (
    <div className="space-y-6">
      {/* Response SLA Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Response SLA Targets
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {policies.map((policy) => (
            <Card key={`overview-response-${policy.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className={getUrgencyColor(policy.urgency)}>
                    {policy.urgency}
                  </Badge>
                  Urgency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatSlaDuration(policy.responseTimeMinutes)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Target response time
                </p>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={policy.isActive ? "default" : "secondary"}>
                      {policy.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Resolution SLA Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Resolution SLA Targets
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {policies.map((policy) => (
            <Card key={`overview-resolution-${policy.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className={getUrgencyColor(policy.urgency)}>
                    {policy.urgency}
                  </Badge>
                  Urgency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatSlaDuration(policy.resolutionTimeMinutes)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Target resolution time
                </p>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={policy.isActive ? "default" : "secondary"}>
                      {policy.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
