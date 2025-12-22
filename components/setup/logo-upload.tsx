"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Camera, X, Spinner, UploadSimple, Image as ImageIcon } from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  organizationName: string;
  onLogoUploaded: (storageId: Id<"_storage">) => void;
  onLogoRemoved: () => void;
}

export function LogoUpload({
  currentLogoUrl,
  organizationName,
  onLogoUploaded,
  onLogoRemoved,
}: LogoUploadProps) {
  const generateUploadUrl = useMutation(api.organizations.generateUploadUrl);
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentLogoUrl;
  const initials = organizationName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    // Validate file
    if (!file.type.startsWith("image/")) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Convex storage
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await response.json();
      onLogoUploaded(storageId as Id<"_storage">);
    } catch (error) {
      console.error("Failed to upload logo:", error);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onLogoRemoved();
  };

  return (
    <div className="flex items-center gap-4">
      {/* Logo preview */}
      <div className="relative group shrink-0">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "size-16 rounded-xl overflow-hidden transition-all duration-200",
            "bg-primary/5 flex items-center justify-center",
            "border border-primary/10",
            "cursor-pointer hover:border-primary/20",
            isUploading && "opacity-60 pointer-events-none"
          )}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={organizationName}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold text-primary/60">
              {initials || <ImageIcon className="size-6 text-primary/30" weight="duotone" />}
            </span>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Spinner className="size-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="size-5 text-primary-foreground" weight="fill" />
        </div>

        {/* Remove button */}
        {displayUrl && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              "absolute -top-1 -right-1 size-5 rounded-full",
              "bg-primary text-primary-foreground",
              "flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-destructive"
            )}
          >
            <X className="size-3" weight="bold" />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "flex-1 h-16 rounded-lg border border-dashed flex items-center justify-center px-4 transition-colors cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-primary/10 hover:border-primary/20"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex items-center gap-2 text-xs text-primary/50">
          <UploadSimple className="size-4" />
          <span>Drop image or click to upload</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
