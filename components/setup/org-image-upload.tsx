"use client";

import { useRef, useState } from "react";
import { Camera, X, Spinner, UploadSimple, Image as ImageIcon } from "@phosphor-icons/react";
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
  const [isDragOver, setIsDragOver] = useState(false);
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
    processFile(file);
  };

  const processFile = async (file: File) => {
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

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div className="flex items-center gap-6">
       <div className="relative group shrink-0">
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "size-24 rounded-2xl overflow-hidden transition-all duration-300",
            "bg-gradient-to-br from-white to-[#F7F7F4]",
            "flex items-center justify-center",
            "border border-[#26251E]/10 shadow-sm",
            "cursor-pointer hover:border-[#26251E]/20 hover:shadow-md",
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
            <span className="text-2xl font-bold text-[#26251E]/80 tracking-tight">
              {initials || <ImageIcon className="size-8 text-[#26251E]/20" weight="duotone" />}
            </span>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <Spinner className="size-6 animate-spin text-[#26251E]" />
            </div>
          )}
        </div>

        {/* Hover overlay for upload icon */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#26251E]/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-200"
        >
           <Camera className="size-6 text-white" weight="fill" />
        </div>

        {/* Remove button */}
        {displayUrl && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              "absolute -top-1.5 -right-1.5 size-5 rounded-full",
              "bg-[#26251E] text-white shadow-sm border border-white",
              "flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-all duration-200",
              "hover:scale-110 hover:bg-red-600"
            )}
          >
            <X className="size-3" weight="bold" />
          </button>
        )}
      </div>

      <div 
        className={cn(
          "flex-1 h-24 rounded-xl border-2 border-dashed flex flex-col items-start justify-center px-6 transition-all duration-300 cursor-pointer",
          isDragOver 
            ? "border-[#26251E] bg-[#26251E]/5" 
            : "border-[#26251E]/10 hover:border-[#26251E]/30 hover:bg-white"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex items-center gap-2 text-[#26251E] font-medium mb-1">
          <UploadSimple className="size-4" />
          <span>Upload logo</span>
        </div>
        <p className="text-xs text-[#26251E]/40 leading-relaxed">
          Recommended size: 256x256px.<br/>
          JPG, PNG or GIF. Max 5MB.
        </p>
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
