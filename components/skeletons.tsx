"use client";

import { cn } from "@/lib/utils";

// Base skeleton component with shimmer animation
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#26251E]/5",
        className
      )}
      {...props}
    />
  );
}

// Sidebar skeleton for workspace layout
export function SidebarSkeleton() {
  return (
    <div className="flex h-full w-60 flex-col border-r border-[#26251E]/10 bg-[#F7F7F4]">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-[#26251E]/10 px-3">
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
    <div className="flex h-12 items-center justify-between border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
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
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#26251E]/10 bg-white px-4">
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
    <div className="border-t border-[#26251E]/10 bg-white p-4">
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

// Full chat interface skeleton
export function ChatInterfaceSkeleton() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <ChannelHeaderSkeleton />
      <MessageListSkeleton />
      <MessageInputSkeleton />
    </div>
  );
}

// Member card skeleton
export function MemberCardSkeleton() {
  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-xl border border-[#26251E]/10">
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
      <div className="flex h-full flex-col bg-[#F7F7F4]">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
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
      <div className="flex h-full flex-col bg-[#F7F7F4]">
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
          <Skeleton className="h-4 w-32" />
        </header>
        <div className="flex-1 overflow-y-auto bg-white/50">
          <div className="mx-auto max-w-5xl py-8 px-6">
            {/* Profile header card */}
            <div className="bg-white rounded-2xl border border-[#26251E]/10 shadow-sm overflow-hidden mb-8">
              <div className="h-32 bg-gradient-to-r from-[#F7F7F4] to-[#E8E8E5] border-b border-[#26251E]/5" />
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
                <div className="bg-white rounded-xl border border-[#26251E]/10 p-6 space-y-4">
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
                <div className="bg-white rounded-xl border border-[#26251E]/10 p-8">
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
      <div className="flex h-full flex-col bg-[#F7F7F4]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#26251E]/10 bg-[#F7F7F4] px-4">
          <Skeleton className="size-5" />
          <Skeleton className="h-5 w-24" />
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl py-8 px-6 space-y-8">
            {/* Settings sections */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-[#26251E]/10 p-6">
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
      <div className="flex h-full flex-col bg-[#F7F7F4]">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl py-8 px-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64 mb-8" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-[#26251E]/10 p-4">
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

// Full workspace layout skeleton (sidebar + content)
export function WorkspaceLayoutSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F7F4]">
      <TopNavSkeleton />
      <div className="flex flex-1 overflow-hidden">
        <SidebarSkeleton />
        {children || <OverviewPageSkeleton />}
      </div>
    </div>
  );
}

// Generic page loading spinner
export function PageLoadingSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <div className="size-6 animate-spin rounded-full border-2 border-[#26251E]/10 border-t-[#26251E]/40" />
      </div>
    </div>
  );
}

export { Skeleton };
