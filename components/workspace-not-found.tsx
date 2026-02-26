"use client";

import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function WorkspaceNotFound({ slug }: { slug: string }) {
  return (
    <div
      className="flex flex-1 items-center justify-center"
      style={{ height: "calc(100vh - 57px)" }}
    >
      <div className="text-center">
        <MagnifyingGlass size={32} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 text-sm font-medium">Workspace not found</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          The workspace <span className="font-mono text-foreground">/w/{slug}</span> doesn&apos;t
          exist or you don&apos;t have access to it.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Link href="/">
            <Button size="sm" variant="outline">
              Go home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
