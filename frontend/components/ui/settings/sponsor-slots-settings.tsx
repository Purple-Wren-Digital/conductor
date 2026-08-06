"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Megaphone,
  Loader2,
  AlertCircle,
  Upload,
  ImageOff,
  Eye,
  Bell,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useSponsorSlots,
  useUpdateSponsorSlots,
  useUploadSponsorAsset,
  type SponsorSlotKey,
  type SponsorSlots,
} from "@/hooks/use-sponsor-slots";
import { toast } from "sonner";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import type { MarketCenter } from "@/lib/types";
import type { SponsorDisplaySlot } from "@/hooks/use-sponsor-display";
import { SponsorHeaderBadgeView } from "@/components/ui/sponsors/sponsor-header-badge";
import { SponsorDashboardCardView } from "@/components/ui/sponsors/sponsor-dashboard-card";
import { SponsoredTicketRowView } from "@/components/ui/sponsors/sponsored-ticket-row";
// Same header wordmark asset used by the real app chrome (app/dashboard/layout.tsx).
import conductorHorizontalLogoWhite from "@/app/(landing)/assets/conductor/Conductor Horizontal_White.png";

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE_MB = 5;
const HTTP_URL_PATTERN = /^https?:\/\//i;

const SLOT_DEFINITIONS: {
  key: SponsorSlotKey;
  title: string;
  description: string;
}[] = [
  {
    key: "header",
    title: "Header Logo",
    description: "Displayed as the vendor logo in the app header.",
  },
  {
    key: "dashboardCard",
    title: "Dashboard Card",
    description: "Shown as the 5th card on the dashboard.",
  },
  {
    key: "ticketListRow",
    title: "Ticket List Ad",
    description: "Displayed inline within the ticket list.",
  },
];

// =============================================================================
// FORM SCHEMA
// =============================================================================

const sponsorSlotFieldSchema = z.object({
  enabled: z.boolean(),
  name: z.string().max(100, "Vendor name cannot exceed 100 characters"),
  linkUrl: z.string(),
});

const sponsorSlotsFormSchema = z.object({
  header: sponsorSlotFieldSchema,
  dashboardCard: sponsorSlotFieldSchema,
  ticketListRow: sponsorSlotFieldSchema,
});

type SponsorSlotsFormData = z.infer<typeof sponsorSlotsFormSchema>;

const emptySlotValues = { enabled: false, name: "", linkUrl: "" };

// =============================================================================
// PREVIEW MOCK DATA
//
// Static, made-up content used purely to give the preview dialogs realistic
// surrounding context (mirrors the shapes/classes used by the real dashboard
// and ticket list — see components/dashboard/admin-dashboard.tsx and
// components/ui/tables/ticket-list-table.tsx — without importing from them).
// =============================================================================

const MOCK_DASHBOARD_STATS: {
  title: string;
  value: number;
  caption: string;
}[] = [
  {
    title: "Active Tickets",
    value: 135,
    caption: "18 high priority • 6 unassigned",
  },
  { title: "New Tickets", value: 4, caption: "in the last 7 days" },
  { title: "Overdue Tickets", value: 12, caption: "across all tickets" },
  { title: "Resolved Tickets", value: 28, caption: "in the last 7 days" },
];

const MOCK_TICKET_ROWS: {
  title: string;
  createdOn: string;
  assignee: string;
  status: NonNullable<BadgeProps["variant"]>;
  statusLabel: string;
  urgency: NonNullable<BadgeProps["variant"]>;
  category: string;
}[] = [
  {
    title: "AC not cooling in unit 204",
    createdOn: "3/12/2026",
    assignee: "Jordan Lee",
    status: "in_progress",
    statusLabel: "in progress",
    urgency: "high",
    category: "Maintenance",
  },
  {
    title: "Leasing paperwork missing signature",
    createdOn: "3/11/2026",
    assignee: "Unassigned",
    status: "unassigned",
    statusLabel: "unassigned",
    urgency: "medium",
    category: "Leasing",
  },
  {
    title: "Noise complaint — unit 118",
    createdOn: "3/10/2026",
    assignee: "Priya Shah",
    status: "assigned",
    statusLabel: "assigned",
    urgency: "low",
    category: "General",
  },
  {
    title: "Water heater replacement request",
    createdOn: "3/9/2026",
    assignee: "Jordan Lee",
    status: "awaiting_response",
    statusLabel: "awaiting response",
    urgency: "medium",
    category: "Maintenance",
  },
  {
    title: "Parking permit renewal",
    createdOn: "3/8/2026",
    assignee: "Priya Shah",
    status: "resolved",
    statusLabel: "resolved",
    urgency: "low",
    category: "General",
  },
];

