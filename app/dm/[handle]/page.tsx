"use client"

import * as React from "react"
import { useAuth, SignIn } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { ChatCircle, XCircle } from "@phosphor-icons/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/lib/theme-provider"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function DmSharePage({
  params,
}: {
  params: Promise<{ handle: string }> | { handle: string }
}) {
  const router = useRouter()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [handle, setHandle] = React.useState<string>("")
  const [isCreating, setIsCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation)

  // Resolve params if it's a Promise (Next.js 15+)
  React.useEffect(() => {
    if (params instanceof Promise) {
      params.then((resolved) => setHandle(resolved.handle))
    } else {
      setHandle(params.handle)
    }
  }, [params])

  // Look up user by handle
  const targetUser = useQuery(
    api.users.getUserByHandle,
    handle ? { handle } : "skip"
  )

  // Get current user to check if visiting own link
  const currentUser = useQuery(api.users.getCurrentUser)

  // Get user's primary workspace for redirect
  const primaryWorkspace = useQuery(api.users.getPrimaryWorkspace)

  // Handle starting the conversation
  const handleStartConversation = async () => {
    if (!targetUser || isCreating) return

    setIsCreating(true)
    setError(null)

    try {
      const conversationId = await getOrCreateConversation({
        otherUserId: targetUser.clerkId,
      })

      // Redirect to the conversation
      if (primaryWorkspace?.slug) {
        router.replace(`/w/${primaryWorkspace.slug}/messages/${conversationId}`)
      } else {
        // If no primary workspace, just go to root and let it handle redirect
        router.replace(`/`)
      }
    } catch (err) {
      console.error("Failed to create conversation:", err)
      setError(err instanceof Error ? err.message : "Failed to start conversation")
      setIsCreating(false)
    }
  }

  // Auto-start conversation when signed in (if not own profile)
  React.useEffect(() => {
    if (
      authLoaded &&
      isSignedIn &&
      targetUser &&
      currentUser &&
      targetUser.clerkId !== currentUser.clerkId &&
      !isCreating &&
      !error
    ) {
      handleStartConversation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, isSignedIn, targetUser, currentUser, isCreating, error])

  // Check if visiting own profile
  const isOwnProfile = currentUser && targetUser && currentUser.clerkId === targetUser.clerkId

  // Helper functions
  const getInitials = (firstName: string | null | undefined, lastName: string | null | undefined) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName[0].toUpperCase()
    }
    return "?"
  }

  const getName = (firstName: string | null | undefined, lastName: string | null | undefined) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    if (firstName) {
      return firstName
    }
    return "Unknown User"
  }

  // Loading state
  if (!authLoaded || (handle && targetUser === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="size-12 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
            <img src={isDark ? "/portal.svg" : "/portal-dark.svg"} alt="Portal" className="size-6 opacity-90" />
          </div>
          <LoadingSpinner size="sm" text="Loading..." />
        </div>
      </div>
    )
  }

  // User not found
  if (targetUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="size-5 sm:size-8 text-red-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">User Not Found</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              No user with the handle <span className="font-medium">@{handle}</span> exists.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="mt-4 bg-foreground text-background hover:bg-foreground/90"
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Visiting own profile - redirect to messages
  if (isOwnProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="size-16 sm:size-20">
              <AvatarImage
                src={targetUser.imageUrl || undefined}
                alt={getName(targetUser.firstName, targetUser.lastName)}
              />
              <AvatarFallback className="bg-secondary text-foreground text-xl sm:text-2xl">
                {getInitials(targetUser.firstName, targetUser.lastName)}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
              This is your DM link
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Share this link with others so they can message you.
            </p>
            <Button
              onClick={() => {
                if (primaryWorkspace?.slug) {
                  router.push(`/w/${primaryWorkspace.slug}/messages`)
                } else {
                  router.push("/")
                }
              }}
              className="mt-4 bg-foreground text-background hover:bg-foreground/90"
            >
              Go to Messages
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Creating conversation state
  if (isCreating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
          <div className="size-12 rounded-xl bg-foreground flex items-center justify-center shadow-lg">
            <img src={isDark ? "/portal.svg" : "/portal-dark.svg"} alt="Portal" className="size-6 opacity-90" />
          </div>
          <LoadingSpinner size="sm" text="Opening conversation..." />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-12 sm:size-16 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="size-5 sm:size-8 text-red-500" weight="fill" />
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{error}</p>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="border-border"
              >
                Go Home
              </Button>
              <Button
                onClick={() => {
                  setError(null)
                  handleStartConversation()
                }}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not signed in - show profile preview and sign-in
  if (!isSignedIn && targetUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-[95%] sm:max-w-md w-full">
          {/* Profile Preview Card */}
          <div className="bg-card rounded-2xl p-5 sm:p-8 shadow-sm border border-border mb-6">
            <div className="flex flex-col items-center text-center gap-4">
              <Avatar className="size-16 sm:size-20">
                <AvatarImage
                  src={targetUser.imageUrl || undefined}
                  alt={getName(targetUser.firstName, targetUser.lastName)}
                />
                <AvatarFallback className="bg-secondary text-foreground text-xl sm:text-2xl">
                  {getInitials(targetUser.firstName, targetUser.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
                  Message {getName(targetUser.firstName, targetUser.lastName)}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  @{targetUser.handle}
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ChatCircle className="size-4" />
                <p className="text-sm">
                  Sign in to start a conversation
                </p>
              </div>
            </div>
          </div>

          {/* Clerk Sign In */}
          <SignIn
            routing="hash"
            afterSignInUrl={`/dm/${handle}`}
            afterSignUpUrl={`/dm/${handle}`}
          />
        </div>
      </div>
    )
  }

  // Default: should have already redirected, show loading
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
        <LoadingSpinner size="md" />
      </div>
    </div>
  )
}
