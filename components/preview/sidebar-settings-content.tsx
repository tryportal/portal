"use client"

import * as React from "react"
import { GearIcon, PaintBrushIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidebarSettingsContentProps {
    isAdmin: boolean;
    isWorkspaceActive: boolean;
    isCustomizationActive: boolean;
    handleNavigate: (section: "workspace" | "customization") => void;
    handlePrefetch: (section: "workspace" | "customization") => void;
}

export function SidebarSettingsContent({
    isAdmin,
    isWorkspaceActive,
    isCustomizationActive,
    handleNavigate,
    handlePrefetch,
}: SidebarSettingsContentProps) {
    return (
        <div className="space-y-0.5 px-2">
            {/* Workspace Settings - Admin Only */}
            {isAdmin && (
                <Button
                    variant={isWorkspaceActive ? "secondary" : "ghost"}
                    onClick={() => handleNavigate("workspace")}
                    onMouseEnter={() => handlePrefetch("workspace")}
                    className={cn(
                        "w-full justify-start gap-2",
                        isWorkspaceActive
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    style={{
                        height: "auto",
                        paddingTop: "var(--sidebar-item-padding-y)",
                        paddingBottom: "var(--sidebar-item-padding-y)",
                        fontSize: "var(--sidebar-font-size)",
                    }}
                >
                    <GearIcon
                        className="size-4"
                        weight={isWorkspaceActive ? "fill" : "regular"}
                    />
                    Workspace
                </Button>
            )}

            {/* Customization Settings - All Users */}
            <Button
                variant={isCustomizationActive ? "secondary" : "ghost"}
                onClick={() => handleNavigate("customization")}
                onMouseEnter={() => handlePrefetch("customization")}
                className={cn(
                    "w-full justify-start gap-2",
                    isCustomizationActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                style={{
                    height: "auto",
                    paddingTop: "var(--sidebar-item-padding-y)",
                    paddingBottom: "var(--sidebar-item-padding-y)",
                    fontSize: "var(--sidebar-font-size)",
                }}
            >
                <PaintBrushIcon
                    className="size-4"
                    weight={isCustomizationActive ? "fill" : "regular"}
                />
                Customization
            </Button>
        </div>
    );
}
