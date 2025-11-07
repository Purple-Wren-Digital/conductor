"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Trash2,
  ImageIcon,
  FileText,
  File,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { API_BASE } from "@/lib/api/utils";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Attachment } from "@/lib/types";

interface AttachmentsListProps {
  ticketId: string;
  attachments?: Attachment[];
  canDelete?: boolean;
  onAttachmentDeleted?: (attachmentId: string) => void;
  onAttachmentAdded?: () => void;
}

export function AttachmentsList({
  ticketId,
  attachments: initialAttachments = [],
  canDelete = false,
  onAttachmentDeleted,
  onAttachmentAdded,
}: AttachmentsListProps) {
  const [attachments, setAttachments] =
    useState<Attachment[]>(initialAttachments);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    setAttachments(initialAttachments);
  }, [initialAttachments]);

  const fetchAttachments = async () => {
    const authToken = await getToken();
    if (!authToken) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/attachments/ticket/${ticketId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch attachments");
      }

      const data = await response.json();
      setAttachments(data.attachments || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      toast.error("Failed to load attachments");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachmentId: string, fileName: string) => {
    const authToken = await getToken();
    if (!authToken) return;

    setDownloadingId(attachmentId);
    try {
      const response = await fetch(
        `${API_BASE}/attachments/${attachmentId}/download-url`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }

      const data = await response.json();

      // Create a temporary anchor element to trigger download
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success(`Downloading ${fileName}`);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download file");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    const authToken = await getToken();
    if (!authToken) return;

    setDeletingId(attachmentId);
    try {
      const response = await fetch(`${API_BASE}/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete attachment");
      }

      // Remove from local state
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));

      toast.success("Attachment deleted");

      // Call callback if provided
      if (onAttachmentDeleted) {
        onAttachmentDeleted(attachmentId);
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Failed to delete attachment");
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (mimeType.includes("pdf")) {
      return <FileText className="h-4 w-4" />;
    }
    if (
      mimeType.includes("word") ||
      mimeType.includes("document") ||
      mimeType.includes("text")
    ) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (attachments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center text-muted-foreground p-6">
          No attachments yet
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Attachments ({attachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getFileIcon(attachment.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)} • Uploaded by{" "}
                    {attachment.uploaderName} •{" "}
                    {format(new Date(attachment.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    handleDownload(attachment.id, attachment.fileName)
                  }
                  disabled={downloadingId === attachment.id}
                >
                  {downloadingId === attachment.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmId(attachment.id)}
                    disabled={deletingId === attachment.id}
                  >
                    {deletingId === attachment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
