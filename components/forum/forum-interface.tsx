"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { PostsList } from "./posts-list"
import { PostView } from "./post-view"
import { CreatePostDialog } from "./create-post-dialog"
import { EmptyForumState } from "./empty-forum-state"
import type { ForumPost, PostAuthor } from "./post-item"
import type { Message, Attachment, Reaction } from "@/components/chat"
import type { LinkEmbedData as LinkEmbed } from "@/components/preview/link-preview"
import type { MentionUser } from "@/components/preview/mention-autocomplete"
import { ResizablePanel } from "@/components/ui/resizable-panel"

interface ForumInterfaceProps {
  channelId: Id<"channels">
  channelName: string
  channelDescription?: string
  channelIcon?: React.ComponentType<{ className?: string }>
  currentUserId?: string
  isAdmin: boolean
  canPost: boolean
  userDataCache: Record<string, { firstName?: string | null; lastName?: string | null; imageUrl?: string | null }>
  mentionUsers: MentionUser[]
  generateUploadUrl: () => Promise<string>
  onTyping?: () => void
}

export function ForumInterface({
  channelId,
  channelName,
  channelDescription,
  channelIcon: ChannelIcon,
  currentUserId,
  isAdmin,
  canPost,
  userDataCache,
  mentionUsers,
  generateUploadUrl,
  onTyping,
}: ForumInterfaceProps) {
  const [selectedPostId, setSelectedPostId] = React.useState<Id<"forumPosts"> | null>(null)
  const [createPostOpen, setCreatePostOpen] = React.useState(false)
  const [isMobilePostView, setIsMobilePostView] = React.useState(false)

  // Queries
  const postsData = useQuery(api.forumPosts.getPosts, { channelId })
  const selectedPost = useQuery(
    api.forumPosts.getPost,
    selectedPostId ? { postId: selectedPostId } : "skip"
  )
  const commentsData = useQuery(
    api.forumPosts.getPostComments,
    selectedPostId ? { postId: selectedPostId, limit: 100 } : "skip"
  )

  // Mutations
  const sendComment = useMutation(api.forumPosts.sendComment)
  const deleteComment = useMutation(api.forumPosts.deleteComment)
  const editComment = useMutation(api.forumPosts.editComment)
  const toggleCommentReaction = useMutation(api.forumPosts.toggleCommentReaction)
  const closePost = useMutation(api.forumPosts.closePost)
  const reopenPost = useMutation(api.forumPosts.reopenPost)
  const markAsSolved = useMutation(api.forumPosts.markAsSolved)
  const markAsUnsolved = useMutation(api.forumPosts.markAsUnsolved)
  const pinPost = useMutation(api.forumPosts.pinPost)
  const unpinPost = useMutation(api.forumPosts.unpinPost)
  const deletePost = useMutation(api.forumPosts.deletePost)
  const updatePost = useMutation(api.forumPosts.updatePost)

  // Build user names map
  const userNames: Record<string, string> = React.useMemo(() => {
    const names: Record<string, string> = {}
    Object.entries(userDataCache).forEach(([userId, data]) => {
      const firstName = data.firstName
      const lastName = data.lastName
      names[userId] = firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || userId
    })
    return names
  }, [userDataCache])

  // Build authors map for posts list
  const authors: Record<string, PostAuthor> = React.useMemo(() => {
    const map: Record<string, PostAuthor> = {}
    if (!postsData) return map

    postsData.posts.forEach((post) => {
      const cached = userDataCache[post.authorId]
      const firstName = cached?.firstName
      const lastName = cached?.lastName
      const imageUrl = cached?.imageUrl

      const name = firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || "Unknown User"

      const initials = firstName && lastName
        ? `${firstName[0]}${lastName[0]}`
        : firstName?.[0] || "?"

      map[post.authorId] = {
        userId: post.authorId,
        name,
        avatar: imageUrl || undefined,
        initials,
      }
    })

    return map
  }, [postsData, userDataCache])

  // Transform posts to ForumPost format
  const posts: ForumPost[] = React.useMemo(() => {
    if (!postsData) return []
    return postsData.posts.map((post) => ({
      _id: post._id,
      title: post.title,
      content: post.content,
      authorId: post.authorId,
      status: post.status,
      isPinned: post.isPinned,
      commentCount: post.commentCount,
      lastActivityAt: post.lastActivityAt,
      createdAt: post.createdAt,
    }))
  }, [postsData])

  // Transform comments to Message format
  const comments: Message[] = React.useMemo(() => {
    if (!commentsData) return []
    return commentsData.comments.map((comment) => {
      const cached = userDataCache[comment.userId]
      const firstName = cached?.firstName
      const lastName = cached?.lastName
      const imageUrl = cached?.imageUrl

      const name = firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || "Unknown User"

      const initials = firstName && lastName
        ? `${firstName[0]}${lastName[0]}`
        : firstName?.[0] || "?"

      // Transform attachments
      const attachments: Attachment[] = comment.attachments?.map((att: any) => ({
        storageId: att.storageId,
        name: att.name,
        size: att.size,
        type: att.type,
      })) || []

      // Transform reactions
      const reactions: Reaction[] | undefined = comment.reactions?.map((r: any) => ({
        userId: r.userId,
        emoji: r.emoji,
      }))

      return {
        id: comment._id,
        content: comment.content,
        timestamp: new Date(comment.createdAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        createdAt: comment.createdAt,
        user: {
          id: comment.userId,
          name,
          avatar: imageUrl || undefined,
          initials,
        },
        attachments: attachments.length > 0 ? attachments : undefined,
        linkEmbed: comment.linkEmbed,
        editedAt: comment.editedAt,
        reactions: reactions && reactions.length > 0 ? reactions : undefined,
      }
    })
  }, [commentsData, userDataCache])

  // Get selected post author info
  const selectedPostAuthor = React.useMemo(() => {
    if (!selectedPost?.post) return null
    const cached = userDataCache[selectedPost.post.authorId]
    const firstName = cached?.firstName
    const lastName = cached?.lastName
    const imageUrl = cached?.imageUrl

    const name = firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || "Unknown User"

    const initials = firstName && lastName
      ? `${firstName[0]}${lastName[0]}`
      : firstName?.[0] || "?"

    return {
      userId: selectedPost.post.authorId,
      name,
      avatar: imageUrl || undefined,
      initials,
    }
  }, [selectedPost, userDataCache])

  // Check if current user can modify the post
  const canModifyPost = React.useMemo(() => {
    if (!selectedPost?.post || !currentUserId) return false
    return currentUserId === selectedPost.post.authorId || isAdmin
  }, [selectedPost, currentUserId, isAdmin])

  // Handlers
  const handleSelectPost = (postId: Id<"forumPosts">) => {
    setSelectedPostId(postId)
    setIsMobilePostView(true)
  }

  const handleBackToList = () => {
    setIsMobilePostView(false)
  }

  const handleCreatePost = () => {
    setCreatePostOpen(true)
  }

  const handlePostCreated = (postId: Id<"forumPosts">) => {
    setSelectedPostId(postId)
    setIsMobilePostView(true)
  }

  const handleSendComment = async (
    content: string,
    attachments?: Array<{
      storageId: string
      name: string
      size: number
      type: string
    }>,
    parentMessageId?: string,
    linkEmbed?: LinkEmbed
  ) => {
    if (!selectedPostId) return

    try {
      await sendComment({
        postId: selectedPostId,
        content,
        attachments: attachments?.map((a) => ({
          ...a,
          storageId: a.storageId as Id<"_storage">,
        })),
        linkEmbed,
        parentMessageId: parentMessageId as Id<"messages"> | undefined,
      })
    } catch (error) {
      console.error("Failed to send comment:", error)
    }
  }

  const handleDeleteComment = async (messageId: string) => {
    try {
      await deleteComment({ messageId: messageId as Id<"messages"> })
    } catch (error) {
      console.error("Failed to delete comment:", error)
    }
  }

  const handleEditComment = async (messageId: string, content: string) => {
    try {
      await editComment({
        messageId: messageId as Id<"messages">,
        content,
      })
    } catch (error) {
      console.error("Failed to edit comment:", error)
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleCommentReaction({
        messageId: messageId as Id<"messages">,
        emoji,
      })
    } catch (error) {
      console.error("Failed to toggle reaction:", error)
    }
  }

  const handleMarkSolutionComment = async (messageId: string) => {
    if (!selectedPostId || !selectedPost?.post) return
    try {
      // Toggle: if this message is already the solution, unmark it; otherwise mark it
      if (selectedPost.post.solvedCommentId === messageId) {
        await markAsUnsolved({ postId: selectedPostId })
      } else {
        await markAsSolved({
          postId: selectedPostId,
          solvedCommentId: messageId as Id<"messages">,
        })
      }
    } catch (error) {
      console.error("Failed to toggle solution:", error)
    }
  }

  const handleClosePost = async () => {
    if (!selectedPostId) return
    try {
      await closePost({ postId: selectedPostId })
    } catch (error) {
      console.error("Failed to close post:", error)
    }
  }

  const handleReopenPost = async () => {
    if (!selectedPostId) return
    try {
      await reopenPost({ postId: selectedPostId })
    } catch (error) {
      console.error("Failed to reopen post:", error)
    }
  }

  const handleMarkSolved = async () => {
    if (!selectedPostId) return
    try {
      await markAsSolved({ postId: selectedPostId })
    } catch (error) {
      console.error("Failed to mark as solved:", error)
    }
  }

  const handleMarkUnsolved = async () => {
    if (!selectedPostId) return
    try {
      await markAsUnsolved({ postId: selectedPostId })
    } catch (error) {
      console.error("Failed to mark as unsolved:", error)
    }
  }

  const handlePinPost = async () => {
    if (!selectedPostId) return
    try {
      await pinPost({ postId: selectedPostId })
    } catch (error) {
      console.error("Failed to pin post:", error)
    }
  }

  const handleUnpinPost = async () => {
    if (!selectedPostId) return
    try {
      await unpinPost({ postId: selectedPostId })
    } catch (error) {
      console.error("Failed to unpin post:", error)
    }
  }

  const handleDeletePost = async () => {
    if (!selectedPostId) return
    try {
      await deletePost({ postId: selectedPostId })
      setSelectedPostId(null)
      setIsMobilePostView(false)
    } catch (error) {
      console.error("Failed to delete post:", error)
    }
  }

  const handleEditPost = async () => {
    // TODO: Implement edit post dialog
  }

  // Check loading state and posts
  const isLoading = postsData === undefined
  const hasPosts = posts.length > 0

  return (
    <div className="flex flex-1 h-full min-h-0 bg-background">
      {/* Posts list - hidden on mobile when viewing a post */}
      <ResizablePanel
        storageKey="portal-forum-posts-width"
        defaultWidth={320}
        minWidth={240}
        maxWidth={600}
        className={cn(
          "flex flex-col h-full border-r border-border shrink-0",
          isMobilePostView && "hidden md:flex"
        )}
      >
        {/* Channel header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background">
          {ChannelIcon && (
            <ChannelIcon className="size-5 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate">
              {channelName}
            </h1>
            {channelDescription && (
              <p className="text-xs text-muted-foreground truncate">
                {channelDescription}
              </p>
            )}
          </div>
        </div>

        {/* Posts list */}
        {isLoading || hasPosts ? (
          <PostsList
            posts={posts}
            authors={authors}
            selectedPostId={selectedPostId || undefined}
            onSelectPost={handleSelectPost}
            onCreatePost={handleCreatePost}
            canCreatePost={canPost}
            isLoading={isLoading}
          />
        ) : (
          <EmptyForumState
            onCreatePost={handleCreatePost}
            canCreatePost={canPost}
          />
        )}
      </ResizablePanel>

      {/* Post view - shown on mobile when a post is selected */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-0",
          !isMobilePostView && "hidden md:flex"
        )}
      >
      {selectedPost?.post && selectedPostAuthor ? (
          <PostView
            post={selectedPost.post}
            author={selectedPostAuthor}
            comments={comments}
            currentUserId={currentUserId}
            canModify={canModifyPost}
            isAdmin={isAdmin}
            onSendComment={handleSendComment}
            onDeleteComment={handleDeleteComment}
            onEditComment={handleEditComment}
            onReaction={handleReaction}
            onMarkSolutionComment={handleMarkSolutionComment}
            onClose={handleClosePost}
            onReopen={handleReopenPost}
            onMarkSolved={handleMarkSolved}
            onMarkUnsolved={handleMarkUnsolved}
            onPin={handlePinPost}
            onUnpin={handleUnpinPost}
            onDelete={handleDeletePost}
            onEdit={handleEditPost}
            onBack={handleBackToList}
            showBackButton={true}
            onTyping={onTyping}
            generateUploadUrl={generateUploadUrl}
            mentionUsers={mentionUsers}
            userNames={userNames}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a post to view</p>
          </div>
        )}
      </div>

      {/* Create post dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        channelId={channelId}
        onPostCreated={handlePostCreated}
        generateUploadUrl={generateUploadUrl}
      />
    </div>
  )
}
