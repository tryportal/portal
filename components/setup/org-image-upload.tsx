"use client";

import { useRef, useState } from "react";
import { Camera, X, Spinner } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface OrgImageUploadProps {
  currentImageUrl?: string | null;
  organizationName: string;
  onImageSelect: (file: File) => Promise<void>;
  onImageRemove: () => Promise<void>;
}

export function OrgImageUpload({
  currentImageUrl,
  organizationName,
  onImageSelect,
  onImageRemove,
}: OrgImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentImageUrl;
  const initials = organizationName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      await onImageSelect(file);
    } catch (error) {
      console.error("Failed to upload image:", error);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      await onImageRemove();
      setPreviewUrl(null);
    } catch (error) {
      console.error("Failed to remove image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div
          className={cn(
            "size-28 rounded-2xl overflow-hidden transition-all duration-200",
            "bg-primary/5",
            "flex items-center justify-center",
            "ring-2 ring-primary/10 ring-offset-2 ring-offset-background",
            isUploading && "opacity-60"
          )}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={organizationName}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-3xl font-semibold text-primary/70">
              {initials || "ORG"}
            </span>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Spinner className="size-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Upload overlay */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
            "rounded-2xl cursor-pointer",
            isUploading && "cursor-not-allowed"
          )}
        >
          <Camera className="size-8 text-white" weight="fill" />
        </button>

        {/* Remove button */}
        {displayUrl && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              "absolute -top-2 -right-2 size-7 rounded-full",
              "bg-destructive text-white",
              "flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-destructive/90"
            )}
          >
            <X className="size-4" weight="bold" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-primary/60 text-center">
        Click to upload organization logo
      </p>
    </div>
  );
}

