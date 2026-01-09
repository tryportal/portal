"use client";

import { ReactNode } from "react";

interface ClerkThemeProviderProps {
  children: ReactNode;
}

/**
 * Placeholder component for Clerk theme updates.
 * Theme is now handled via ClerkProvider appearance prop in layout.tsx
 */
export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  return <>{children}</>;
}
