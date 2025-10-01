"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Settings,
} from "lucide-react";
import { useSettingsAuditLog, useListTeamMembers } from "@/hooks/use-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog/base-dialog";

const ACTION_COLORS = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  INVITE: "default",
  REMOVE: "destructive",
  ROLE_CHANGE: "secondary",
} as const;

const SECTION_COLORS = {
  general: "default",
  business_hours: "secondary",
  branding: "secondary",
  team: "destructive",
  categories: "secondary",
  holidays: "secondary",
} as const;

export default function AuditLog() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("");

  const { data: auditData, isLoading } = useSettingsAuditLog(
    currentPage,
    pageSize
  );
  const { data: teamData } = useListTeamMembers();

  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const filteredEntries =
    auditData?.entries?.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getUserName(entry.userId)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesAction = !actionFilter || entry.action === actionFilter;
      const matchesSection = !sectionFilter || entry.section === sectionFilter;

      return matchesSearch && matchesAction && matchesSection;
    }) || [];

  const totalPages = auditData ? Math.ceil(auditData.total / pageSize) : 1;

  const getUserName = (userId: string) => {
    const user = teamData?.members.find((m) => m.id === userId);
    return user ? user.name : "Unknown User";
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return "✨";
      case "UPDATE":
        return "📝";
      case "DELETE":
        return "🗑️";
      case "INVITE":
        return "📧";
      case "REMOVE":
        return "👋";
      case "ROLE_CHANGE":
        return "🔄";
      default:
        return "📋";
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section.toLowerCase()) {
      case "general":
        return <Settings className="h-4 w-4" />;
      case "business_hours":
        return <Calendar className="h-4 w-4" />;
      case "branding":
        return "🎨";
      case "team":
        return <User className="h-4 w-4" />;
      case "categories":
        return "🏷️";
      case "holidays":
        return "📅";
      default:
        return <History className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading audit log...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audit Log Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>
            Track all changes made to your market center settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search audit log..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="INVITE">Invite</SelectItem>
                  <SelectItem value="REMOVE">Remove</SelectItem>
                  <SelectItem value="ROLE_CHANGE">Role Change</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sections</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="business_hours">Business Hours</SelectItem>
                  <SelectItem value="branding">Branding</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="categories">Categories</SelectItem>
                  <SelectItem value="holidays">Holidays</SelectItem>
                </SelectContent>
              </Select> */}
            </div>
            <div className="text-sm text-muted-foreground">
              {auditData?.total || 0} total entries
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getActionIcon(entry.action)}
                          </span>
                          <Badge
                            variant={
                              ACTION_COLORS[
                                entry.action as keyof typeof ACTION_COLORS
                              ] || "default"
                            }
                          >
                            {entry.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSectionIcon(entry.section)}
                          <Badge
                            variant={
                              SECTION_COLORS[
                                entry.section as keyof typeof SECTION_COLORS
                              ] || "outline"
                            }
                          >
                            {entry.section.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {getUserName(entry.userId)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <span className="text-lg">
                                  {getActionIcon(entry.action)}
                                </span>
                                Audit Log Details
                              </DialogTitle>
                              <DialogDescription>
                                Change details for {entry.action.toLowerCase()}{" "}
                                on {entry.section}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <Label className="font-medium">Action:</Label>
                                  <p className="mt-1">
                                    <Badge
                                      variant={
                                        ACTION_COLORS[
                                          entry.action as keyof typeof ACTION_COLORS
                                        ] || "default"
                                      }
                                    >
                                      {entry.action}
                                    </Badge>
                                  </p>
                                </div>
                                <div>
                                  <Label className="font-medium">
                                    Section:
                                  </Label>
                                  <p className="mt-1">
                                    <Badge
                                      variant={
                                        SECTION_COLORS[
                                          entry.section as keyof typeof SECTION_COLORS
                                        ] || "outline"
                                      }
                                    >
                                      {entry.section
                                        .replace("_", " ")
                                        .toUpperCase()}
                                    </Badge>
                                  </p>
                                </div>
                                <div>
                                  <Label className="font-medium">User:</Label>
                                  <p className="mt-1">
                                    {getUserName(entry.userId)}
                                  </p>
                                </div>
                                <div>
                                  <Label className="font-medium">Date:</Label>
                                  <p className="mt-1">
                                    {new Date(entry.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-medium text-destructive">
                                    Previous Value:
                                  </Label>
                                  <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
                                    {formatValue(entry.previousValue)}
                                  </pre>
                                </div>
                                <div>
                                  <Label className="font-medium text-green-600">
                                    New Value:
                                  </Label>
                                  <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
                                    {formatValue(entry.newValue)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, auditData?.total || 0)} of{" "}
                  {auditData?.total || 0} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No audit log entries found. Changes will appear here once you
              start modifying settings.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Audit Logs</CardTitle>
          <CardDescription>
            Understanding how changes are tracked in your system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">What is tracked?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • All changes to market center settings (general, business
                hours, branding)
              </li>
              <li>• Team member invitations, role changes, and removals</li>
              <li>• Ticket category creation, updates, and deletions</li>
              <li>• Holiday calendar modifications</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Data Retention</h4>
            <p className="text-sm text-muted-foreground">
              Audit logs are retained indefinitely to ensure complete
              traceability of all system changes. This helps maintain compliance
              and provides accountability for all administrative actions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
