"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = "https://us.i.posthog.com";

// Initialize PostHog only once
if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  });
}

function PostHogUserSync() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const ph = usePostHog();
  const identifiedRef = useRef(false);

  useEffect(() => {
    if (!ph) return;

    if (isSignedIn && userId && user && !identifiedRef.current) {
      ph.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
      });
      identifiedRef.current = true;
    } else if (!isSignedIn && identifiedRef.current) {
      ph.reset();
      identifiedRef.current = false;
    }
  }, [ph, isSignedIn, userId, user]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogUserSync />
      {children}
    </PHProvider>
  );
}

// Re-export for use in components
export { usePostHog };
