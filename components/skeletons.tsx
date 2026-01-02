"use client";

import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";

// Base skeleton component with shimmer animation
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

// Sidebar skeleton for workspace layout
export function SidebarSkeleton() {
  return (
    <div className="flex h-full w-60 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="size-6 rounded" />
      </div>

      {/* Navigation items */}
      <div className="p-2">
        <div className="mb-4 space-y-1">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>

        {/* Category skeletons */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-20 ml-1" />
              <div className="space-y-0.5 pl-1">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Top navigation skeleton
export function TopNavSkeleton() {
  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-full" />
      </div>
    </div>
  );
}

// Channel header skeleton
export function ChannelHeaderSkeleton() {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
      <Skeleton className="size-5 rounded" />
      <Skeleton className="h-5 w-32" />
    </div>
  );
}

// Message skeleton for chat
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>
    </div>
  );
}

// Message list skeleton
export function MessageListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <MessageSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Message input skeleton
export function MessageInputSkeleton() {
  return (
    <div className="border-t border-border bg-card p-4">
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

// Full chat interface skeleton
export function ChatInterfaceSkeleton() {
  return (
    <div className="flex flex-1 flex-col bg-card">
      <ChannelHeaderSkeleton />
      <MessageListSkeleton />
      <MessageInputSkeleton />
    </div>
  );
}

// Member card skeleton
export function MemberCardSkeleton() {
  return (
    <div className="flex flex-col items-center p-6 bg-card rounded-xl border border-border">
      <Skeleton className="size-20 rounded-full mb-4" />
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

// People page skeleton
export function PeoplePageSkeleton() {
  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <Skeleton className="size-5" />
          <Skeleton className="h-5 w-16" />
          <div className="ml-auto">
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl py-12 px-6">
            <div className="space-y-6">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-full rounded-md" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <MemberCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Member profile skeleton
export function MemberProfileSkeleton() {
  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
          <Skeleton className="h-4 w-32" />
        </header>
        <div className="flex-1 overflow-y-auto bg-card/50">
          <div className="mx-auto max-w-5xl py-8 px-6">
            {/* Profile header card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-8">
              <div className="h-32 bg-gradient-to-r from-background to-muted border-b border-border" />
              <div className="px-8 pb-8">
                <div className="relative -mt-12 mb-4">
                  <Skeleton className="size-32 rounded-full border-4 border-white" />
                </div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                  <Skeleton className="h-4 w-24" />
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="size-8 rounded-lg" />
                      <div>
                        <Skeleton className="h-3 w-12 mb-1" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card rounded-xl border border-border p-8">
                  <Skeleton className="h-4 w-16 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Settings page skeleton
export function SettingsPageSkeleton() {
  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <Skeleton className="size-5" />
          <Skeleton className="h-5 w-24" />
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl py-8 px-6 space-y-8">
            {/* Settings sections */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// Overview page skeleton
export function OverviewPageSkeleton() {
  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-background">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl py-8 px-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64 mb-8" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Inbox page skeleton
export function InboxPageSkeleton() {
  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col bg-background">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-7 w-24 mb-2" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>

          {/* Mentions section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-5 rounded-full" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <Skeleton className="size-10 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DMs section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-5 rounded-full" />
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <Skeleton className="size-10 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Full workspace layout skeleton (sidebar + content)
export function WorkspaceLayoutSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopNavSkeleton />
      <div className="flex flex-1 overflow-hidden">
        <SidebarSkeleton />
        {children || <OverviewPageSkeleton />}
      </div>
    </div>
  );
}

// Generic page loading spinner - uses the unified LoadingSpinner component
export function PageLoadingSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center bg-card">
      <LoadingSpinner size="md" />
    </div>
  );
}

export { Skeleton };