const MOCK_TICKET_TABLE_COL_SPAN = 6;

// =============================================================================
// HELPERS
// =============================================================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SponsorSlotsSettings() {
  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("");
  const [imageState, setImageState] = useState<
    Record<SponsorSlotKey, { imageKey?: string; imageUrl?: string }>
  >({
    header: {},
    dashboardCard: {},
    ticketListRow: {},
  });
  const [uploadingSlot, setUploadingSlot] = useState<SponsorSlotKey | null>(
    null
  );

  const { currentUser } = useStore();
  const { role } = useUserRole();

  const { data: marketCentersData, isLoading: isLoadingMarketCenters } =
    useFetchAllMarketCenters(role);

  const marketCenters: MarketCenter[] = useMemo(
    () => marketCentersData?.marketCenters ?? [],
    [marketCentersData]
  );

  const selectedMarketCenterName = useMemo(
    () => marketCenters.find((mc) => mc.id === selectedMarketCenterId)?.name,
    [marketCenters, selectedMarketCenterId]
  );

  // Default to the user's own market center (they can still switch via the
  // selector) — with nothing selected every control below is disabled.
  useEffect(() => {
    if (!currentUser?.marketCenterId) return;
    setSelectedMarketCenterId((prev) => prev || currentUser.marketCenterId!);
  }, [currentUser?.marketCenterId]);

  const {
    data: sponsorSlotsData,
    isLoading,
    error,
  } = useSponsorSlots(selectedMarketCenterId || undefined);

  const updateSponsorSlots = useUpdateSponsorSlots();
  const uploadSponsorAsset = useUploadSponsorAsset();

  const form = useForm<SponsorSlotsFormData>({
    resolver: zodResolver(sponsorSlotsFormSchema),
    defaultValues: {
      header: emptySlotValues,
      dashboardCard: emptySlotValues,
      ticketListRow: emptySlotValues,
    },
  });

  // Update form + image state when data loads
  useEffect(() => {
    if (!sponsorSlotsData?.sponsorSlots) return;
    const slots = sponsorSlotsData.sponsorSlots;

    form.reset({
      header: {
        enabled: slots.header?.enabled ?? false,
        name: slots.header?.name ?? "",
        linkUrl: slots.header?.linkUrl ?? "",
      },
      dashboardCard: {
        enabled: slots.dashboardCard?.enabled ?? false,
        name: slots.dashboardCard?.name ?? "",
        linkUrl: slots.dashboardCard?.linkUrl ?? "",
      },
      ticketListRow: {
        enabled: slots.ticketListRow?.enabled ?? false,
        name: slots.ticketListRow?.name ?? "",
        linkUrl: slots.ticketListRow?.linkUrl ?? "",
      },
    });

    setImageState({
      header: {
        imageKey: slots.header?.imageKey,
        imageUrl: slots.header?.imageUrl,
      },
      dashboardCard: {
        imageKey: slots.dashboardCard?.imageKey,
        imageUrl: slots.dashboardCard?.imageUrl,
      },
      ticketListRow: {
        imageKey: slots.ticketListRow?.imageKey,
        imageUrl: slots.ticketListRow?.imageUrl,
      },
    });
  }, [sponsorSlotsData, form]);

  const handleFileSelected = async (slot: SponsorSlotKey, file: File) => {
    if (!selectedMarketCenterId) {
      toast.error("Market center not found");
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Only PNG, JPEG, WebP, or GIF images are allowed");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be ${MAX_FILE_SIZE_MB}MB or smaller`);
      return;
    }

    setUploadingSlot(slot);
    try {
      const base64 = await fileToBase64(file);
      const content = base64.includes(",") ? base64.split(",")[1] : base64;

      const result = await uploadSponsorAsset.mutateAsync({
        marketCenterId: selectedMarketCenterId,
        slot,
        fileName: file.name,
        mimeType: file.type,
        content,
      });

      setImageState((prev) => ({
        ...prev,
        [slot]: { imageKey: result.imageKey, imageUrl: result.imageUrl },
      }));
      toast.success("Image uploaded successfully");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingSlot(null);
    }
  };

  const onSubmit = async (data: SponsorSlotsFormData) => {
    if (!selectedMarketCenterId) {
      toast.error("Market center not found");
      return;
    }

    // Validate link URLs client-side before saving (mirrors the backend rule
    // that linkUrl must start with http(s)).
    let hasInvalidUrl = false;
    for (const { key } of SLOT_DEFINITIONS) {
      const linkUrl = data[key].linkUrl;
      if (linkUrl && !HTTP_URL_PATTERN.test(linkUrl)) {
        form.setError(`${key}.linkUrl`, {
          type: "manual",
          message: "Link URL must start with http:// or https://",
        });
        hasInvalidUrl = true;
      }
    }
    if (hasInvalidUrl) {
      return;
    }

    const sponsorSlots: SponsorSlots = {};
    for (const { key } of SLOT_DEFINITIONS) {
      const values = data[key];
      sponsorSlots[key] = {
        enabled: values.enabled,
        name: values.name || undefined,
        linkUrl: values.linkUrl || undefined,
        imageKey: imageState[key]?.imageKey,
      };
    }

    try {
      await updateSponsorSlots.mutateAsync({
        marketCenterId: selectedMarketCenterId,
        sponsorSlots,
      });
      toast.success("Sponsor settings updated successfully");
    } catch {
      toast.error("Failed to update sponsor settings");
    }
  };

  // Only STAFF_LEADER and ADMIN can access this setting
  const canAccess = role === "STAFF_LEADER" || role === "ADMIN";

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Sponsors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to view or modify sponsor settings.
              Only Staff Leaders and Administrators can access this feature.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Sponsors
          </CardTitle>
          <CardDescription className="md:max-w-[75%]">
            Manage vendor-sponsor ads shown in the app header, dashboard, and
            ticket list.
          </CardDescription>
        </div>
        {/* Market Center Selector */}
        <div className="w-full sm:w-64">
          <Select
            value={selectedMarketCenterId}
            onValueChange={setSelectedMarketCenterId}
            disabled={isLoadingMarketCenters || isLoading}
          >
            <SelectTrigger role="combobox" aria-label="Select Market Center">
              <SelectValue placeholder="Select Market Center" />
            </SelectTrigger>
            <SelectContent>
              {marketCenters.map((mc) => (
                <SelectItem key={mc.id} value={mc.id}>
                  {mc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                Loading sponsor settings...
              </div>
            )}

            {error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load sponsor settings. Please try again later.
                </AlertDescription>
              </Alert>
            )}

            {!isLoading && !selectedMarketCenterId && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Select a market center above to manage its sponsors.
                </AlertDescription>
              </Alert>
            )}

            {!isLoading &&
              SLOT_DEFINITIONS.map(({ key, title, description }) => (
                <SponsorSlotSection
                  key={key}
                  slotKey={key}
                  title={title}
                  description={description}
                  form={form}
                  imageUrl={imageState[key]?.imageUrl}
                  hasImage={!!imageState[key]?.imageKey}
                  isUploading={uploadingSlot === key}
                  disabled={
                    updateSponsorSlots.isPending || !selectedMarketCenterId
                  }
                  onFileSelected={(file) => handleFileSelected(key, file)}
                  marketCenterName={selectedMarketCenterName}
                />
              ))}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  updateSponsorSlots.isPending ||
                  !selectedMarketCenterId
                }
                aria-label="Save sponsor settings"
              >
                {updateSponsorSlots.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SponsorSlotSection
// =============================================================================

interface SponsorSlotSectionProps {
  slotKey: SponsorSlotKey;
  title: string;
  description: string;
  form: UseFormReturn<SponsorSlotsFormData>;
  imageUrl?: string;
  hasImage: boolean;
  isUploading: boolean;
  disabled: boolean;
  onFileSelected: (file: File) => void;
  marketCenterName?: string;
}

function SponsorSlotSection({
  slotKey,
  title,
  description,
  form,
  imageUrl,
  hasImage,
  isUploading,
  disabled,
  onFileSelected,
  marketCenterName,
}: SponsorSlotSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };

  // Live preview data — reflects the current unsaved form/image state so
  // leaders can see the placement before saving.
  const watchedName = form.watch(`${slotKey}.name`);
  const watchedLinkUrl = form.watch(`${slotKey}.linkUrl`);

  const previewSlot: SponsorDisplaySlot | null = imageUrl
    ? {
        slot: slotKey,
        name: watchedName || undefined,
        imageUrl,
        linkUrl: watchedLinkUrl || undefined,
      }
    : null;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-base font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          <div
            className={`flex h-32 items-center justify-center overflow-hidden rounded-md border ${
              slotKey === "header" ? "bg-[#6D1C24]" : "bg-muted"
            }`}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={`${title} preview`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                <ImageOff className="h-6 w-6" />
                No image uploaded
              </div>
            )}
          </div>

          <div
            className={`relative rounded-lg border-2 border-dashed p-3 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_MIME_TYPES.join(",")}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={disabled || isUploading}
              aria-label={`Upload image for ${title}`}
            />
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </div>
            ) : (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm font-semibold"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
              >
                <Upload className="mr-1 h-4 w-4" />
                Click to upload
              </Button>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPEG, WebP, or GIF. Max {MAX_FILE_SIZE_MB}MB.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!imageUrl}
            onClick={() => setIsPreviewOpen(true)}
            aria-label={`Preview ${title}`}
          >
            <Eye className="mr-1 h-4 w-4" />
            Preview
          </Button>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name={`${slotKey}.name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    maxLength={100}
                    placeholder="Vendor name"
                    aria-label={`${title} vendor name`}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${slotKey}.linkUrl`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://…"
                    aria-label={`${title} link URL`}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${slotKey}.enabled`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm">Enabled</FormLabel>
                  {!hasImage && (
                    <FormDescription>Upload an image first</FormDescription>
                  )}
                </div>
                <FormControl>
                  {hasImage ? (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={`Enable ${title}`}
                      disabled={disabled}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Switch
                            checked={false}
                            disabled
                            aria-label={`Enable ${title}`}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Upload an image first</TooltipContent>
                    </Tooltip>
                  )}
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title} Preview</DialogTitle>
            <DialogDescription>
              Preview — how this will appear to agents in{" "}
              {marketCenterName ?? "your market center"}.
            </DialogDescription>
          </DialogHeader>
          <div className="pointer-events-none select-none">
            {previewSlot ? (
              <SponsorSlotPreview slotKey={slotKey} slot={previewSlot} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Upload an image to preview this placement.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// SponsorSlotPreview — per-slot "in context" replica of the page the
// placement appears on, rendered from unsaved form/image state.
// =============================================================================

function SponsorSlotPreview({
  slotKey,
  slot,
}: {
  slotKey: SponsorSlotKey;
  slot: SponsorDisplaySlot;
}) {
  switch (slotKey) {
    case "header":
      return <HeaderSlotPreview slot={slot} />;
    case "dashboardCard":
      return <DashboardCardSlotPreview slot={slot} />;
    case "ticketListRow":
      return <TicketListRowSlotPreview slot={slot} />;
    default:
      return null;
  }
}

// Replica of the app header bar (see app/dashboard/layout.tsx) — same
// burgundy background, wordmark asset, and badge position, with a mocked
// notifications/avatar cluster standing in for the real ones.
function HeaderSlotPreview({ slot }: { slot: SponsorDisplaySlot }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-md bg-[#6D1C24] px-4 py-2">
      <div className="flex grow items-center justify-between">
        <Image
          src={conductorHorizontalLogoWhite}
          alt="Conductor — Agent Ticketing System"
          width={106}
          height={40}
          className="h-10 w-auto"
        />

        <SponsorHeaderBadgeView slot={slot} alwaysVisible />

        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-muted" />
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px] font-medium">
              A
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}

// Replica of the dashboard's top stats row (see
// components/dashboard/admin-dashboard.tsx) with static mock figures.
function DashboardCardSlotPreview({ slot }: { slot: SponsorDisplaySlot }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {MOCK_DASHBOARD_STATS.map((stat) => (
        <Card key={stat.title}>
          <CardHeader>
            <CardTitle className="text-center font-medium">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-bold">{stat.value}</p>
            <p className="text-center text-xs text-muted-foreground">
              {stat.caption}
            </p>
          </CardContent>
        </Card>
      ))}
      <SponsorDashboardCardView slot={slot} />
    </div>
  );
}

// Replica of the ticket list table (see
// components/ui/tables/ticket-list-table.tsx) with static mock rows — the
// row internals are mimicked here rather than imported.
function TicketListRowSlotPreview({ slot }: { slot: SponsorDisplaySlot }) {
  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="text-black">Ticket</TableHead>
          <TableHead className="text-black">Assignee</TableHead>
          <TableHead className="text-black text-center">Status</TableHead>
          <TableHead className="text-black text-center">Urgency</TableHead>
          <TableHead className="text-black text-center">Category</TableHead>
          <TableHead className="text-black text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {MOCK_TICKET_ROWS.flatMap((ticket, index) => {
          const row = (
            <TableRow key={ticket.title}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{ticket.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {`Created on  ${ticket.createdOn}`}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{ticket.assignee}</TableCell>
              <TableCell className="text-center">
                <Badge variant={ticket.status}>{ticket.statusLabel}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={ticket.urgency}>{ticket.urgency}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="category">{ticket.category}</Badge>
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                —
              </TableCell>
            </TableRow>
          );

          // Mirrors the real list's insertion point: after the 3rd row.
          return index === 2
            ? [
                row,
                <SponsoredTicketRowView
                  key="sponsored-preview-row"
                  slot={slot}
                  colSpan={MOCK_TICKET_TABLE_COL_SPAN}
                />,
              ]
            : [row];
        })}
      </TableBody>
    </Table>
  );
}
