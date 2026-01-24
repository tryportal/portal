"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  LightningIcon,
  ChatCircleIcon,
  HandHeartIcon,
  ArrowRightIcon,
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
    <section className="flex-1 flex flex-col items-center justify-center font-[family-name:var(--font-jetbrains-mono)]">
      <div className="max-w-xl mx-auto w-full px-6 py-6">
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
        </div>

        {/* Main content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl text-foreground">portal</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              open-source team chat.
              <br />
              free forever.
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <LightningIcon size={16} className="text-foreground shrink-0" />
              <span>real-time messaging</span>
            </div>
            <div className="flex items-center gap-3">
              <ChatCircleIcon size={16} className="text-foreground shrink-0" />
              <span>channels and direct messages</span>
            </div>
            <div className="flex items-center gap-3">
              <HandHeartIcon size={16} className="text-foreground shrink-0" />
              <span>open source, self-hostable</span>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2 flex flex-wrap items-center gap-6 text-sm">
            {authLoaded && (
              <>
                {isSignedIn && workspaceUrl ? (
                  <Link
                    href={workspaceUrl}
                    className="hover:opacity-95 active:translate-y-px flex items-center gap-2 bg-foreground text-background px-4 py-2"
                  >
                    open workspace
                    <ArrowRightIcon size={14} />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/sign-up"
                      className="flex hover:opacity-95 active:translate-y-px items-center gap-2 bg-foreground text-background px-4 py-2"
                    >
                      get started
                      <ArrowRightIcon size={14} />
                    </Link>
                    <Link
                      href="/sign-in"
                      className="hover:text-foreground active:translate-y-px hover:font-semibold underline underline-offset-4"
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
