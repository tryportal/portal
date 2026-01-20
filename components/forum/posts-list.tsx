"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { PostItem, type ForumPost, type PostAuthor } from "./post-item"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CircleIcon,
  LockIcon,
  CheckCircleIcon,
  ListIcon,
} from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import type { Id } from "@/convex/_generated/dataModel"

type StatusFilter = "all" | "open" | "closed" | "solved"

interface PostsListProps {
  posts: ForumPost[]
  authors: Record<string, PostAuthor>
  selectedPostId?: Id<"forumPosts">
  onSelectPost: (postId: Id<"forumPosts">) => void
  onCreatePost: () => void
  canCreatePost: boolean
  isLoading?: boolean
}

const filterOptions: { value: StatusFilter; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All Posts", icon: ListIcon },
  { value: "open", label: "Open", icon: CircleIcon },
  { value: "closed", label: "Closed", icon: LockIcon },
  { value: "solved", label: "Solved", icon: CheckCircleIcon },
]

export function PostsList({
  posts,
  authors,
  selectedPostId,
  onSelectPost,
  onCreatePost,
  canCreatePost,
  isLoading,
}: PostsListProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")

  // Filter posts by search query and status
  const filteredPosts = React.useMemo(() => {
    let filtered = posts

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((post) => post.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [posts, searchQuery, statusFilter])

  const currentFilter = filterOptions.find((f) => f.value === statusFilter)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with search and actions */}
      <div className="p-3 border-b border-border space-y-3">
        {/* New Post button */}
        {canCreatePost && (
          <Button
            onClick={onCreatePost}
            className="w-full justify-center gap-2"
            size="sm"
          >
            <PlusIcon className="size-4" />
            New Post
          </Button>
        )}

        {/* Search and filter row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon-sm" className="shrink-0" />
              }
            >
              <FunnelIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {filterOptions.map((option) => {
                const Icon = option.icon
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(statusFilter === option.value && "bg-muted")}
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active filter indicator */}
        {statusFilter !== "all" && currentFilter && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <currentFilter.icon className="size-3" />
            <span>Showing: {currentFilter.label}</span>
            <button
              onClick={() => setStatusFilter("all")}
              className="text-primary hover:underline ml-auto"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Posts list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Loading posts...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <p className="text-muted-foreground text-sm">
                {searchQuery || statusFilter !== "all"
                  ? "No posts match your filters"
                  : "No posts yet"}
              </p>
              {!searchQuery && statusFilter === "all" && canCreatePost && (
                <p className="text-muted-foreground text-xs mt-1">
                  Create the first post to start a discussion
                </p>
              )}
            </div>
          ) : (
            filteredPosts.map((post) => {
              const author = authors[post.authorId] || {
                userId: post.authorId,
                name: "Unknown User",
                initials: "?",
              }
              return (
                <PostItem
                  key={post._id}
                  post={post}
                  author={author}
                  isSelected={selectedPostId === post._id}
                  onClick={() => onSelectPost(post._id)}
                />
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
