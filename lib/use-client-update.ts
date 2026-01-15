"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_INTERVAL = 30000; // 30 seconds

export function useClientUpdate() {
  const initialBuildId = useRef<string | null>(null);
  const hasShownToast = useRef(false);

  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // Fetch initial build ID
    const fetchBuildId = async () => {
      try {
        const response = await fetch("/api/version");
        const data = await response.json();
        return data.buildId;
      } catch (error) {
        console.error("Failed to fetch build ID:", error);
        return null;
      }
    };

    // Initialize with current build ID
    const initialize = async () => {
      const buildId = await fetchBuildId();
      if (buildId) {
        initialBuildId.current = buildId;
      }
    };

    initialize();

    // Poll for updates
    const interval = setInterval(async () => {
      const currentBuildId = await fetchBuildId();

      if (
        currentBuildId &&
        initialBuildId.current &&
        currentBuildId !== initialBuildId.current &&
        !hasShownToast.current
      ) {
        hasShownToast.current = true;

        toast("New Update Available", {
          description: "A new version of the app is available. Please refresh to get the latest updates.",
          duration: Infinity,
          action: {
            label: "Refresh",
            onClick: () => window.location.reload(),
          },
        });
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}
