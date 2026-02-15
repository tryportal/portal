"use client";

import { useEffect } from "react";

export function SetLastWorkspace({ slug }: { slug: string }) {
  useEffect(() => {
    document.cookie = `last-workspace=${slug};path=/;max-age=31536000`;
  }, [slug]);

  return null;
}
