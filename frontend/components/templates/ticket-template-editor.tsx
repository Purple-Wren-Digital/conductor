"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
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
import { Badge } from "@/components/ui/badge";
import { BasicEditorWithToolbar } from "@/components/ui/tiptap/basic-editor-and-toolbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useFetchTicketTemplateById } from "@/hooks/use-template-customization";
import { useUserRole } from "@/hooks/use-user-role";
import { API_BASE } from "@/lib/api/utils";
import type {
  MarketCenter,
  ConductorUser,
  TicketCategory,
  Urgency,
} from "@/lib/types";
import {
  capitalizeEveryWord,
  findMarketCenter,
  urgencyOptions,
} from "@/lib/utils";
import { ArrowLeft, Building, InfoIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type TicketTemplateEditorProps = {
  templateId?: string;
  type: "create" | "edit";
};

export default function TicketTemplateEditor({
  templateId,
  type,
}: TicketTemplateEditorProps) {
  const router = useRouter();
  const params = useParams();
  const defaultMarketCenterId = params.marketCenterId as string | undefined;

  const [hydrated, setHydrated] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [selectedMarketCenter, setSelectedMarketCenter] =
    useState<MarketCenter>({} as MarketCenter);
  const [urgency, setUrgency] = useState<Urgency>("MEDIUM");
  const [categoryId, setCategoryId] = useState<string | "none">("none");
  const [defaultAssigneeId, setDefaultAssigneeId] = useState<string | "none">(
    "none"
  );
  const [templateDescription, setTemplateDescription] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [todos, setTodos] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>("");
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [editSubtaskInput, setEditSubtaskInput] = useState<string | null>(null);

  const [isActive, setIsActive] = useState<boolean>(true);

  const [errors, setErrors] = useState<{
    general?: string;
    marketCenter?: string;
    templateName?: string;
    templateDescription?: string;
    ticketTitle?: string;
    ticketDescription?: string;
    newSubtaskTitle?: string;
    editingSubtask?: string;
    todos?: string;
    urgency?: string;
    categoryId?: string;
    defaultAssigneeId?: string;
    isActive?: string;
  }>({});

  const newSubtaskTitleDivRef = useRef<HTMLDivElement>(null);
  const editingSubtaskDivRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { role } = useUserRole();
  const { getToken } = useAuth();

  const { data: marketCentersData, isLoading: isMarketCentersLoading } =
    useFetchAllMarketCenters(role);

  const marketCenters = useMemo(() => {
    return marketCentersData?.marketCenters ?? [];
  }, [marketCentersData]);

  const marketCenterTicketCategories: TicketCategory[] = useMemo(() => {
    return !isMarketCentersLoading &&
      selectedMarketCenter &&
      selectedMarketCenter?.ticketCategories
      ? selectedMarketCenter?.ticketCategories
      : [];
  }, [selectedMarketCenter, isMarketCentersLoading]);

  const marketCenterUsers: ConductorUser[] = useMemo(() => {
    return !isMarketCentersLoading &&
      selectedMarketCenter &&
      selectedMarketCenter?.users
      ? selectedMarketCenter?.users
      : [];
  }, [selectedMarketCenter, isMarketCentersLoading]);

  const prefillMarketCenterData = useCallback(
    (mcId: string) => {
      const marketCenter = findMarketCenter(marketCenters, mcId);
      setSelectedMarketCenter(marketCenter);
    },
    [marketCenters]
  );

  useEffect(() => {
    if (type === "edit" || !defaultMarketCenterId) return;
    prefillMarketCenterData(defaultMarketCenterId);
  }, [type, defaultMarketCenterId, prefillMarketCenterData]);

  const {
    data: template,
    isLoading: isLoadingTemplate,
    refetch,
  } = useFetchTicketTemplateById({
    templateId: type === "edit" && templateId ? templateId : undefined,
    role,
  });

  const hasMadeChanges: boolean = useMemo(() => {
    if (!template) return true; // creating a new template always counts as change

    const selectedCategoryId = categoryId === "none" ? undefined : categoryId;
    const selectedAssigneeId =
      defaultAssigneeId === "none" ? undefined : defaultAssigneeId;

    return (
      templateName !== template?.name ||
      templateDescription !== template?.description ||
      ticketTitle !== template?.title ||
      ticketDescription !== template?.ticketDescription ||
      JSON.stringify(todos) !== JSON.stringify(template.todos ?? []) ||
      urgency !== template?.urgency ||
      selectedCategoryId !== template?.categoryId ||
      selectedAssigneeId !== template?.assigneeId ||
      isActive !== template.isActive ||
      selectedMarketCenter?.id !== template?.marketCenterId
    );
  }, [
    categoryId,
    template,
    defaultAssigneeId,
    templateName,
    templateDescription,
    ticketTitle,
    ticketDescription,
    todos,
    urgency,
    selectedMarketCenter,
    isActive,
  ]);

  useEffect(() => {
    if (!hydrated) return; // prevents overwrite on load
    localStorage.setItem(
      `${type}-ticket-template-${templateId}`,
      JSON.stringify({
        isActive,
        selectedMarketCenter,
        templateName,
        templateDescription,
        newSubtaskTitle,
        editingSubtask,
        editSubtaskInput,
        todos,
        categoryId,
        defaultAssigneeId,
        urgency,
      })
    );
  }, [
    type,
    templateId,
    isActive,
    templateName,
    templateDescription,
    newSubtaskTitle,
    editingSubtask,
    editSubtaskInput,
    todos,
    categoryId,
    defaultAssigneeId,
    urgency,
    selectedMarketCenter,
    hydrated,
  ]);

  useEffect(() => {
    const templateInputs = localStorage.getItem(
      `${type}-ticket-template-${templateId}`
    );
    if (templateInputs) {
      const fetchedInputs = JSON.parse(templateInputs);
      setIsActive(fetchedInputs?.isActive);
      setTemplateName(fetchedInputs?.templateName);
      setTemplateDescription(fetchedInputs?.templateDescription);
      setSelectedMarketCenter(fetchedInputs?.selectedMarketCenter);
      setCategoryId(fetchedInputs?.categoryId);
      setDefaultAssigneeId(fetchedInputs?.defaultAssigneeId);
      setUrgency(fetchedInputs?.urgency);
      setNewSubtaskTitle(fetchedInputs?.newSubtaskTitle);
      setEditingSubtask(fetchedInputs?.editingSubtask);
      setEditSubtaskInput(fetchedInputs?.editSubtaskInput);
      setTodos(fetchedInputs?.todos);
    }

    if (templateId && template) {
      setIsActive(template.isActive);
      setTemplateName(template.name);
      if (template?.description) {
        setTemplateDescription(template.description);
      }
      if (template?.marketCenterId) {
        prefillMarketCenterData(template.marketCenterId);
      }
      setCategoryId(template.categoryId || "none");
      setDefaultAssigneeId(template?.assigneeId || "none");
      setUrgency(template?.urgency || "MEDIUM");

      setTicketTitle(template.title);
      setTicketDescription(template.ticketDescription);
      setTodos(template.todos || []);
    }

    setHydrated(true);
  }, [type, templateId, template, prefillMarketCenterData]);

  const closeNewSubtaskTitle = useCallback(() => {
    setErrors({});
    setNewSubtaskTitle("");
    newSubtaskTitleDivRef.current = null;
  }, []);

  const handleCreateNewSubtask = () => {
    if (!newSubtaskTitle || newSubtaskTitle.trim() === "") {
      setErrors({
        ...errors,
        newSubtaskTitle: "Subtask cannot be empty",
      });
      return;
    }
    setTodos([...todos, newSubtaskTitle.trim()]);

    closeNewSubtaskTitle();
  };

  const closeEditSubtask = useCallback(() => {
    setErrors({});
    setEditingSubtask(null);
    editingSubtaskDivRef.current = null;
  }, []);

  const handleUpdatedSubtask = async () => {
    if (!editingSubtask) return;
    const existingTodoIndex = todos.findIndex(
      (todo) => todo === editingSubtask
    );
    if (existingTodoIndex !== -1) {
      const updatedTodos = [...todos];
      updatedTodos[existingTodoIndex] = editingSubtask;
      setTodos(updatedTodos);
      setEditingSubtask(null);
      setEditSubtaskInput(null);
    } else {
      toast.error("Failed to update subtask");
    }
  };

  useEffect(() => {
    const handleOutSideClick = (event: MouseEvent) => {
      if (
        editingSubtaskDivRef?.current &&
        !editingSubtaskDivRef?.current.contains(event.target as Node)
      ) {
        closeEditSubtask();
      }

      if (
        newSubtaskTitleDivRef?.current &&
        !newSubtaskTitleDivRef?.current.contains(event.target as Node)
      ) {
        closeNewSubtaskTitle();
      }
    };

    window.addEventListener("mousedown", handleOutSideClick);

    return () => {
      window.removeEventListener("mousedown", handleOutSideClick);
    };
  }, [
    newSubtaskTitleDivRef,
    editingSubtaskDivRef,
    closeEditSubtask,
    closeNewSubtaskTitle,
  ]);

  const handleClearTemplate = useCallback(() => {
    setTemplateName("");
    setTemplateDescription("");
    setTicketTitle("");
    setTicketDescription("");
    setTodos([]);
    setUrgency("MEDIUM");
    setCategoryId("");
    setDefaultAssigneeId("");
    setErrors({});
  }, []);

  // Validate inputs
  const validateInputs = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!selectedMarketCenter?.id) {
      newErrors.marketCenter = "Market center selection is required";
    }

    if (!templateName?.trim()) {
      newErrors.templateName = "Template name is required";
    }

    if (!urgency) {
      newErrors.urgency = "Urgency selection is required";
    }

    if (!ticketTitle?.trim()) {
      newErrors.ticketTitle = "Ticket title is required";
    }
    if (!ticketDescription?.trim()) {
      newErrors.ticketDescription = "Ticket description is required";
    }

    if (typeof isActive !== "boolean") {
      newErrors.isActive = "Please specify status";
    }

    if (type === "edit" && templateId && !hasMadeChanges) {
      newErrors.general = "No changes made";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  }, [
    hasMadeChanges,
    isActive,
    selectedMarketCenter,
    templateId,
    templateName,
    ticketDescription,
    ticketTitle,
    type,
    urgency,
  ]);

  const hasErrors = useMemo(
    () => Object.values(errors).some(Boolean),
    [errors]
  );

  const invalidateTicketTemplateListQueryKey = useCallback(async () => {
    // Invalidate ticket template list query key
    await queryClient.invalidateQueries({
      queryKey: ["ticket-templates-list"],
    });
  }, [queryClient]);

  const handleSubmitNewTemplate = async () => {
    setIsLoading(true);
    setErrors({});
    if (!validateInputs()) {
      toast.error("Invalid input(s)");
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(
        `${API_BASE}/ticket-templates/${selectedMarketCenter.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newTemplate: {
              name: templateName,
              description:
                templateDescription && templateDescription.trim() !== ""
                  ? templateDescription
                  : undefined,
              title: ticketTitle,
              ticketDescription: ticketDescription,
              todos: todos,
              urgency: urgency,
              categoryId:
                categoryId && categoryId !== "none" ? categoryId : undefined,
              isActive: true,
            },
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create template (${res.status}): ${text}`);
      }

      toast.success("Ticket template created successfully");
      setShowSubmitSuccess(true);
    } catch (error) {
      console.error("Error creating ticket template:", error);
      toast.error(`Error creating ticket template`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEditTemplate = async () => {
    setIsLoading(true);
    setErrors({});
    if (!validateInputs()) {
      toast.error("Invalid input(s)");
      setIsLoading(false);
      return;
    }
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(
        `${API_BASE}/ticket-templates/template/${templateId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            templateId: templateId,
            isActive: isActive,
            templateName: templateName,
            templateDescription: templateDescription,
            selectedMarketCenter: selectedMarketCenter.id,
            categoryId: categoryId,
            defaultAssigneeId: defaultAssigneeId,
            urgency: urgency,
            ticketTitle: ticketTitle,
            ticketTemplateDescription: ticketDescription,
            ticketTemplateTodos: todos,
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update template (${res.status}): ${text}`);
      }
      toast.success("Ticket template updated successfully");
      await refetch();
    } catch (error) {
      console.error("Error editing ticket template:", error);
      toast.error(`Error editing ticket template`);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoadingTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton data-slot="skeleton" className="h-8 w-8" />
          <div>
            <Skeleton data-slot="skeleton" className="h-8 w-48 mb-2" />
            <Skeleton data-slot="skeleton" className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant={"ghost"}
              onClick={() => {
                if (hasMadeChanges) {
                  setShowUnsavedWarning(true);
                } else {
                  localStorage.removeItem(
                    `${type}-ticket-template-${templateId}`
                  );
                  router.push(`/dashboard/ticket-templates`);
                }
              }}
              aria-label="Back to ticket templates"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {type === "create" ? "New" : "Edit"} Ticket Template
              </h1>
              <p className="text-sm text-muted-foreground">
                {type === "create"
                  ? "Create ticket templates for your market center"
                  : "Updates applied to new tickets only"}
                {hasMadeChanges && " • (Unsaved Changes)"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              variant={"outline"}
              onClick={handleClearTemplate}
              disabled={isLoading || isLoadingTemplate}
            >
              Clear All
            </Button>
            <div className=" flex flex-col items-center gap-2">
              <Button
                variant={hasErrors ? "destructive" : "default"}
                onClick={
                  type === "create"
                    ? handleSubmitNewTemplate
                    : handleSubmitEditTemplate
                }
                disabled={isLoading || isLoadingTemplate}
              >
                Submit & Save
              </Button>
              <p className="text-sm text-destructive">
                {errors?.general && errors.general}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Market Center */}
          <fieldset
            className={`space-y-2 ${type === "edit" ? "w-full md:w-150" : "w-full"}`}
            role="group"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="templateName" className="text-md">
                Market Center
              </Label>
            </div>
            <Select
              value={selectedMarketCenter?.id}
              onValueChange={(value) =>
                setSelectedMarketCenter(findMarketCenter(marketCenters, value))
              }
              disabled={isMarketCentersLoading}
            >
              <SelectTrigger
                className={errors.marketCenter ? "border-destructive" : ""}
                disabled={isMarketCentersLoading}
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
            <p className="text-sm text-destructive">
              {errors.marketCenter && errors.marketCenter}
            </p>
          </fieldset>

          {/* Edit Only - isActive */}
          {type === "edit" && (
            <fieldset className="space-y-2" role="group">
              <div className="flex items-center justify-between gap-4 w-full md:w-50">
                <Label htmlFor="isActive" className="text-md">
                  {isActive ? "Active" : "Inactive"}
                </Label>

                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => {
                    setIsActive(checked);
                  }}
                  aria-label={`Current: ${isActive ? "Active" : "Inactive"} status`}
                  className={
                    errors.isActive
                      ? "data-[state=checked]:border-destructive data-[state=unchecked]:bg-destructive/30"
                      : ""
                  }
                />
              </div>
              <p className="text-sm text-destructive">
                {errors.isActive && errors.isActive}
              </p>
            </fieldset>
          )}
          {/* Template Name */}
          <fieldset className="space-y-2" role="group">
            <div className="flex items-center justify-between">
              <Label htmlFor="templateName" className="text-md">
                Template Label
              </Label>
              <ToolTip
                content="An internal label that helps your team identify the ticket template easily"
                trigger={<InfoIcon className="size-4" />}
              />
            </div>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., 'Compliance' or 'Listings'"
              aria-label="Template label input"
              aria-invalid={!!errors.templateName}
              disabled={isLoading || isLoadingTemplate}
              className={errors.templateName ? "border-destructive" : ""}
            />
            <p className="text-sm text-destructive">
              {errors.templateName && errors.templateName}
            </p>
          </fieldset>

          {/* Template Description */}
          <fieldset className="space-y-2" role="group">
            <div className="flex items-center justify-between">
              <Label htmlFor="templateDescription" className="text-md">
                Template Description
              </Label>
              <ToolTip
                content="Optional: Internal description"
                trigger={<InfoIcon className="size-4" />}
              />
            </div>
            <Input
              id="templateDescription"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="e.g., 'Template for compliance-related tickets...'"
              aria-label="Template description input"
              aria-invalid={!!errors.templateDescription}
              disabled={isLoading || isLoadingTemplate}
              className={errors.templateDescription ? "border-destructive" : ""}
            />
            <p className="text-sm text-destructive">
              {errors.templateDescription && errors.templateDescription}
            </p>
          </fieldset>

          {/* Category, Assignee, and Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <fieldset className="space-y-2" role="group">
              <Label className="text-md">Category </Label>
              <Select
                value={categoryId}
                onValueChange={(value: string | "none") => {
                  setCategoryId(value);
                  if (value === "none") {
                    setDefaultAssigneeId("none");
                    return;
                  }

                  setCategoryId(value);

                  const assigneeId =
                    marketCenterUsers?.find(
                      (u) =>
                        u.id ===
                        marketCenterTicketCategories?.find(
                          (c) => c.id === value
                        )?.defaultAssigneeId
                    )?.id ?? "none";

                  setDefaultAssigneeId(assigneeId);
                }}
                disabled={
                  isLoading || !marketCenters.length || isLoadingTemplate
                }
              >
                <SelectTrigger
                  className={errors.categoryId ? "border-destructive" : ""}
                  disabled={
                    isLoading || !marketCenters.length || isLoadingTemplate
                  }
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {marketCenterTicketCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-destructive">
                {errors.categoryId && errors.categoryId}
              </p>
            </fieldset>

            {/* Assignee */}
            <fieldset className="space-y-2" role="group">
              <Label className="text-md">Assignee</Label>
              <Select
                value={defaultAssigneeId}
                onValueChange={(value) => setDefaultAssigneeId(value)}
                disabled={
                  isLoading || !marketCenters.length || isLoadingTemplate
                }
              >
                <SelectTrigger
                  className={
                    errors.defaultAssigneeId ? "border-destructive" : ""
                  }
                  disabled={
                    isLoading || !marketCenters.length || isLoadingTemplate
                  }
                >
                  <SelectValue placeholder="Select an assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {marketCenterUsers &&
                    marketCenterUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}:{" "}
                        {user?.role
                          ? capitalizeEveryWord(user.role.split("_").join(" "))
                          : "Role Not Set"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-destructive">
                {errors.defaultAssigneeId && errors.defaultAssigneeId}
              </p>
            </fieldset>

            {/* Urgency */}
            <fieldset className="space-y-2" role="group">
              <Label className="text-md">Urgency</Label>
              <Select
                value={urgency}
                onValueChange={(value: Urgency) => setUrgency(value)}
                disabled={
                  isLoading || !marketCenters.length || isLoadingTemplate
                }
              >
                <SelectTrigger
                  className={errors.urgency ? "border-destructive" : ""}
                  disabled={
                    isLoading || !marketCenters.length || isLoadingTemplate
                  }
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
            </fieldset>
          </div>

          {/* Ticket Title */}
          <fieldset className="space-y-2" role="group">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject" className="text-md">
                Ticket Title
              </Label>
            </div>
            <Input
              id="ticketTitle"
              value={ticketTitle}
              onChange={(e) => setTicketTitle(e.target.value)}
              placeholder="Default ticket title..."
              aria-label="Default ticket title"
              aria-invalid={!!errors.ticketTitle}
              disabled={isLoading || isLoadingTemplate}
              className={errors.ticketTitle ? "border-destructive" : ""}
            />
            <p className="text-sm text-destructive">
              {errors?.ticketTitle && errors.ticketTitle}
            </p>
          </fieldset>

          {/* Ticket Description - TipTap Editor */}
          <fieldset className="space-y-2" role="group">
            <div className="flex items-center justify-between">
              <Label className="text-md">Ticket Description *</Label>
              <ToolTip
                content="Default ticket description that will appear in the ticket body"
                trigger={<InfoIcon className="size-4" />}
              />
            </div>
            <BasicEditorWithToolbar
              value={ticketDescription}
              disabled={isLoading || isLoadingTemplate}
              onChange={(value: string) => setTicketDescription(value)}
              placeholder="Default ticket description..."
            />
            <p className="text-sm text-destructive">
              {errors?.ticketDescription && errors.ticketDescription}
            </p>
          </fieldset>

          {/* New Subtask Field */}
          <fieldset className="space-y-2" role="group">
            <div className="flex items-center justify-between">
              <Label htmlFor="newSubtask" className="text-md">
                Subtasks
              </Label>
              <ToolTip
                content="Default subtasks to be included with the ticket"
                trigger={<InfoIcon className="size-4" />}
              />
            </div>
            <div
              className="flex items-center gap-2"
              ref={newSubtaskTitleDivRef}
            >
              <Input
                id="newSubtask"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="New default subtask..."
                className={errors.newSubtaskTitle ? "border-destructive" : ""}
                aria-label="Create a new default subtask"
                aria-invalid={!!errors.newSubtaskTitle}
                disabled={isLoading || isLoadingTemplate}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateNewSubtask();
                    return;
                  }

                  if (e.key === "Escape" || e.key === "Tab") {
                    e.preventDefault();
                    closeNewSubtaskTitle();

                    return;
                  }
                }}
              />
              <Button
                type="submit"
                variant="outline"
                size={"sm"}
                disabled={isLoading || isLoadingTemplate}
                aria-label="Create new subtask for ticket"
                onClick={handleCreateNewSubtask}
              >
                Add
              </Button>
              <Button
                type="reset"
                variant="outline"
                size={"sm"}
                disabled={!newSubtaskTitle || newSubtaskTitle.trim() === ""}
                aria-label="Reset new subtask input"
                className="bg-muted"
                onKeyDown={async (e) => {
                  e.preventDefault();
                  if (e.key === "Escape" || e.key === "Tab")
                    closeNewSubtaskTitle();
                }}
              >
                Reset
              </Button>
            </div>
            <p className="text-sm text-destructive">
              {errors.newSubtaskTitle && errors.newSubtaskTitle}
            </p>
          </fieldset>

          {/* Created Subtasks List */}
          {todos && todos.length > 0 && (
            <fieldset className="space-y-2" role="group">
              <div className="flex items-center justify-between">
                <Label>Subtask List ({todos.length})</Label>
              </div>
              <ul className="list-none space-y-2">
                {todos.map((todo: string, index: number) => (
                  <li
                    key={index + todo}
                    className="list-disc list-inside flex items-center gap-2 pl-1"
                  >
                    <Checkbox
                      id={`${index}-todo-${todo}`}
                      className={`shadow disabled:bg-primary/50`}
                      disabled={true}
                    />
                    <div
                      onClick={() => {
                        setEditingSubtask(todo);
                        setEditSubtaskInput(todo);
                      }}
                      className={`flex-1 space-y-2 ${
                        isLoading || isLoadingTemplate
                          ? "cursor-not-allowed"
                          : editingSubtask
                            ? "cursor-default"
                            : "hover:cursor-pointer hover:text-primary"
                      } py-2`}
                    >
                      {/* Not editing */}
                      {editingSubtask !== todo && (
                        <div className="flex items-center gap-2 flex-wrap w-full  md:flex-nowrap">
                          <div className="flex h-9 w-full min-w-0 rounded-md border border-input px-3 py-1 text-base shadow-xs md:text-sm">
                            <Label
                              htmlFor={`${index}-todo-${todo}`}
                              className={`text-md text-muted-foreground font-normal leading-relaxed hover:text-primary`}
                              aria-label={`Subtask title: ${todo}. Click here to edit.`}
                            >
                              {todo}
                            </Label>
                          </div>
                          <div className="flex items-center justify-end gap-2 w-full md:w-fit md:flex-nowrap">
                            <Button
                              variant="outline"
                              size={"sm"}
                              disabled={isLoading || isLoadingTemplate}
                              aria-label="Edit subtask"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Editing */}
                      {editingSubtask === todo && (
                        <fieldset role="group">
                          <div
                            ref={editingSubtaskDivRef}
                            className="flex items-center gap-2 flex-wrap w-full  md:flex-nowrap"
                          >
                            <Input
                              id={`${index}-edit-todo-${todo}`}
                              type="text"
                              className={`h-8 ${errors?.editingSubtask ? "border-destructive" : ""}`}
                              value={editSubtaskInput || ""}
                              onChange={(e) =>
                                setEditSubtaskInput(e.target.value)
                              }
                              disabled={isLoading || isLoadingTemplate}
                              aria-label="Default subtask editor"
                              aria-invalid={!!errors.editingSubtask}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleUpdatedSubtask();
                                  return;
                                }

                                if (e.key === "Escape" || e.key === "Tab") {
                                  e.preventDefault();
                                  setEditingSubtask(null);

                                  return;
                                }
                              }}
                            />
                            <div className="flex items-center justify-end gap-2 w-full md:w-fit md:flex-nowrap">
                              <Button
                                variant="outline"
                                size={"sm"}
                                onClick={() => {
                                  const existingTodoIndex = todos.findIndex(
                                    (todo) => todo === editingSubtask
                                  );
                                  if (existingTodoIndex !== -1) {
                                    const updatedTodos = [...todos];
                                    updatedTodos[existingTodoIndex] =
                                      editingSubtask;
                                    setTodos(updatedTodos);
                                    setEditingSubtask(null);
                                    setEditSubtaskInput(null);
                                  } else {
                                    toast.error("Failed to update subtask");
                                  }
                                }}
                                disabled={isLoading || isLoadingTemplate}
                                aria-label="Save subtask"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size={"sm"}
                                onClick={() => {
                                  const updatedTodos = todos.filter(
                                    (todo) => todo !== editingSubtask
                                  );
                                  setTodos(updatedTodos);
                                }}
                                className="bg-muted"
                                disabled={isLoading || isLoadingTemplate}
                                aria-label="Delete subtask from list"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          <p className="text-destructive text-sm">
                            {errors?.editingSubtask && errors.editingSubtask}
                          </p>
                        </fieldset>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </div>
      </div>

      <AlertDialog
        open={showUnsavedWarning}
        onOpenChange={setShowUnsavedWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave without
              saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="text-white bg-[#6D1C24]  hover:bg-[#4B1D22]"
              onClick={() => {
                localStorage.removeItem(
                  `${type}-ticket-template-${templateId}`
                );
                handleClearTemplate();
                router.push(`/dashboard/ticket-templates`);
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSubmitSuccess} onOpenChange={setShowSubmitSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Template Created</AlertDialogTitle>
            <AlertDialogDescription>
              Created successfully! Would you like to create another one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="text-black border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground "
              onClick={async () => {
                localStorage.removeItem(
                  `${type}-ticket-template-${templateId}`
                );
                handleClearTemplate();
                await invalidateTicketTemplateListQueryKey();
                router.push(`/dashboard/ticket-templates`);
              }}
            >
              Done
            </AlertDialogAction>
            <AlertDialogAction
              className="text-white bg-[#6D1C24]  hover:bg-[#4B1D22]"
              onClick={() => {
                localStorage.removeItem(
                  `${type}-ticket-template-${templateId}`
                );
                handleClearTemplate();
              }}
            >
              Create Another
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
