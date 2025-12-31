"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * UserSync component - syncs Clerk user data to Convex
 * 
 * This component should be placed high in the component tree (e.g., in a layout)
 * after ConvexClientProvider. It automatically syncs the current user's profile
 * data from Clerk to Convex whenever:
 * - The user signs in
 * - The user's Clerk profile is updated
 * 
 * This ensures Convex always has up-to-date user data for fast queries.
 */
export function UserSync({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const existingUser = useQuery(
    api.users.getUser,
    isSignedIn && user?.id ? { clerkId: user.id } : "skip"
  );
  
  const lastSyncedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Only sync if:
    // 1. Clerk is loaded and user is signed in
    // 2. We have user data
    // 3. We haven't already synced this exact user data
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      return;
    }

    // Create a hash of the current user data to detect changes
    const currentDataHash = JSON.stringify({
      id: user.id,
      email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    });

    // Skip if we've already synced this exact data
    if (lastSyncedRef.current === currentDataHash) {
      return;
    }

    // Check if we need to sync (user doesn't exist or data has changed)
    const needsSync = !existingUser || 
      existingUser.email !== email ||
      existingUser.firstName !== user.firstName ||
      existingUser.lastName !== user.lastName ||
      existingUser.imageUrl !== user.imageUrl;

    if (needsSync) {
      upsertUser({
        clerkId: user.id,
        email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        imageUrl: user.imageUrl ?? undefined,
      })
        .then(() => {
          lastSyncedRef.current = currentDataHash;
        })
        .catch((error) => {
          console.error("Failed to sync user to Convex:", error);
        });
    } else {
      // Data is already in sync
      lastSyncedRef.current = currentDataHash;
    }
  }, [isLoaded, isSignedIn, user, existingUser, upsertUser]);

  return <>{children}</>;
}

/**
 * Hook to ensure current user is synced to Convex
 * Use this in components that need to ensure user data is available
 */
export function useEnsureUserSynced() {
  const { user, isLoaded, isSignedIn } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const syncUser = React.useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) {
      return false;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      setError("No email address found");
      return false;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await upsertUser({
        clerkId: user.id,
        email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        imageUrl: user.imageUrl ?? undefined,
      });
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isLoaded, isSignedIn, user, upsertUser]);

  return { syncUser, isSyncing, error };
}
