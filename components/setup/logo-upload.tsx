"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  X,
  Spinner,
  UploadSimple,
  Image as ImageIcon,
  CheckCircle,
} from "@phosphor-icons/react";
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
  const [uploadSuccess, setUploadSuccess] = useState(false);
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
    setUploadSuccess(false);
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
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
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
            "size-20 rounded-xl overflow-hidden transition-all duration-150",
            "bg-muted flex items-center justify-center",
            "border-2",
            isDragOver ? "border-primary scale-[1.02]" : "border-transparent",
            "cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 hover:ring-offset-background",
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
            <span className="text-xl font-semibold text-muted-foreground">
              {initials || (
                <ImageIcon className="size-8 text-muted-foreground/50" weight="duotone" />
              )}
            </span>
          )}

          {/* Loading spinner */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <Spinner className="size-6 animate-spin text-primary" />
            </div>
          )}

          {/* Success indicator */}
          <AnimatePresence>
            {uploadSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-green-500/90 backdrop-blur-sm"
              >
                <CheckCircle className="size-8 text-white" weight="fill" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hover overlay */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
        >
          <Camera className="size-6 text-primary-foreground" weight="fill" />
        </div>

        {/* Remove button */}
        {displayUrl && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              "absolute -top-1.5 -right-1.5 size-6 rounded-full",
              "bg-destructive text-destructive-foreground",
              "flex items-center justify-center",
              "shadow-md",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            )}
          >
            <X className="size-3.5" weight="bold" />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "flex-1 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 px-4 cursor-pointer",
          "transition-all duration-150",
          isDragOver
            ? "border-primary bg-primary scale-[1.01]"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex items-center gap-2">
          <UploadSimple
            className={cn("size-5", isDragOver ? "text-primary-foreground" : "text-muted-foreground")}
            weight={isDragOver ? "fill" : "regular"}
          />
          <span
            className={cn(
              "text-sm font-medium",
              isDragOver ? "text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {isDragOver ? "Drop to upload" : "Drop image here"}
          </span>
        </div>
        <span
          className={cn(
            "text-xs",
            isDragOver ? "text-primary-foreground/70" : "text-muted-foreground/60"
          )}
        >
          or click to browse
        </span>
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
