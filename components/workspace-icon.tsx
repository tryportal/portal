import Image from "next/image";
import { Facehash } from "facehash";

interface WorkspaceIconProps {
  logoUrl: string | null | undefined;
  name: string;
  slug: string;
  /** Pixel size of the icon (used for both width/height) */
  size: number;
}

/**
 * Optimized workspace icon using next/image for remote URLs.
 * Falls back to Facehash when no logo is set.
 * For local blob URLs (upload previews), falls back to a native img tag.
 */
export function WorkspaceIcon({
  logoUrl,
  name,
  slug,
  size,
}: WorkspaceIconProps) {
  if (!logoUrl) {
    return (
      <Facehash
        name={slug}
        size={size}
        interactive={false}
        showInitial={false}
      />
    );
  }

  // Blob URLs (from upload previews) can't go through next/image optimization
  if (logoUrl.startsWith("blob:")) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={name}
      width={size}
      height={size}
      className="object-cover"
      style={{ width: size, height: size }}
      unoptimized={false}
    />
  );
}
