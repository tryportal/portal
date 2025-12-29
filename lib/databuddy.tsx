"use client";

import { Databuddy } from "@databuddy/sdk";

const DATABUDDY_CLIENT_ID = process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID;

export function DatabuddyProvider({ children }: { children: React.ReactNode }) {
  // Only render Databuddy if client ID is configured
  if (!DATABUDDY_CLIENT_ID) {
    return <>{children}</>;
  }

  return (
    <>
      <Databuddy 
        clientId={DATABUDDY_CLIENT_ID}
        // Minimal configuration: only automatic page views
        // No custom event tracking (PostHog handles that)
        // No additional tracking features enabled
      />
      {children}
    </>
  );
}

