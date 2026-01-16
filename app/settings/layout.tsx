"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SettingsTopNav } from "@/components/preview/settings-top-nav";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [authLoaded, isSignedIn, router]);

  // Not signed in - show nothing (will redirect)
  if (!authLoaded || !isSignedIn) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Top Navigation */}
      <SettingsTopNav />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden px-2 sm:px-3">
        <div className="flex flex-1 overflow-hidden rounded-t-lg border border-border bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
