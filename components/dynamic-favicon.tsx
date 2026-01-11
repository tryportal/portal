"use client";

import { useEffect } from "react";
import { useTheme } from "@/lib/theme-provider";

/**
 * DynamicFavicon switches the favicon based on the current theme.
 * - Light theme: uses portal.svg (dark icon for light backgrounds)
 * - Dark theme: uses portal-dark.svg (light icon for dark backgrounds)
 */
export function DynamicFavicon() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = resolvedTheme === "dark" ? "/portal-dark.svg" : "/portal.svg";
    }
  }, [resolvedTheme]);

  return null;
}
