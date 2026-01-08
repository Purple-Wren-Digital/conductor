"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Building, CalendarIcon, FileText, Info, Save, X } from "lucide-react";
import { format } from "date-fns";
import type {
  FormErrors,
  MarketCenter,
  PrismaUser,
  TicketCategory,
  TicketTemplate,
  Urgency,
} from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import {
  capitalizeEveryWord,
  findMarketCenter,
  urgencyOptions,
} from "@/lib/utils";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useUserRole } from "@/hooks/use-user-role";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/context/store-provider";
import { BasicEditorWithToolbar } from "@/components/ui/tiptap/basic-editor-and-toolbar";
import Link from "next/link";

export type TicketFormValues = {
  title: string;
  description: string;
  urgency: Urgency;
  categoryId: string;
  dueDate?: Date;
  assigneeId?: string;
  marketCenterId?: string;
  todos: string[];
};

export type BaseTicketFormProps = {
  // Dialog controls
  isOpen: boolean;
  onClose: () => void;

  // Form state
  values: TicketFormValues;
  errors: FormErrors;
  loading?: boolean;

  // Handlers
  onChange: (patch: Partial<TicketFormValues>) => void;
  onSubmit: (e: React.FormEvent) => void;

  // Visuals
  titleText: string; // "Create New Ticket" or "Edit Ticket"

  // Create-only (template picker)
  showTemplateSelect?: boolean;
  templates?: TicketTemplate[];
  selectedTemplateId?: string;
  onChangeTemplateId?: (id: string) => void;
  marketCenterId: string | null;
  disabled: boolean;
};

