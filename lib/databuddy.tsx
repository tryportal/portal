"use client";

import { Databuddy, clear } from "@databuddy/sdk";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const DATABUDDY_CLIENT_ID = process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID;

function DatabuddySessionSync() {
  const { isSignedIn } = useAuth();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (wasSignedIn.current && !isSignedIn) {
      clear();
    }
    wasSignedIn.current = !!isSignedIn;
  }, [isSignedIn]);

  return null;
}

export function DatabuddyProvider({ children }: { children: React.ReactNode }) {
  if (!DATABUDDY_CLIENT_ID) {
    return <>{children}</>;
  }

  return (
    <>
      <Databuddy
        clientId={DATABUDDY_CLIENT_ID}
        trackHashChanges
        trackAttributes
        trackOutgoingLinks
        trackInteractions
        trackScrollDepth
        trackWebVitals
        trackErrors
      />
      <DatabuddySessionSync />
      {children}
    </>
  );
}

