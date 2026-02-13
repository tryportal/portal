"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/components/navbar";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const workspace = useQuery(api.organizations.getWorkspaceBySlug, { slug });

  if (workspace === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (workspace === null) {
    router.push("/onboarding");
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex flex-1 items-center justify-center" style={{ minHeight: "calc(100vh - 57px)" }}>
        <div className="text-center">
          <h1 className="text-xl font-medium tracking-tight">
            {workspace.name}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            /{workspace.slug}
          </p>
        </div>
      </div>
    </div>
  );
}
