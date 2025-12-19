"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  useFetchTemplateForEditing,
  useSaveEmailTemplate,
  useResetEmailTemplate,
  usePreviewEmailTemplate,
  type CustomizableTemplateType,
} from "@/hooks/use-template-customization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowLeft, Eye, RotateCcw, Save, Bold, Italic } from "lucide-react";

// =============================================================================
// COMPONENT
// =============================================================================

export default function EmailTemplateEditor() {
  const router = useRouter();
  const params = useParams();
  const marketCenterId = params.marketCenterId as string;
  const templateType = params.templateType as CustomizableTemplateType;

  // Form state
  const [subject, setSubject] = useState("");
  const [greeting, setGreeting] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<{ subject?: string; greeting?: string; mainMessage?: string }>({});

  // Dialog state
  const [showPreview, setShowPreview] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Track focused field for variable insertion
  const [focusedField, setFocusedField] = useState<"subject" | "greeting" | "mainMessage" | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const greetingRef = useRef<HTMLInputElement>(null);

  // TipTap editor for main message
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    onUpdate: () => {
      setIsDirty(true);
    },
  });

  // Fetch template data
  const { data: templateData, isLoading } = useFetchTemplateForEditing({
    marketCenterId,
    templateType,
    role: "ADMIN",
  });

  // Mutations
  const saveMutation = useSaveEmailTemplate();
  const resetMutation = useResetEmailTemplate();
  const previewMutation = usePreviewEmailTemplate();

  // Initialize form with defaults or customization
  useEffect(() => {
    if (templateData) {
      const customization = templateData.emailCustomization;
      const defaults = templateData.emailDefault;

      setSubject(customization?.subject ?? defaults.subject);
      setGreeting(customization?.greeting ?? defaults.greeting);
      setButtonText(customization?.buttonText ?? defaults.buttonText ?? "");
      setVisibleFields(customization?.visibleFields ?? defaults.visibleFields);

      if (editor) {
        editor.commands.setContent(customization?.mainMessage ?? defaults.mainMessage);
      }

      setIsDirty(false);
    }
  }, [templateData, editor]);

  // Track dirty state
  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setIsDirty(true);
    if (errors.subject) {
      setErrors((prev) => ({ ...prev, subject: undefined }));
    }
  };

  const handleGreetingChange = (value: string) => {
    setGreeting(value);
    setIsDirty(true);
    if (errors.greeting) {
      setErrors((prev) => ({ ...prev, greeting: undefined }));
    }
  };

  const handleButtonTextChange = (value: string) => {
    setButtonText(value);
    setIsDirty(true);
  };

  const handleVisibleFieldToggle = (fieldKey: string) => {
    setVisibleFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
    setIsDirty(true);
  };

  // Insert variable at cursor position
  const insertVariable = (variableKey: string) => {
    const variableText = `{{${variableKey}}}`;

    if (focusedField === "subject" && subjectRef.current) {
      const input = subjectRef.current;
      const start = input.selectionStart ?? subject.length;
      const end = input.selectionEnd ?? subject.length;
      const newValue = subject.slice(0, start) + variableText + subject.slice(end);
      handleSubjectChange(newValue);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 0);
    } else if (focusedField === "greeting" && greetingRef.current) {
      const input = greetingRef.current;
      const start = input.selectionStart ?? greeting.length;
      const end = input.selectionEnd ?? greeting.length;
      const newValue = greeting.slice(0, start) + variableText + greeting.slice(end);
      handleGreetingChange(newValue);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 0);
    } else if (focusedField === "mainMessage" && editor) {
      editor.chain().focus().insertContent(variableText).run();
    } else {
      // Default to main message if no field is focused
      if (editor) {
        editor.chain().focus().insertContent(variableText).run();
      }
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: { subject?: string; greeting?: string; mainMessage?: string } = {};

    if (!subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!greeting.trim()) {
      newErrors.greeting = "Greeting is required";
    }

    const mainMessageContent = editor?.getHTML() || "";
    if (!mainMessageContent || mainMessageContent === "<p></p>") {
      newErrors.mainMessage = "Main message is required";
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
        subject,
        greeting,
        mainMessage: editor?.getHTML() || "",
        buttonText: buttonText.trim() || null,
        visibleFields,
      });
      setIsDirty(false);
      toast.success("Email template saved successfully");
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
        setSubject(templateData.emailDefault.subject);
        setGreeting(templateData.emailDefault.greeting);
        setButtonText(templateData.emailDefault.buttonText ?? "");
        setVisibleFields(templateData.emailDefault.visibleFields);
        if (editor) {
          editor.commands.setContent(templateData.emailDefault.mainMessage);
        }
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
        subject,
        greeting,
        mainMessage: editor?.getHTML() || "",
        buttonText: buttonText.trim() || null,
        visibleFields,
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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton data-slot="skeleton" className="h-8 w-8" />
          <div>
            <Skeleton data-slot="skeleton" className="h-8 w-48 mb-2" />
            <Skeleton data-slot="skeleton" className="h-4 w-32" />
          </div>
        </div>
        <div className="text-muted-foreground">Email Template</div>
        <Skeleton data-slot="skeleton" className="h-10 w-full" />
        <Skeleton data-slot="skeleton" className="h-10 w-full" />
        <Skeleton data-slot="skeleton" className="h-32 w-full" />
        <Skeleton data-slot="skeleton" className="h-10 w-full" />
        <div className="flex gap-2">
          <Skeleton data-slot="skeleton" className="h-10 w-24" />
          <Skeleton data-slot="skeleton" className="h-10 w-24" />
        </div>
      </div>
    );
  }

  const hasCustomization = !!templateData?.emailCustomization;

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
            Email Template
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
      <div className="space-y-6">
        {/* Subject Field */}
        <fieldset className="space-y-2" role="group">
          <div className="flex items-center justify-between">
            <Label htmlFor="subject">Subject</Label>
          </div>
          <p className="text-sm text-muted-foreground">The email subject line</p>
          <Input
            id="subject"
            ref={subjectRef}
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            onFocus={() => setFocusedField("subject")}
            placeholder="e.g., New Ticket: {{ticket_title}}"
            aria-invalid={!!errors.subject}
          />
          {errors.subject && (
            <p className="text-sm text-destructive">{errors.subject}</p>
          )}
        </fieldset>

        {/* Greeting Field */}
        <fieldset className="space-y-2" role="group">
          <div className="flex items-center justify-between">
            <Label htmlFor="greeting">Greeting</Label>
          </div>
          <p className="text-sm text-muted-foreground">How to greet the recipient</p>
          <Input
            id="greeting"
            ref={greetingRef}
            value={greeting}
            onChange={(e) => handleGreetingChange(e.target.value)}
            onFocus={() => setFocusedField("greeting")}
            placeholder="e.g., Hi {{user_name}},"
            aria-invalid={!!errors.greeting}
          />
          {errors.greeting && (
            <p className="text-sm text-destructive">{errors.greeting}</p>
          )}
        </fieldset>

        {/* Main Message Field - TipTap Editor */}
        <section className="space-y-2">
          <Label>Main Message</Label>
          <p className="text-sm text-muted-foreground">The main content of the email</p>

          {/* Formatting Toolbar */}
          <div className="flex gap-1 border rounded-t-md p-1 bg-muted/30">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={editor?.isActive("bold") ? "bg-muted" : ""}
              aria-label="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={editor?.isActive("italic") ? "bg-muted" : ""}
              aria-label="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
          </div>

          {/* Editor */}
          <div
            className="border border-t-0 rounded-b-md p-4 min-h-[150px] prose prose-sm max-w-none"
            onClick={() => setFocusedField("mainMessage")}
          >
            <EditorContent editor={editor} data-testid="tiptap-editor" />
          </div>
          {errors.mainMessage && (
            <p className="text-sm text-destructive">{errors.mainMessage}</p>
          )}
        </section>

        {/* Button Text Field */}
        <fieldset className="space-y-2" role="group">
          <div className="flex items-center justify-between">
            <Label htmlFor="buttonText">Button Text</Label>
          </div>
          <p className="text-sm text-muted-foreground">Leave empty to hide button</p>
          <Input
            id="buttonText"
            value={buttonText}
            onChange={(e) => handleButtonTextChange(e.target.value)}
            placeholder="e.g., View Ticket"
          />
        </fieldset>

        {/* Visible Fields Section */}
        <fieldset className="space-y-3" role="group">
          <Label>Visible Fields</Label>
          <p className="text-sm text-muted-foreground">Fields to show in email</p>
          <div className="space-y-2">
            {templateData?.emailVisibleFields.map((field) => (
              <div key={field.key} className="flex items-center space-x-2">
                <Checkbox
                  id={`field-${field.key}`}
                  checked={visibleFields.includes(field.key)}
                  onCheckedChange={() => handleVisibleFieldToggle(field.key)}
                  aria-label={field.label}
                />
                <Label htmlFor={`field-${field.key}`} className="font-normal cursor-pointer">
                  {field.label}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              This is how your email will appear with sample data.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-6 bg-white space-y-4">
            {/* Email Subject */}
            <div className="border-b pb-2">
              <p className="text-sm text-muted-foreground">Subject:</p>
              <p className="font-semibold">{previewMutation.data?.preview.subject}</p>
            </div>

            {/* Email Body */}
            <div className="space-y-4">
              <p>{previewMutation.data?.preview.greeting}</p>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewMutation.data?.preview.mainMessage || "" }}
              />

              {/* Visible Fields */}
              {previewMutation.data?.preview.visibleFieldsData && previewMutation.data.preview.visibleFieldsData.length > 0 && (
                <div className="bg-muted/30 rounded p-4 space-y-2">
                  {previewMutation.data.preview.visibleFieldsData.map((field) => (
                    <div key={field.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{field.label}:</span>
                      <span className="font-medium">{field.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Button */}
              {previewMutation.data?.preview.buttonText && (
                <div className="pt-4">
                  <Button className="w-full sm:w-auto">
                    {previewMutation.data.preview.buttonText}
                  </Button>
                </div>
              )}
            </div>
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
