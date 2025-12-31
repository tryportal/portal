"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { SidebarIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface SidebarShellProps {
    isOpen: boolean
    onToggle: () => void
    header: React.ReactNode
    children: React.ReactNode
    footer?: React.ReactNode
    className?: string
}

export function SidebarShell({
    isOpen,
    onToggle,
    header,
    children,
    footer,
    className
}: SidebarShellProps) {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "sm:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onToggle}
            />

            {/* Sidebar Container */}
            {!isOpen ? (
                <div className="hidden sm:flex h-full w-12 flex-col items-center border-r border-border bg-background py-3 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onToggle}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <SidebarIcon className="size-4" />
                    </Button>
                </div>
            ) : (
                <div
                    className={cn(
                        "fixed sm:relative z-50 sm:z-auto h-full flex-col border-r border-border bg-background flex animate-in slide-in-from-left-full sm:animate-none duration-200 shrink-0",
                        className
                    )}
                    style={{ width: 'var(--sidebar-width)' }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between border-b border-border bg-background px-4 shrink-0"
                        style={{ height: 'var(--sidebar-header-height)' }}
                    >
                        {header}
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1">
                        <div className="p-2">
                            {children}
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    {footer && (
                        <div className="border-t border-border p-2 shrink-0">
                            {footer}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
