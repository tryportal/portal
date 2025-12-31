"use client";

import { useWorkspaceData } from "@/components/workspace-context";
import { LoadingSpinner } from "@/components/loading-spinner";
import { usePageTitle } from "@/lib/use-page-title";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { membership, isLoading } = useWorkspaceData();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string | undefined;

  usePageTitle("Settings - Portal");

  useEffect(() => {
    if (!isLoading && slug) {
      // Redirect based on user role
      const isAdmin = membership?.role === "admin";
      const targetSection = isAdmin ? "workspace" : "customization";
      router.replace(`/w/${slug}/settings/${targetSection}`);
    }
  }, [isLoading, membership, slug, router]);

  // Show loading spinner while redirecting
  return <LoadingSpinner fullScreen />;
}