export function BaseTicketForm({
  isOpen,
  onClose,
  values,
  errors,
  loading,
  onChange,
  onSubmit,
  titleText,
  showTemplateSelect = false,
  templates = [],
  selectedTemplateId,
  onChangeTemplateId,
  marketCenterId,
  disabled,
}: BaseTicketFormProps) {
  const [selectedMarketCenter, setSelectedMarketCenter] =
    useState<MarketCenter>({} as MarketCenter);

  const { currentUser } = useStore();
  const { role, permissions } = useUserRole();
  const { data: marketCentersData, isLoading: isMarketCentersLoading } =
    useFetchAllMarketCenters(role);

  const marketCenters = useMemo(() => {
    return marketCentersData?.marketCenters ?? [];
  }, [marketCentersData]);

  const marketCenterTicketCategories: TicketCategory[] = useMemo(() => {
    return selectedMarketCenter && selectedMarketCenter?.ticketCategories
      ? selectedMarketCenter?.ticketCategories
      : [];
  }, [selectedMarketCenter]);

  const marketCenterAssignees: PrismaUser[] = useMemo(() => {
    return !isMarketCentersLoading &&
      selectedMarketCenter &&
      selectedMarketCenter?.users
      ? selectedMarketCenter?.users
      : [];
  }, [selectedMarketCenter, isMarketCentersLoading]);

  const prefillMarketCenterData = useCallback(() => {
    const marketCenter = findMarketCenter(marketCenters, marketCenterId);
    setSelectedMarketCenter(marketCenter);
  }, [marketCenterId, marketCenters]);

  useEffect(() => {
    if (!marketCenterId) return;
    prefillMarketCenterData();
  }, [marketCenterId, prefillMarketCenterData, values]);

  const normalizedAssigneeId = useMemo(() => {
    return values?.assigneeId && values.assigneeId !== ""
      ? values.assigneeId
      : "Unassigned";
  }, [values?.assigneeId]);

  const templateSection = useMemo(() => {
    if (!showTemplateSelect) return null;
    return (
      <div className="space-y-2">
        <Label>Template (Optional)</Label>
        <Select
          value={selectedTemplateId}
          onValueChange={onChangeTemplateId!}
          disabled={disabled}
        >
          <SelectTrigger disabled={disabled}>
            <SelectValue placeholder="Choose a template to get started" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No template</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-1 text-xs text-muted-foreground">
          Create ticket templates in{" "}
          <Link
            href="/dashboard/settings/ticket-templates"
            rel="noopener noreferrer"
            target="_blank"
            className="underline underline-offset-2"
          >
            Settings &gt; Ticket Templates
          </Link>
        </p>
      </div>
    );
  }, [
    showTemplateSelect,
    selectedTemplateId,
    onChangeTemplateId,
    templates,
    disabled,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {titleText}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* MARKET CENTER */}
          <div className={"space-y-2 col-span-2"}>
            <div className="flex flex-row align-center justify-between">
              <Label>Market Center *</Label>
              <ToolTip
                trigger={<Info className="w-3 h-3" />}
                content="Select a Market Center to access all templates, team members, and categories"
              />
            </div>
            <Select
              value={selectedMarketCenter?.id}
              onValueChange={(value) =>
                setSelectedMarketCenter(findMarketCenter(marketCenters, value))
              }
              disabled={role !== "ADMIN" || disabled}
            >
              <SelectTrigger
                className={errors.marketCenter ? "border-destructive" : ""}
                disabled={role !== "ADMIN" || disabled}
              >
                <SelectValue placeholder={"Select Market Center"} />
              </SelectTrigger>
              <SelectContent>
                {marketCenters &&
                  marketCenters.length > 0 &&
                  marketCenters.map((marketCenter: MarketCenter) => (
                    <SelectItem key={marketCenter?.id} value={marketCenter?.id}>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 " />
                        {marketCenter?.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.marketCenter && (
              <p className="text-sm text-destructive">{errors.marketCenter}</p>
            )}
          </div>
          {templateSection}
          {/* TITLE */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Brief description of the issue or request"
              className={errors.title ? "border-destructive" : ""}
              disabled={disabled}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>
          {/* DESCRIPTION */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <BasicEditorWithToolbar
              value={values.description}
              disabled={disabled}
              onChange={(content) => onChange({ description: content })}
              placeholder="Detailed description of the issue, including steps to reproduce, expected behavior, etc."
            />

            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>
          {/*  URGENCY + DUE DATE */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* URGENCY */}
            <div className="space-y-2">
              <Label>Urgency *</Label>
              <Select
                value={values.urgency}
                onValueChange={(value: Urgency) => onChange({ urgency: value })}
                disabled={!selectedMarketCenter || disabled}
              >
                <SelectTrigger
                  className={errors.urgency ? "border-destructive" : ""}
                  disabled={disabled}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyOptions.map((urgency) => (
                    <SelectItem key={urgency} value={urgency}>
                      <Badge variant={urgency.toLowerCase() as any}>
                        {urgency}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* DUE DATE */}
            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-transparent"
                    disabled={disabled}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {values.dueDate
                      ? format(values.dueDate, "PPP")
                      : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={values.dueDate}
                    onSelect={(date) =>
                      onChange({ dueDate: date || undefined })
                    }
                    disabled={(date) => date < new Date() || disabled}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* CATEGORY + ASSIGNEE */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* CATEGORY */}
            <div className="space-y-2">
              <div className="flex flex-row align-center justify-between">
                <Label>Category *</Label>
                <ToolTip
                  trigger={<Info className="w-3 h-3" />}
                  content="Add categories in the Market Center settings. Categories help organize and prioritize tickets."
                />
              </div>
              <Select
                value={values.categoryId}
                onValueChange={(value) => {
                  const selectedCategory = marketCenterTicketCategories?.find(
                    (c) => c?.id === value
                  );
                  const assignee = marketCenterAssignees?.find(
                    (user) => user?.id == selectedCategory?.defaultAssigneeId
                  );
                  onChange({
                    categoryId: value,
                    assigneeId:
                      assignee && assignee?.id ? assignee.id : "Unassigned",
                  });
                }}
                disabled={disabled}
              >
                <SelectTrigger
                  className={errors.category ? "border-destructive" : ""}
                  disabled={disabled}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {marketCenterTicketCategories &&
                    marketCenterTicketCategories.length > 0 &&
                    marketCenterTicketCategories.map((category) => (
                      <SelectItem key={category?.id} value={category?.id}>
                        {category?.name}
                      </SelectItem>
                    ))}
                  {!marketCenterTicketCategories ||
                    (marketCenterTicketCategories.length === 0 && (
                      <>
                        <SelectItem value="none" disabled>
                          No categories available
                        </SelectItem>
                        <SelectItem value="none2" disabled>
                          Add categories in the Market Center settings
                        </SelectItem>
                      </>
                    ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>
            {/* ASSIGNEE */}
            <div className={`space-y-2`}>
              <div className="flex flex-row align-center justify-between">
                <Label>Assign To</Label>
                <ToolTip
                  trigger={<Info className="w-3 h-3" />}
                  content="Only management assigns tickets"
                />
              </div>
              <Select
                value={normalizedAssigneeId}
                onValueChange={(value) => onChange({ assigneeId: value })}
                disabled={disabled || role === "AGENT"}
              >
                <SelectTrigger
                  className={errors.assigneeId ? "border-destructive" : ""}
                >
                  <SelectValue placeholder={"Select an assignee"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value={"Unassigned"}
                    disabled={!permissions?.canUnassignTicket}
                  >
                    Unassigned
                  </SelectItem>
                  {!isMarketCentersLoading &&
                    marketCenterAssignees?.map((user) => {
                      const assignmentPermissions =
                        permissions?.canReassignTicket &&
                        (role === "ADMIN" ||
                          (role === "STAFF_LEADER" &&
                            currentUser?.marketCenterId &&
                            user?.marketCenterId ===
                              currentUser?.marketCenterId) ||
                          (role === "STAFF" && user?.id === currentUser?.id));

                      return (
                        <SelectItem
                          key={user.id}
                          value={user.id}
                          disabled={!assignmentPermissions}
                        >
                          {user.name}:{" "}
                          {user?.role
                            ? capitalizeEveryWord(
                                user.role.split("_").join(" ")
                              )
                            : "Unassigned"}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              {errors.assigneeId && (
                <p className="text-sm text-destructive">{errors.assigneeId}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {errors?.general && (
              <p className="text-sm text-destructive">{errors.general}</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={!!loading || isMarketCentersLoading}
            >
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button
              type="submit"
              disabled={!!loading || disabled || isMarketCentersLoading}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
