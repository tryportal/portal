"use client"

import * as React from "react"
import { mockUsers } from "@/components/preview/mock-data"
import type { Message } from "@/components/preview/message-list"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@phosphor-icons/react"
import Link from "next/link"

// Sample messages for preview - includes grouped messages (same user within 1 minute)
const sampleMessages: Message[] = [
  {
    id: "1",
    content: "Hey team! Just finished the new feature implementation.",
    timestamp: "9:32 AM",
    createdAt: Date.now() - 1000 * 60 * 30,
    user: mockUsers.sarah,
  },
  {
    id: "2",
    content: "Can someone review the PR when you get a chance?",
    timestamp: "9:32 AM",
    createdAt: Date.now() - 1000 * 60 * 30 + 15000, // 15 seconds later
    user: mockUsers.sarah,
  },
  {
    id: "3",
    content: "Nice work! I'll take a look at it now.",
    timestamp: "9:35 AM",
    createdAt: Date.now() - 1000 * 60 * 27,
    user: mockUsers.mike,
  },
  {
    id: "4",
    content: "The code looks clean overall.",
    timestamp: "9:45 AM",
    createdAt: Date.now() - 1000 * 60 * 17,
    user: mockUsers.mike,
  },
  {
    id: "5",
    content: "Just left a few minor comments about the error handling.",
    timestamp: "9:45 AM",
    createdAt: Date.now() - 1000 * 60 * 17 + 20000, // 20 seconds later
    user: mockUsers.mike,
  },
  {
    id: "6",
    content: "Thanks for the review! I'll address those comments.",
    timestamp: "9:48 AM",
    createdAt: Date.now() - 1000 * 60 * 14,
    user: mockUsers.sarah,
  },
  {
    id: "7",
    content: "Should have an update pushed in a few minutes.",
    timestamp: "9:48 AM",
    createdAt: Date.now() - 1000 * 60 * 14 + 25000, // 25 seconds later
    user: mockUsers.sarah,
  },
  {
    id: "8",
    content: "Sounds good! Let me know when it's ready.",
    timestamp: "9:50 AM",
    createdAt: Date.now() - 1000 * 60 * 12,
    user: mockUsers.mike,
  },
]

// Current user for demonstration
const currentUserId = "sarah"

// Compact Message Style Component
function CompactMessageItem({
  message,
  isGrouped,
}: {
  message: Message
  isGrouped: boolean
}) {
  return (
    <div
      className="group relative px-4 hover:bg-muted/50 transition-colors"
      style={{ paddingTop: isGrouped ? "2px" : "6px", paddingBottom: isGrouped ? "2px" : "6px" }}
    >
      <div className="flex gap-2.5">
        {/* Avatar - hidden when grouped */}
        {!isGrouped ? (
          <Avatar className="size-7 flex-shrink-0">
            {message.user.avatar ? (
              <AvatarImage src={message.user.avatar} alt={message.user.name} />
            ) : null}
            <AvatarFallback className="bg-muted text-foreground text-[10px] font-medium">
              {message.user.initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7 flex-shrink-0 flex items-start justify-center pt-[2px]">
            <span className="text-[9px] leading-none whitespace-nowrap text-transparent group-hover:text-muted-foreground transition-colors font-medium tabular-nums">
              {message.timestamp}
            </span>
          </div>
        )}

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {!isGrouped && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-semibold text-sm text-foreground">
                {message.user.name}
              </span>
              <span className="text-[10px] leading-none text-muted-foreground font-medium tabular-nums">
                {message.timestamp}
              </span>
            </div>
          )}
          <div className="text-sm text-foreground/90 leading-[1.45]">
            {message.content}
          </div>
        </div>
      </div>
    </div>
  )
}

