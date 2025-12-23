"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { WorkspaceSettingsPage } from "@/components/preview/workspace-settings-page";
import { Spinner } from "@phosphor-icons/react";
import * as React from "react";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const router = useRouter();
  const [slug, setSlug] = useState<string>("");

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setSlug(resolved.slug));
    } else {
      setSlug(params.slug);
    }
  }, [params]);

  // Get organization by slug from Convex
  const orgBySlug = useQuery(
    api.organizations.getOrganizationBySlug,
    slug ? { slug } : "skip"
  );

  // We don't need to check membership or redirect here, layout handles it.
  // But we need orgBySlug._id for WorkspaceSettingsPage.

  if (!orgBySlug?._id) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6 animate-spin text-[#26251E]/20" />
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-hidden">
      <WorkspaceSettingsPage organizationId={orgBySlug._id} />
    </main>
  );
}
