"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useFetchTemplateForEditing,
  useSaveInAppTemplate,
  useResetInAppTemplate,
  usePreviewInAppTemplate,
  type CustomizableTemplateType,
} from "@/hooks/use-template-customization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Eye, RotateCcw, Save } from "lucide-react";

// =============================================================================
// CONSTANTS
// =============================================================================

const TITLE_MAX_LENGTH = 100;
const BODY_MAX_LENGTH = 200;

// =============================================================================
// COMPONENT
// =============================================================================

export default function InAppTemplateEditor() {
  const router = useRouter();
  const params = useParams();
  const marketCenterId = params.marketCenterId as string;
  const templateType = params.templateType as CustomizableTemplateType;

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  // Dialog state
  const [showPreview, setShowPreview] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Track focused field for variable insertion
  const [focusedField, setFocusedField] = useState<"title" | "body" | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Fetch template data
  const { data: templateData, isLoading } = useFetchTemplateForEditing({
    marketCenterId,
    templateType,
    role: "ADMIN", // This will be checked server-side
  });

  // Mutations
  const saveMutation = useSaveInAppTemplate();
  const resetMutation = useResetInAppTemplate();
  const previewMutation = usePreviewInAppTemplate();

  // Initialize form with defaults or customization
  useEffect(() => {
    if (templateData) {
      const customization = templateData.inAppCustomization;
      const defaults = templateData.inAppDefault;

      setTitle(customization?.title ?? defaults.title);
      setBody(customization?.body ?? defaults.body);
      setIsDirty(false);
    }
  }, [templateData]);

  // Track dirty state
  const handleTitleChange = (value: string) => {
    setTitle(value);
    setIsDirty(true);
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }));
    }
  };

  const handleBodyChange = (value: string) => {
    setBody(value);
    setIsDirty(true);
    if (errors.body) {
      setErrors((prev) => ({ ...prev, body: undefined }));
    }
  };

  // Insert variable at cursor position
  const insertVariable = (variableKey: string) => {
    const variableText = `{{${variableKey}}}`;

    if (focusedField === "title" && titleRef.current) {
      const input = titleRef.current;
      const start = input.selectionStart ?? title.length;
      const end = input.selectionEnd ?? title.length;
      const newValue = title.slice(0, start) + variableText + title.slice(end);
      handleTitleChange(newValue);
      // Restore focus and cursor position
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 0);
    } else if (focusedField === "body" && bodyRef.current) {
      const textarea = bodyRef.current;
      const start = textarea.selectionStart ?? body.length;
      const end = textarea.selectionEnd ?? body.length;
      const newValue = body.slice(0, start) + variableText + body.slice(end);
      handleBodyChange(newValue);
      // Restore focus and cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 0);
    } else {
      // Default to body if no field is focused
      handleBodyChange(body + variableText);
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: { title?: string; body?: string } = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > TITLE_MAX_LENGTH) {
      newErrors.title = `Title must be less than ${TITLE_MAX_LENGTH} characters`;
    }

    if (!body.trim()) {
      newErrors.body = "Body is required";
    } else if (body.length > BODY_MAX_LENGTH) {
      newErrors.body = `Body must be less than ${BODY_MAX_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    try {
      await saveMutation.mutateAsync({
        marketCenterId,
        templateType,
        title,
        body,
      });
      setIsDirty(false);
      toast.success("In-app notification template saved successfully");
    } catch {
      toast.error("Failed to save template. Please try again.");
    }
  };

  // Handle reset
  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync({
        marketCenterId,
        templateType,
      });
      // Reset form to defaults
      if (templateData) {
        setTitle(templateData.inAppDefault.title);
        setBody(templateData.inAppDefault.body);
        setIsDirty(false);
      }
      setShowResetConfirm(false);
      toast.success("Template reset to default");
    } catch {
      toast.error("Failed to reset template. Please try again.");
    }
  };

  // Handle preview
  const handlePreview = async () => {
    try {
      await previewMutation.mutateAsync({
        marketCenterId,
        templateType,
        title,
        body,
      });
      setShowPreview(true);
    } catch {
      toast.error("Failed to generate preview. Please try again.");
    }
  };

  // Handle cancel/back
  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      router.back();
    }
  };

  // Get character count color
  const getCharCountClass = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 1) return "text-destructive";
    if (ratio >= 0.9) return "text-warning";
    return "text-muted-foreground";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton data-slot="skeleton" className="h-8 w-8" />
          <Skeleton data-slot="skeleton" className="h-8 w-48" />
        </div>
        <Skeleton data-slot="skeleton" className="h-10 w-full" />
        <Skeleton data-slot="skeleton" className="h-24 w-full" />
        <div className="flex gap-2">
          <Skeleton data-slot="skeleton" className="h-10 w-24" />
          <Skeleton data-slot="skeleton" className="h-10 w-24" />
        </div>
      </div>
    );
  }

  const hasCustomization = !!templateData?.inAppCustomization;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/template-customization`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to templates"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {templateData?.label ?? "Template"}
          </h1>
          <p className="text-muted-foreground">
            In-App Notification Template
          </p>
        </div>
      </div>

      {/* Variable Buttons */}
      <div className="space-y-2">
        <Label>Insert Variable</Label>
        <div className="flex flex-wrap gap-2">
          {templateData?.variables.map((variable) => (
            <Button
              key={variable.key}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => insertVariable(variable.key)}
              title={variable.description}
            >
              {variable.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Title Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Title</Label>
            <span className={`text-xs ${getCharCountClass(title.length, TITLE_MAX_LENGTH)}`}>
              {title.length}/{TITLE_MAX_LENGTH}
            </span>
          </div>
          <Input
            id="title"
            ref={titleRef}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onFocus={() => setFocusedField("title")}
            placeholder="e.g., New Ticket: {{ticket_title}}"
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
        </div>

        {/* Body Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="body">Body</Label>
            <span className={`text-xs ${getCharCountClass(body.length, BODY_MAX_LENGTH)}`}>
              {body.length}/{BODY_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id="body"
            ref={bodyRef}
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            onFocus={() => setFocusedField("body")}
            placeholder="e.g., Created by {{creator_name}}"
            rows={4}
            aria-invalid={!!errors.body}
          />
          {errors.body && (
            <p className="text-sm text-destructive">{errors.body}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={previewMutation.isPending}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        {hasCustomization && (
          <Button
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        )}
        <Button variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>
              This is how your notification will appear with sample data.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
            <h3 className="font-semibold">
              {previewMutation.data?.preview.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {previewMutation.data?.preview.body}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the template to its default content. Any
              customizations you&apos;ve made will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.back()}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
