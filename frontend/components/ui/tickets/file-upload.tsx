"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { API_BASE } from "@/lib/api/utils";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

interface FileUploadProps {
  ticketId: string;
  onUploadComplete?: (attachment: any) => void;
  maxFileSize?: number; // in MB
  acceptedFileTypes?: string[];
}

const DEFAULT_MAX_FILE_SIZE = 10; // 10MB
const DEFAULT_ACCEPTED_FILE_TYPES = [
  "image/*",
  "application/pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
];

export function FileUpload({
  ticketId,
  onUploadComplete,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedFileTypes = DEFAULT_ACCEPTED_FILE_TYPES,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(
    new Map()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [ticketId]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      handleFiles(files);
    },
    [ticketId]
  );

  const handleFiles = async (files: File[]) => {
    const authToken = await getToken();
    if (!authToken) {
      toast.error("You must be logged in to upload files");
      return;
    }

    for (const file of files) {
      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${maxFileSize}MB size limit`);
        continue;
      }

      // Start upload
      const uploadId = `${file.name}-${Date.now()}`;
      setUploadingFiles((prev) => new Map(prev).set(uploadId, 0));

      try {
        // Convert file to base64
        const base64 = await fileToBase64(file);

        const response = await fetch(`${API_BASE}/attachments/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            ticketId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            content: base64.split(",")[1], // Remove data:type/subtype;base64, prefix
          }),
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const data = await response.json();

        // Remove from uploading list
        setUploadingFiles((prev) => {
          const newMap = new Map(prev);
          newMap.delete(uploadId);
          return newMap;
        });

        toast.success(`${file.name} uploaded successfully`);

        // Call callback if provided
        if (onUploadComplete) {
          onUploadComplete(data.attachment);
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);

        // Remove from uploading list
        setUploadingFiles((prev) => {
          const newMap = new Map(prev);
          newMap.delete(uploadId);
          return newMap;
        });
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
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
            multiple
            accept={acceptedFileTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm">
              <Button
                variant="link"
                className="p-0 h-auto font-semibold"
                onClick={() => fileInputRef.current?.click()}
              >
                Click to upload
              </Button>{" "}
              or drag and drop
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum file size: {maxFileSize}MB
            </p>
          </div>
        </div>

        {/* Upload progress indicators */}
        {uploadingFiles.size > 0 && (
          <div className="mt-4 space-y-2">
            {Array.from(uploadingFiles.entries()).map(([id, progress]) => (
              <div key={id} className="flex items-center space-x-2">
                <FileIcon className="h-4 w-4" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      {id.substring(0, id.lastIndexOf("-"))}
                    </span>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                  <Progress value={progress} className="h-1 mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}