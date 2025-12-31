"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useUserRole } from "@/hooks/use-user-role";
import type { MarketCenter, TicketCategory, Urgency } from "@/lib/types";
import { findMarketCenter, urgencyOptions } from "@/lib/utils";
import { ArrowLeft, Building, InfoIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

export default function TicketTemplateEditor() {
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
  const [categoryId, setCategoryId] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>("");
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [todos, setTodos] = useState<string[]>([]);

  const [errors, setErrors] = useState<{
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
  }>({});

  const newSubtaskTitleDivRef = useRef<HTMLDivElement>(null);
  const editingSubtaskDivRef = useRef<HTMLDivElement>(null);

  const { role, permissions } = useUserRole();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!hydrated) return; // prevents overwrite on load
    localStorage.setItem(
      "new-ticket-template",
      JSON.stringify({
        selectedMarketCenter,
        templateName,
        templateDescription,
        newSubtaskTitle,
        editingSubtask,
        todos,
        categoryId,
        urgency,
      })
    );
  }, [
    templateName,
    templateDescription,
    newSubtaskTitle,
    editingSubtask,
    todos,
    categoryId,
    urgency,
    selectedMarketCenter,
    hydrated,
  ]);

  useEffect(() => {
    const newTemplate = localStorage.getItem("new-ticket-template");
    if (newTemplate) {
      const fetchedInputs = JSON.parse(newTemplate);
      setTemplateName(fetchedInputs?.templateName);
      setSelectedMarketCenter(fetchedInputs?.selectedMarketCenter);
      setCategoryId(fetchedInputs?.categoryId);
      setUrgency(fetchedInputs?.urgency);
      setTemplateDescription(fetchedInputs?.templateDescription);
      setNewSubtaskTitle(fetchedInputs?.newSubtaskTitle);
      setEditingSubtask(fetchedInputs?.editingSubtask);
      setTodos(fetchedInputs?.todos);
    }

    setHydrated(true);
  }, []);

  const hasMadeChanges = useMemo(() => {
    return (
      templateName !== "" ||
      templateDescription !== "" ||
      ticketTitle !== "" ||
      ticketDescription !== "" ||
      todos.length > 0 ||
      urgency !== "MEDIUM" ||
      categoryId !== "" ||
      (!!selectedMarketCenter && Object.keys(selectedMarketCenter).length === 1)
    );
  }, [
    templateName,
    templateDescription,
    ticketTitle,
    ticketDescription,
    todos.length,
    urgency,
    categoryId,
    selectedMarketCenter,
  ]);

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

  const prefillMarketCenterData = useCallback(
    (mcId: string) => {
      const marketCenter = findMarketCenter(marketCenters, mcId);
      setSelectedMarketCenter(marketCenter);
    },
    [marketCenters]
  );

  useEffect(() => {
    if (!defaultMarketCenterId || defaultMarketCenterId === "") return;
    prefillMarketCenterData(defaultMarketCenterId);
  }, [defaultMarketCenterId, prefillMarketCenterData]);

  //   Subtask Handlers
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

  const handleClearTemplate = () => {
    setTemplateName("");
    setTemplateDescription("");
    setTicketTitle("");
    setTicketDescription("");
    setTodos([]);
    setUrgency("MEDIUM");
    setCategoryId("");
    setErrors({});
  };

  // Validate inputs
  const validateInputs = () => {
    const newErrors: typeof errors = {};
    if (!templateName || templateName.trim() === "") {
      newErrors.templateName = "Template name is required";
    }
    if (!selectedMarketCenter || !selectedMarketCenter.id) {
      newErrors.marketCenter = "Market center selection is required";
    }

    if (!urgency) {
      newErrors.urgency = "Urgency selection is required";
    }

    if (!ticketTitle || ticketTitle.trim() === "") {
      newErrors.ticketTitle = "Ticket title is required";
    }
    if (!ticketDescription || ticketDescription.trim() === "") {
      newErrors.ticketDescription = "Ticket description is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleSubmitTemplate = async () => {
    setIsLoading(true);

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
        `/api/ticket-templates/${selectedMarketCenter.id}`,
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

  // Loading state
  //   if (isLoading) {
  //     return (
  //       <div className="space-y-6">
  //         <div className="flex items-center gap-4">
  //           <Skeleton data-slot="skeleton" className="h-8 w-8" />
  //           <div>
  //             <Skeleton data-slot="skeleton" className="h-8 w-48 mb-2" />
  //             <Skeleton data-slot="skeleton" className="h-4 w-32" />
  //           </div>
  //         </div>
  //         <div className="text-muted-foreground">Email Template</div>
  //         <Skeleton data-slot="skeleton" className="h-10 w-full" />
  //         <Skeleton data-slot="skeleton" className="h-10 w-full" />
  //         <Skeleton data-slot="skeleton" className="h-32 w-full" />
  //         <Skeleton data-slot="skeleton" className="h-10 w-full" />
  //         <div className="flex gap-2">
  //           <Skeleton data-slot="skeleton" className="h-10 w-24" />
  //           <Skeleton data-slot="skeleton" className="h-10 w-24" />
  //         </div>
  //       </div>
  //     );
  //   }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant={"ghost"}
            onClick={() => {
              if (hasMadeChanges) {
                setShowUnsavedWarning(true);
              } else {
                localStorage.removeItem("new-ticket-template");
                router.push(`/dashboard/ticket-templates`);
              }
            }}
            aria-label="Back to ticket templates"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Ticket Template</h1>
            <p className="text-sm text-muted-foreground">
              Create ticket templates for your market center
            </p>
          </div>
          <div className="flex flex-wrap gap-4 ml-auto">
            <Button
              variant={"outline"}
              onClick={handleClearTemplate}
              disabled={isLoading}
            >
              Clear
            </Button>

            <Button onClick={handleSubmitTemplate} disabled={isLoading}>
              Submit
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Template Name */}
          <fieldset className="space-y-2" role="group">
            <div className="flex items-center justify-between">
              <Label htmlFor="templateName" className="text-md">
                Template Label *
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
              aria-invalid={!!errors.templateName}
            />
            {errors.templateName && (
              <p className="text-sm text-destructive">{errors.templateName}</p>
            )}
          </fieldset>

          {/* Market Center, Category, Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Market Center */}
            <fieldset className="space-y-2" role="group">
              <div className="flex items-center justify-between">
                <Label htmlFor="templateName" className="text-md">
                  Market Center *
                </Label>
              </div>
              <Select
                value={selectedMarketCenter?.id}
                onValueChange={(value) =>
                  setSelectedMarketCenter(
                    findMarketCenter(marketCenters, value)
                  )
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
                      <SelectItem
                        key={marketCenter?.id}
                        value={marketCenter?.id}
                      >
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 " />
                          {marketCenter?.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.marketCenter && (
                <p className="text-sm text-destructive">
                  {errors.marketCenter}
                </p>
              )}
            </fieldset>

            {/* Category */}
            <fieldset className="space-y-2" role="group">
              <Label className="text-md">Category </Label>
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(value)}
                disabled={isLoading || !marketCenters.length}
              >
                <SelectTrigger
                  className={errors.urgency ? "border-destructive" : ""}
                  disabled={isLoading || !marketCenters.length}
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
            </fieldset>

            {/* Urgency */}
            <fieldset className="space-y-2" role="group">
              <Label className="text-md">Urgency</Label>
              <Select
                value={urgency}
                onValueChange={(value: Urgency) => setUrgency(value)}
                disabled={isLoading || !marketCenters.length}
              >
                <SelectTrigger
                  className={errors.urgency ? "border-destructive" : ""}
                  disabled={isLoading || !marketCenters.length}
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
                Ticket Title *
              </Label>
            </div>
            <Input
              id="ticketTitle"
              value={ticketTitle}
              onChange={(e) => setTicketTitle(e.target.value)}
              placeholder="Default ticket title..."
              aria-invalid={!!errors.ticketTitle}
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
              disabled={isLoading}
              onChange={(value: string) => setTicketDescription(value)}
              placeholder="Default ticket description..."
            />

            {errors.ticketDescription && (
              <p className="text-sm text-destructive">
                {errors.ticketDescription}
              </p>
            )}
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
                onBlur={closeNewSubtaskTitle}
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
                disabled={
                  isLoading || !newSubtaskTitle || newSubtaskTitle.trim() === ""
                }
                aria-label="Create new subtask for ticket"
                onClick={handleCreateNewSubtask}
              >
                Add
              </Button>
              <Button
                type="reset"
                variant="outline"
                size={"sm"}
                disabled={
                  isLoading || !newSubtaskTitle || newSubtaskTitle.trim() === ""
                }
                aria-label="Reset new subtask input"
                className="bg-muted"
                onBlur={closeNewSubtaskTitle}
                onKeyDown={async (e) => {
                  e.preventDefault();
                  if (e.key === "Escape" || e.key === "Tab")
                    closeNewSubtaskTitle();
                }}
              >
                Reset
              </Button>
            </div>
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
                      id={`todo-${todo}`}
                      className={`shadow disabled:bg-primary/50`}
                      disabled={true}
                    />
                    <div
                      onClick={() => {
                        setEditingSubtask(todo);
                      }}
                      className={`flex-1 space-y-2 ${
                        isLoading
                          ? ""
                          : editingSubtask
                            ? "cursor-default"
                            : "hover:cursor-pointer hover:underline"
                      } py-2`}
                    >
                      {/* Not editing */}
                      {editingSubtask !== todo && (
                        <div className="flex items-center gap-2 flex-wrap w-full  md:flex-nowrap">
                          <div className="flex h-9 w-full min-w-0 rounded-md border border-input px-3 py-1 text-base shadow-xs md:text-sm">
                            <Label
                              htmlFor={`todo-${todo}`}
                              className={`text-md text-muted-foreground font-normal leading-relaxed `}
                              aria-label={`Subtask title: ${todo}. Click here to edit.`}
                            >
                              {todo}
                            </Label>
                          </div>
                          <div className="flex items-center justify-end gap-2 w-full md:w-fit md:flex-nowrap">
                            <Button
                              variant="outline"
                              size={"sm"}
                              disabled
                              aria-label="Save edited subtask title"
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
                              aria-label="Delete subtask from list"
                            >
                              Remove
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
                              type="text"
                              className={` h-8 ${errors?.editingSubtask ? "border-rose-500" : ""}`}
                              value={editingSubtask}
                              onChange={(e) =>
                                setEditingSubtask(e.target.value)
                              }
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
                              aria-label="Input to edit subtask title"
                              disabled={isLoading}
                            />
                            <div className="flex items-center justify-end gap-2 w-full md:w-fit md:flex-nowrap">
                              <Button
                                variant="outline"
                                size={"sm"}
                                onClick={() => {
                                  const existingTodoIndex = todos.findIndex(
                                    (todo) => todo === editingSubtask
                                  );
                                  if (
                                    existingTodoIndex !== -1 &&
                                    editingSubtask
                                  ) {
                                    const updatedTodos = [...todos];
                                    updatedTodos[existingTodoIndex] =
                                      editingSubtask;
                                    setTodos(updatedTodos);
                                    setEditingSubtask(null);
                                  } else {
                                    toast.error("Failed to update subtask");
                                  }
                                }}
                                disabled={
                                  isLoading ||
                                  !editingSubtask ||
                                  editingSubtask.trim() === ""
                                }
                                aria-label="Save edited subtask title"
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
                                disabled={isLoading}
                                aria-label="Delete subtask from list"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
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
                localStorage.removeItem("new-ticket-template");
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
              onClick={() => {
                localStorage.removeItem("new-ticket-template");
                handleClearTemplate();
                router.push(`/dashboard/ticket-templates`);
              }}
            >
              Done
            </AlertDialogAction>
            <AlertDialogAction
              className="text-white bg-[#6D1C24]  hover:bg-[#4B1D22]"
              onClick={() => {
                localStorage.removeItem("new-ticket-template");
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
