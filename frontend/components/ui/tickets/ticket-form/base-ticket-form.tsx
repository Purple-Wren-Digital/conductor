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
import { findMarketCenter, urgencyOptions } from "@/lib/utils";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useUserRole } from "@/hooks/use-user-role";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { Badge } from "@/components/ui/badge";

export type TicketFormValues = {
  title: string;
  description: string;
  urgency: Urgency;
  categoryId: string;
  dueDate?: Date;
  assigneeId?: string;
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

  const { role } = useUserRole();
  const { data: marketCentersData } = useFetchAllMarketCenters(role);

  const marketCenters = useMemo(() => {
    return marketCentersData?.marketCenters ?? [];
  }, [marketCentersData]);

  const marketCenterTicketCategories: TicketCategory[] =
    selectedMarketCenter && selectedMarketCenter?.ticketCategories
      ? selectedMarketCenter?.ticketCategories
      : [];
  const marketCenterAssignees: PrismaUser[] =
    selectedMarketCenter && selectedMarketCenter?.users
      ? selectedMarketCenter?.users
      : [];

  const prefillData = useCallback(() => {
    const marketCenter = findMarketCenter(marketCenters, marketCenterId);
    setSelectedMarketCenter(marketCenter);
  }, [marketCenterId, marketCenters]);

  useEffect(() => {
    if (!marketCenterId) return;
    prefillData();
  }, [marketCenterId, prefillData]);

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
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Detailed description of the issue, including steps to reproduce, expected behavior, etc."
              className={`min-h-[120px] ${
                errors.description ? "border-destructive" : ""
              }`}
              disabled={disabled}
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
          {/* MARKET CENTER */}
          <div className="space-y-2">
            <div className="flex flex-row align-center justify-between">
              <Label>Market Center *</Label>
              <ToolTip
                trigger={<Info className="w-3 h-3" />}
                content="Select a Market Center to view all team members and categories"
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

          <div className="grid gap-4 md:grid-cols-2">
            {/* CATEGORY */}
            <div className="space-y-2">
              <Label>Category *</Label>
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
                    assigneeId: assignee && assignee?.id,
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
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>
            {/* ASSIGNEE */}
            <div className="space-y-2">
              <div className="flex flex-row align-center justify-between">
                <Label>Assign To</Label>
                <ToolTip
                  trigger={<Info className="w-3 h-3" />}
                  content="If no user is selected, the ticket will automatically be
                assigned to you."
                />
              </div>
              <Select
                value={values.assigneeId}
                onValueChange={(value) => onChange({ assigneeId: value })}
                disabled={disabled}
              >
                <SelectTrigger
                  className={errors.assigneeId ? "border-destructive" : ""}
                  disabled={disabled}
                >
                  <SelectValue placeholder="Select an assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"Unassigned"}>Unassigned</SelectItem>
                  {marketCenterAssignees &&
                    marketCenterAssignees.length > 0 &&
                    marketCenterAssignees.map((user) => {
                      return (
                        <SelectItem key={user?.id} value={user?.id}>
                          {user?.name ?? user?.id}
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
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={!!loading}
            >
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button
              type="submit"
              disabled={!!loading || disabled}
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
