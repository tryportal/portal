"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "@/lib/theme-provider";

interface ClerkThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Updates Clerk appearance based on current theme.
 * Works with the ClerkProvider already at the root level in app/layout.tsx
 */
export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  const { resolvedTheme } = useTheme();
  const clerk = useClerk();

  useEffect(() => {
    if (clerk) {
      clerk.updateClerkOptions?.({
        appearance: {
          baseTheme: resolvedTheme === "dark" ? dark : undefined,
        },
      });
    }
  }, [resolvedTheme, clerk]);

  return <>{children}</>;
}
