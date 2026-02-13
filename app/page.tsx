"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/components/navbar";

export default function Page() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const firstWorkspace = useQuery(
    api.organizations.getUserFirstWorkspace,
    isSignedIn ? {} : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (firstWorkspace === undefined) return;

    if (firstWorkspace) {
      router.replace(`/w/${firstWorkspace.slug}`);
    } else {
      router.replace("/onboarding");
    }
  }, [isLoaded, isSignedIn, firstWorkspace, router]);

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
    </div>
  );
}
