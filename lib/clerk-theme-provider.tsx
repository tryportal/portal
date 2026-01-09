"use client";

import { ClerkProvider as BaseClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "@/lib/theme-provider";

interface ClerkThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper that provides Clerk components with proper theme support.
 * Uses Clerk's official dark theme from @clerk/themes package.
 */
export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  const { resolvedTheme } = useTheme();

  return (
    <BaseClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
      }}
    >
      {children}
    </BaseClerkProvider>
  );
}
