"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Lightning,
  ChatCircle,
  ShieldCheck,
  ArrowRight,
  Code,
  Cloud,
} from "@phosphor-icons/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/lib/theme-provider";

export function Hero() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const userOrgs = useQuery(api.organizations.getUserOrganizations);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const targetOrg =
    userOrgs?.find((org: { role: string }) => org.role === "admin") ||
    userOrgs?.[0];
  const workspaceUrl = targetOrg?.slug ? `/w/${targetOrg.slug}` : null;

  return (
    <section className="flex-1 flex flex-col items-center justify-center px-6 font-[family-name:var(--font-jetbrains-mono)]">
      <div className="max-w-xl w-full py-6">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-6">
          <Image
            src={isDark ? "/portal-dark.svg" : "/portal.svg"}
            alt="Portal"
            width={48}
            height={48}
            className="w-10 h-10"
            priority
          />
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Main content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl text-foreground">portal</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              open-source team chat.
              <br />
              free forever. self-host or cloud.
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 px-2 py-1 border border-border rounded">
              <Code size={12} />
              open-source
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 border border-border rounded">
              <Cloud size={12} />
              self-host
            </span>
          </div>

          {/* ASCII-style divider */}
          <div className="text-muted-foreground/30 text-xs select-none overflow-hidden">
            ─────────────────────────────────────────
          </div>

          {/* Features list */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <Lightning size={16} className="text-foreground shrink-0" />
              <span>real-time messaging</span>
            </div>
            <div className="flex items-center gap-3">
              <ChatCircle size={16} className="text-foreground shrink-0" />
              <span>channels and direct messages</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-foreground shrink-0" />
              <span>privacy-first by design</span>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2 flex flex-wrap items-center gap-6 text-sm">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
                  >
                    <span className="underline underline-offset-4">
                      open workspace
                    </span>
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/sign-up"
                      className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
                    >
                      <span className="underline underline-offset-4">
                        get started
                      </span>
                      <ArrowRight size={14} />
                    </Link>
                    <Link
                      href="/sign-in"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      sign in
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
