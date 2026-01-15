"use client";

import { useClientUpdate } from "@/lib/use-client-update";

export function ClientUpdateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useClientUpdate();
  return <>{children}</>;
}