// Bubble Message Style Component
function BubbleMessageItem({
  message,
  isOwn,
  isGrouped,
}: {
  message: Message
  isOwn: boolean
  isGrouped: boolean
}) {
  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} px-3`}
      style={{ marginTop: isGrouped ? "2px" : "8px" }}
    >
      <div className={`flex gap-2 max-w-[75%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar - hidden when grouped */}
        {!isGrouped ? (
          <Avatar className="size-7 flex-shrink-0">
            {message.user.avatar ? (
              <AvatarImage src={message.user.avatar} alt={message.user.name} />
            ) : null}
            <AvatarFallback className="bg-muted text-foreground text-[10px] font-medium">
              {message.user.initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7 flex-shrink-0" />
        )}

        {/* Bubble */}
        <div className="flex flex-col">
          {!isGrouped && !isOwn && (
            <span className="text-[11px] font-medium text-muted-foreground mb-0.5 ml-3">
              {message.user.name}
            </span>
          )}
          <div
            className={`relative px-3 py-2 ${
              isOwn
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                : "bg-muted text-foreground rounded-2xl rounded-bl-md"
            }`}
          >
            <div className="text-sm leading-[1.4]">{message.content}</div>
            <div
              className={`text-[10px] mt-1 ${
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {message.timestamp}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function for grouping
function shouldGroup(current: Message, previous: Message | undefined): boolean {
  if (!previous) return false
  if (current.user.id !== previous.user.id) return false
  if (current.createdAt && previous.createdAt) {
    const timeDiff = current.createdAt - previous.createdAt
    return timeDiff <= 60000
  }
  return false
}

export default function MessageStylePreviewPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/preview">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeftIcon className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Message Style Preview</h1>
              <p className="text-sm text-muted-foreground">Compare different message display styles</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Compact Style */}
          <div className="flex flex-col">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">Compact Style</h2>
              <p className="text-sm text-muted-foreground">
                Condensed layout with smaller avatars and tighter spacing
              </p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <span className="text-sm font-medium text-foreground"># general</span>
              </div>
              <div className="py-3">
                {sampleMessages.map((message, index) => {
                  const previousMessage = index > 0 ? sampleMessages[index - 1] : undefined
                  const isGrouped = shouldGroup(message, previousMessage)
                  return (
                    <CompactMessageItem
                      key={message.id}
                      message={message}
                      isGrouped={isGrouped}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bubble Style */}
          <div className="flex flex-col">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">Bubble Style</h2>
              <p className="text-sm text-muted-foreground">
                Chat bubbles with messages aligned by sender
              </p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <span className="text-sm font-medium text-foreground"># general</span>
              </div>
              <div className="py-3">
                {sampleMessages.map((message, index) => {
                  const previousMessage = index > 0 ? sampleMessages[index - 1] : undefined
                  const isGrouped = shouldGroup(message, previousMessage)
                  const isOwn = message.user.id === currentUserId
                  return (
                    <BubbleMessageItem
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      isGrouped={isGrouped}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Feature comparison */}
        <div className="mt-12">
          <h2 className="text-base font-semibold text-foreground mb-4">Style Comparison</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium text-foreground px-4 py-3">Feature</th>
                  <th className="text-left font-medium text-foreground px-4 py-3">Compact</th>
                  <th className="text-left font-medium text-foreground px-4 py-3">Bubble</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-foreground">Layout</td>
                  <td className="px-4 py-3 text-muted-foreground">Traditional list style</td>
                  <td className="px-4 py-3 text-muted-foreground">Chat bubbles</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">Message alignment</td>
                  <td className="px-4 py-3 text-muted-foreground">All left-aligned</td>
                  <td className="px-4 py-3 text-muted-foreground">Own right, others left</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">Message grouping</td>
                  <td className="px-4 py-3 text-muted-foreground">Avatar hidden, timestamp on hover</td>
                  <td className="px-4 py-3 text-muted-foreground">Avatar hidden, stacked bubbles</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">Best for</td>
                  <td className="px-4 py-3 text-muted-foreground">Team channels</td>
                  <td className="px-4 py-3 text-muted-foreground">Direct messages</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
