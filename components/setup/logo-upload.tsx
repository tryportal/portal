"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
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
      <motion.div
        className="relative group shrink-0"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          onClick={() => fileInputRef.current?.click()}
          animate={{
            borderColor: isDragOver ? "var(--primary)" : "transparent",
            scale: isDragOver ? 1.05 : 1,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "size-20 rounded-xl overflow-hidden transition-all duration-200",
            "bg-muted flex items-center justify-center",
            "border-2 border-transparent",
            "cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 hover:ring-offset-background",
            isUploading && "opacity-60 pointer-events-none"
          )}
        >
          <AnimatePresence mode="wait">
            {displayUrl ? (
              <motion.img
                key="image"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                src={displayUrl}
                alt={organizationName}
                className="size-full object-cover"
              />
            ) : (
              <motion.span
                key="initials"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-xl font-semibold text-muted-foreground"
              >
                {initials || (
                  <ImageIcon className="size-8 text-muted-foreground/50" weight="duotone" />
                )}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Loading spinner */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
              >
                <Spinner className="size-6 animate-spin text-primary" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success indicator */}
          <AnimatePresence>
            {uploadSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center bg-green-500/90 backdrop-blur-sm"
              >
                <CheckCircle className="size-8 text-white" weight="fill" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Hover overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="size-6 text-primary-foreground" weight="fill" />
        </motion.div>

        {/* Remove button */}
        <AnimatePresence>
          {displayUrl && !isUploading && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleRemove}
              className={cn(
                "absolute -top-1.5 -right-1.5 size-6 rounded-full",
                "bg-destructive text-destructive-foreground",
                "flex items-center justify-center",
                "shadow-md",
                "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
              <X className="size-3.5" weight="bold" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Drop zone */}
      <motion.div
        animate={{
          borderColor: isDragOver ? "var(--primary)" : "var(--border)",
          backgroundColor: isDragOver ? "var(--primary)" : "transparent",
          scale: isDragOver ? 1.02 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "flex-1 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 px-4 cursor-pointer",
          "hover:border-primary/40 hover:bg-muted/30 transition-colors"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <motion.div
          animate={{
            y: isDragOver ? -2 : 0,
            color: isDragOver ? "var(--primary-foreground)" : "var(--muted-foreground)",
          }}
          className="flex items-center gap-2"
        >
          <UploadSimple
            className={cn("size-5", isDragOver && "text-primary-foreground")}
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
        </motion.div>
        <span
          className={cn(
            "text-xs",
            isDragOver ? "text-primary-foreground/70" : "text-muted-foreground/60"
          )}
        >
          or click to browse
        </span>
      </motion.div>

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
