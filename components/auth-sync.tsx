"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export function AuthSync() {
  const { isSignedIn } = useUser();
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    if (isSignedIn) {
      syncUser();
    }
  }, [isSignedIn, syncUser]);

  return null;
}
