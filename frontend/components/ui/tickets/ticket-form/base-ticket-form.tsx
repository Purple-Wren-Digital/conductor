"use client";

import type React from "react";
import { useMemo } from "react";
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
import { CalendarIcon, Save, X, FileText } from "lucide-react";
import { format } from "date-fns";
import type { TicketTemplate, Urgency } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";

export type TicketFormValues = {
  title: string;
  description: string;
  urgency: Urgency;
  category: string;
  dueDate?: Date;
};

export type TicketFormErrors = Partial<Record<keyof TicketFormValues, string>>;

export type BaseTicketFormProps = {
  // Dialog controls
  isOpen: boolean;
  onClose: () => void;

  // Form state
  values: TicketFormValues;
  errors: TicketFormErrors;
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
};

const urgencyOptions: Urgency[] = ["HIGH", "MEDIUM", "LOW"];
const categoryOptions = [
  "Maintenance",
  "Document Request",
  "Marketing Materials",
  "Showing Request",
  "Compliance",
  "IT Issue",
  "Other",
];

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
}: BaseTicketFormProps) {
  const templateSection = useMemo(() => {
    if (!showTemplateSelect) return null;
    return (
      <div className="space-y-2">
        <Label>Template (Optional)</Label>
        <Select value={selectedTemplateId} onValueChange={onChangeTemplateId!}>
          <SelectTrigger>
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
  }, [showTemplateSelect, selectedTemplateId, onChangeTemplateId, templates]);

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

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Brief description of the issue or request"
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

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
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Urgency *</Label>
              <Select
                value={values.urgency}
                onValueChange={(value: Urgency) => onChange({ urgency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyOptions.map((urgency) => (
                    <SelectItem key={urgency} value={urgency}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            urgency === "HIGH"
                              ? "bg-red-500"
                              : urgency === "MEDIUM"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                        />
                        {urgency}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={values.category}
                onValueChange={(value) => onChange({ category: value })}
              >
                <SelectTrigger
                  className={errors.category ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal bg-transparent"
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
                  onSelect={(date) => onChange({ dueDate: date || undefined })}
                  // initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
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
            <Button type="submit" disabled={!!loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
