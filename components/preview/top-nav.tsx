"use client";

import { useState } from "react";
import Image from "next/image";
import {
  HouseIcon,
  ChatCircleIcon,
  TrayIcon,
  CaretDownIcon,
  CheckIcon,
  PlusIcon,
  UsersIcon,
  ListIcon,
  GearIcon,
  SignOutIcon,
  SunIcon,
  DesktopIcon,
  MoonIcon,
  StarIcon,
  BugIcon,
} from "@phosphor-icons/react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceData, useWorkspace } from "@/components/workspace-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme-provider";
import { JoinWorkspaceDialog } from "@/components/join-workspace-dialog";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "messages", label: "Messages", icon: ChatCircleIcon },
  { id: "inbox", label: "Inbox", icon: TrayIcon },
];

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const router = useRouter();
  const params = useParams();
  const currentSlug = params?.slug as string | undefined;
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { user } = useUser();
  const { signOut } = useClerk();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>("bug");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Use shared workspace data from context
  const { organization: currentOrg, userOrganizations: userOrgs } =
    useWorkspaceData();
  const { sidebarOpen, setSidebarOpen } = useWorkspace();

  const handleSettings = () => {
    router.push("/settings");
  };

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  // Get user initials for avatar fallback
  const userInitials = user?.firstName
    ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ""}`.toUpperCase()
    : user?.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase() || "U";

  // Get primary workspace
  const primaryWorkspace = useQuery(api.users.getPrimaryWorkspace);

  // Get total unread message count for DMs
  const totalUnreadCount = useQuery(api.conversations.getTotalUnreadCount) ?? 0;

  // Get total inbox count (mentions + DMs)
  const inboxCount = useQuery(
    api.messages.getTotalInboxCount,
    currentOrg?._id ? { organizationId: currentOrg._id } : "skip"
  );

  const handleOrganizationSwitch = (orgSlug: string) => {
    router.push(`/w/${orgSlug}`);
  };

  const handleCreateOrganization = () => {
    router.push("/setup?new=true&step=1");
  };

  const handleJoinOrganization = () => {
    setJoinDialogOpen(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackTitle.trim() || !feedbackDescription.trim()) return;

    setFeedbackSubmitting(true);
    try {
      const typeLabel = feedbackType === "bug" ? "Bug Report" : "Feature Idea";
      const embed = {
        title: `${typeLabel}: ${feedbackTitle}`,
        description: feedbackDescription,
        color: feedbackType === "bug" ? 0xff0000 : 0x00ff00,
        fields: [
          {
            name: "Submitted by",
            value: user?.fullName || user?.primaryEmailAddress?.emailAddress || "Unknown user",
            inline: true,
          },
          {
            name: "Workspace",
            value: currentOrg?.name || "Unknown",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      await fetch(
        "https://discord.com/api/webhooks/1459109552908800051/qNQoGA4ejyvd_vzoisRE956AdQJ0DO9AW_JOU2iSFH_IkHoIot_mJoa3TFxSc3-c6y14",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "<@1128770568032886874>",
            embeds: [embed],
          }),
        }
      );

      // Reset form and close popover only on success
      setFeedbackTitle("");
      setFeedbackDescription("");
      setFeedbackType("bug");
      setFeedbackOpen(false);
      toast.success("Feedback submitted successfully!");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);

    // Navigate based on tab
    if (currentSlug) {
      if (tabId === "home") {
        router.push(`/w/${currentSlug}`);
      } else if (tabId === "messages") {
        router.push(`/w/${currentSlug}/messages`);
      } else if (tabId === "inbox") {
        router.push(`/w/${currentSlug}/inbox`);
      }
    }
  };

  return (
    <header className="flex h-14 items-center justify-between bg-background px-3 sm:px-4 sm:grid sm:grid-cols-3">
      {/* Left: Mobile menu button + Portal Logo */}
      <div className="flex items-center gap-2">
        {/* Mobile sidebar toggle - only show when sidebar would be visible (not on messages) */}
        {activeTab !== "messages" && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sm:hidden text-muted-foreground hover:text-foreground"
          >
            <ListIcon className="size-5" weight="bold" />
          </Button>
        )}
        <Image
          src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
          alt="Portal"
          width={100}
          height={21}
          className="h-5 sm:h-[21px] w-auto hidden sm:block"
        />
        {/* Mobile: Show org name instead of logo */}
        <div className="sm:hidden flex items-center gap-1.5">
          {currentOrg?.logoUrl ? (
            <Image
              src={currentOrg.logoUrl}
              alt={currentOrg.name || "Organization"}
              width={20}
              height={20}
              className="rounded"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground">
              <Image
                src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                alt="Workspace"
                width={12}
                height={12}
              />
            </div>
          )}
          <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
            {currentOrg?.name || "Portal"}
          </span>
        </div>
      </div>

      {/* Center: Workspace + Tabs (hidden on mobile, shown in bottom nav) */}
      <div className="hidden sm:flex items-center justify-center gap-2">
        {/* Organization Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="gap-2 px-2 text-foreground hover:bg-muted h-8 inline-flex items-center justify-center whitespace-nowrap transition-all rounded-md border border-transparent bg-clip-padding focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] outline-none">
            {currentOrg?.logoUrl ? (
              <Image
                src={currentOrg.logoUrl}
                alt={currentOrg.name || "Organization"}
                width={20}
                height={20}
                className="rounded"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground">
                <Image
                  src={isDark ? "/portal.svg" : "/portal-dark.svg"}
                  alt="Workspace"
                  width={12}
                  height={12}
                />
              </div>
            )}
            <span className="text-sm font-medium truncate max-w-[150px]">
              {currentOrg?.name || "Organization"}
            </span>
            <CaretDownIcon className="ml-1 size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            {userOrgs && userOrgs.length > 0 ? (
              userOrgs.map((org) => {
                const isActive = currentOrg?._id === org._id;
                const isPrimary = primaryWorkspace?._id === org._id;
                return (
                  <DropdownMenuItem
                    key={org._id}
                    onClick={() => handleOrganizationSwitch(org.slug)}
                    className="gap-2 px-2 py-1.5 cursor-pointer"
                  >
                    {org.logoUrl ? (
                      <Image
                        src={org.logoUrl}
                        alt={org.name || "Organization"}
                        width={16}
                        height={16}
                        className="rounded"
                      />
                    ) : (
                      <div className="flex h-4 w-4 items-center justify-center rounded bg-foreground">
                        <Image
                          src={isDark ? "/portal-dark.svg" : "/portal.svg"}
                          alt="Workspace"
                          width={10}
                          height={10}
                        />
                      </div>
                    )}
                    <span className="text-sm flex-1 truncate min-w-0">
                      {org.name || "Organization"}
                    </span>
                    {isPrimary && (
                      <StarIcon className="size-3.5 text-amber-500" weight="fill" />
                    )}
                    {isActive && (
                      <CheckIcon className="size-3.5 text-foreground" />
                    )}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <DropdownMenuItem disabled className="px-2 py-1.5">
                <span className="text-sm text-muted-foreground">
                  No organizations
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleCreateOrganization}
              className="gap-2 px-2 py-1.5 cursor-pointer"
            >
              <PlusIcon className="size-3.5 text-foreground" />
              <span className="text-sm">Create Workspace</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleJoinOrganization}
              className="gap-2 px-2 py-1.5 cursor-pointer"
            >
              <UsersIcon className="size-3.5 text-foreground" />
              <span className="text-sm">Join Workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showMessagesBadge =
              tab.id === "messages" && totalUnreadCount > 0;
            const showInboxBadge =
              tab.id === "inbox" && (inboxCount?.total ?? 0) > 0;
            const badgeCount =
              tab.id === "messages"
                ? totalUnreadCount
                : (inboxCount?.total ?? 0);
            return (
              <Button
                key={tab.id}
                variant={isActive ? "secondary" : "ghost"}
                size="default"
                onClick={() => handleTabChange(tab.id)}
                className={`gap-1.5 relative ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  weight={isActive ? "fill" : "regular"}
                  className="size-4"
                />
                {tab.label}
                {(showMessagesBadge || showInboxBadge) && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Right: User Account */}
      <div className="flex justify-end items-center gap-2">
        {/* Feedback Bug Icon */}
        <Popover open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <PopoverTrigger className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none">
            <BugIcon className="size-4 sm:size-5" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <PopoverHeader>
              <PopoverTitle>Send Feedback</PopoverTitle>
            </PopoverHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Type</label>
                <Select value={feedbackType} onValueChange={(value) => value && setFeedbackType(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Idea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Title</label>
                <Input
                  placeholder="Brief summary..."
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Description</label>
                <Textarea
                  placeholder="Describe the issue or idea in detail..."
                  value={feedbackDescription}
                  onChange={(e) => setFeedbackDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleFeedbackSubmit}
                disabled={feedbackSubmitting || !feedbackTitle.trim() || !feedbackDescription.trim()}
                className="w-full"
              >
                {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 cursor-pointer">
              {user?.imageUrl && <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />}
              <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.fullName || user?.firstName || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <DropdownMenuSeparator />
            {/* Theme Switcher */}
            <div className="px-2 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Theme</span>
                <div className="relative flex items-center bg-secondary rounded-full p-1">
                  {/* Animated pill indicator */}
                  <div
                    className="absolute h-7 w-7 bg-primary/20 rounded-full transition-transform duration-200 ease-out"
                    style={{
                      transform: `translateX(${theme === "light" ? "0" : theme === "system" ? "28px" : "56px"})`,
                    }}
                  />
                  <button
                    onClick={() => setTheme("light")}
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      theme === "light" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Light"
                  >
                    <SunIcon className="size-4" />
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      theme === "system" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="System"
                  >
                    <DesktopIcon className="size-4" />
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      theme === "dark" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Dark"
                  >
                    <MoonIcon className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSettings}
              className="gap-2 cursor-pointer"
            >
              <GearIcon className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
            >
              <SignOutIcon className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background px-2 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showMessagesBadge =
              tab.id === "messages" && totalUnreadCount > 0;
            const showInboxBadge =
              tab.id === "inbox" && (inboxCount?.total ?? 0) > 0;
            const badgeCount =
              tab.id === "messages"
                ? totalUnreadCount
                : (inboxCount?.total ?? 0);
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon
                    weight={isActive ? "fill" : "regular"}
                    className="size-5"
                  />
                  {(showMessagesBadge || showInboxBadge) && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-semibold text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Join Workspace Dialog */}
      <JoinWorkspaceDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
    </header>
  );
}
