"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"

type Density = 'compact' | 'default' | 'spacious'
type MessageDisplay = 'default' | 'compact'

export function CustomizationSettings() {
    const { user } = useUser()
    const savedSettings = useQuery(api.userSettings.get, user?.id ? { userId: user.id } : "skip")
    const updateSettings = useMutation(api.userSettings.update)

    const [density, setDensity] = React.useState<Density>('default')
    const [messageDisplay, setMessageDisplay] = React.useState<MessageDisplay>('default')
    const [groupSpacing, setGroupSpacing] = React.useState(16)
    const [fontScaling, setFontScaling] = React.useState(16)
    const [isScrolled, setIsScrolled] = React.useState(false)

    // Synchronize local state with DB settings when they load
    React.useEffect(() => {
        if (savedSettings) {
            setDensity(savedSettings.density as Density)
            setMessageDisplay(savedSettings.messageDisplay as MessageDisplay)
            setGroupSpacing(savedSettings.groupSpacing)
            setFontScaling(savedSettings.fontScaling)
        }
    }, [savedSettings])

    const handleUpdate = (updates: Partial<{
        density: Density,
        messageDisplay: MessageDisplay,
        groupSpacing: number,
        fontScaling: number
    }>) => {
        if (!user?.id) return

        // Optimistic update for local state
        if (updates.density) setDensity(updates.density)
        if (updates.messageDisplay) setMessageDisplay(updates.messageDisplay)
        if (updates.groupSpacing !== undefined) setGroupSpacing(updates.groupSpacing)
        if (updates.fontScaling !== undefined) setFontScaling(updates.fontScaling)

        // Persist to DB
        updateSettings({
            userId: user.id,
            ...updates
        })
    }

    const userInfo = {
        name: user?.fullName || user?.username || "Madison",
        initials: user?.firstName?.charAt(0) || "M",
        avatar: user?.imageUrl || "https://github.com/shadcn.png"
    }

    return (
        <div
            className="flex-1 overflow-y-auto bg-background/50 scrollbar-thin scrollbar-thumb-border"
            onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 10)}
        >
            <div className="mx-auto max-w-[740px] py-12 px-8 space-y-12 pb-24">

                {/* PREVIEW SECTION */}
                {/* PREVIEW SECTION */}
                <section className="space-y-4 sticky top-6 z-50">
                    <Card className={cn(
                        "rounded-xl border transition-all duration-300 overflow-hidden overflow-x-hidden relative p-0 gap-0",
                        isScrolled
                            ? "bg-background/80 backdrop-blur-xl border-border/50 shadow-sm supports-[backdrop-filter]:bg-background/60"
                            : "bg-background border-border shadow-sm"
                    )}>
                        {/* Backdrop blur to prevent content bleeding through transparent areas if any, though bg-card covers it usually. 
                            Adding a shadow/ring to make it pop when sticky would be nice, but simple is good for now. 
                        */}
                        <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Preview</span>
                            <span className="text-[10px] text-muted-foreground/50">Changes apply instantly</span>
                        </div>
                        <div
                            className="p-4 space-y-0 bg-transparent transition-all duration-300"
                            style={{
                                fontSize: `${fontScaling}px`,
                                "--chat-font-scaling": `${fontScaling}px`
                            } as React.CSSProperties}
                        >
                            <PreviewMessage
                                display={messageDisplay}
                                spacing={groupSpacing}
                                user={userInfo}
                                content="Look at me, I'm a beautiful butterfly Fluttering in the sunlight 🙂"
                                timestamp="12:39 AM"
                            />
                            <PreviewMessage
                                display={messageDisplay}
                                spacing={groupSpacing}
                                user={userInfo}
                                content="Waiting for the day when Compact mode would be turned on"
                                timestamp="12:40 AM"
                                isGrouped={messageDisplay === 'default'}
                            />
                            <PreviewMessage
                                display={messageDisplay}
                                spacing={groupSpacing}
                                user={userInfo}
                                content="And here is a new group to show the spacing!"
                                timestamp="12:42 AM"
                                isGrouped={false}
                            />
                        </div>
                    </Card>
                </section>

                <div className="h-px bg-border/50" />

                {/* UI DENSITY SECTION */}
                <section className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">UI Density</h2>
                        <p className="text-sm text-muted-foreground mt-1">Adjust the space between server, channel, and member lists.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {(['compact', 'default', 'spacious'] as Density[]).map((d) => (
                            <button
                                key={d}
                                onClick={() => handleUpdate({ density: d })}
                                className={cn(
                                    "flex flex-col gap-3 p-4 rounded-xl border transition-all text-left",
                                    density === d
                                        ? "bg-primary/5 border-primary ring-1 ring-primary"
                                        : "bg-card border-border hover:bg-muted/50"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-foreground capitalize">{d}</span>
                                    <div className={cn(
                                        "size-4 rounded-full border flex items-center justify-center transition-colors",
                                        density === d ? "border-primary bg-primary" : "border-muted-foreground/30"
                                    )}>
                                        {density === d && <div className="size-1.5 rounded-full bg-background" />}
                                    </div>
                                </div>

                                {/* Visual Spacing Representation */}
                                <div className="space-y-1 mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="size-4 rounded-sm bg-muted flex-shrink-0" />
                                        <div className="h-2 w-full rounded-full bg-muted/40" />
                                    </div>
                                    <div
                                        className="space-y-1"
                                        style={{
                                            paddingTop: d === 'compact' ? '2px' : d === 'default' ? '6px' : '10px'
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="size-4 rounded-sm bg-muted/60 flex-shrink-0" />
                                            <div className="h-2 w-2/3 rounded-full bg-muted/30" />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <div className="h-px bg-border/50" />

                {/* MESSAGE SPACING SECTION */}
                <section className="space-y-8">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Message Spacing</h2>
                            <p className="text-sm text-muted-foreground mt-1">Adjust the spacing between message elements.</p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chat Message Display</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {(['default', 'compact'] as MessageDisplay[]).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => handleUpdate({ messageDisplay: m })}
                                        className={cn(
                                            "flex flex-col gap-3 p-4 rounded-xl border transition-all text-left",
                                            messageDisplay === m
                                                ? "bg-primary/5 border-primary ring-1 ring-primary"
                                                : "bg-card border-border hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-foreground capitalize">{m}</span>
                                            <div className={cn(
                                                "size-4 rounded-full border flex items-center justify-center transition-colors",
                                                messageDisplay === m ? "border-primary bg-primary" : "border-muted-foreground/30"
                                            )}>
                                                {messageDisplay === m && <div className="size-1.5 rounded-full bg-background" />}
                                            </div>
                                        </div>

                                        {/* Visual Message Style Representation */}
                                        <div className="mt-2 space-y-2">
                                            {m === 'default' ? (
                                                <div className="flex gap-2">
                                                    <div className="size-6 rounded-full bg-muted flex-shrink-0" />
                                                    <div className="space-y-1 flex-1">
                                                        <div className="h-2 w-1/3 rounded-full bg-muted/60" />
                                                        <div className="h-2 w-full rounded-full bg-muted/30" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    <div className="flex gap-2 items-center">
                                                        <div className="h-2 w-8 bg-muted/40 rounded-full" />
                                                        <div className="h-2 w-1/4 rounded-full bg-muted/60" />
                                                        <div className="h-2 flex-1 rounded-full bg-muted/30" />
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <div className="h-2 w-8 bg-muted/40 rounded-full" />
                                                        <div className="h-2 w-1/3 rounded-full bg-muted/60" />
                                                        <div className="h-2 w-1/2 rounded-full bg-muted/30" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Space Between Message Groups</h3>
                            <span className="text-sm font-mono text-primary font-bold">{groupSpacing}px</span>
                        </div>
                        <Slider
                            value={groupSpacing}
                            min={0}
                            max={24}
                            step={4}
                            onValueChange={(val) => handleUpdate({ groupSpacing: val })}
                            labels={[0, 4, 8, 12, 16, 20, 24]}
                            formatLabel={(v) => `${v}px`}
                        />
                    </div>
                </section>

                <div className="h-px bg-border/50" />

                {/* SCALING SECTION */}
                <section className="space-y-12">
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-foreground">Scaling</h2>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-foreground">Chat font scaling</h3>
                                <p className="text-xs text-muted-foreground">Increase or decrease the size of the chat font</p>
                            </div>
                            <span className="text-sm font-mono text-primary font-bold">{fontScaling}px</span>
                        </div>
                        <Slider
                            value={fontScaling}
                            min={12}
                            max={24}
                            step={1}
                            onValueChange={(val) => handleUpdate({ fontScaling: val })}
                            labels={[12, 14, 15, 16, 18, 20, 24]}
                            formatLabel={(v) => `${v}px`}
                        />
                    </div>


                </section>

            </div>
        </div>
    )
}

function PreviewMessage({
    display,
    spacing,
    user,
    content,
    timestamp,
    isGrouped = false
}: {
    display: MessageDisplay,
    spacing: number,
    user: { name: string, initials: string, avatar: string },
    content: string,
    timestamp: string,
    isGrouped?: boolean
}) {
    // Match colors to real application theme
    const textColor = "text-foreground"
    const nameColor = "text-foreground"
    const mutedColor = "text-muted-foreground"

    if (display === 'compact') {
        return (
            <div
                className={cn(
                    "flex items-baseline gap-2 px-4 hover:bg-muted/50",
                    textColor
                )}
                style={{
                    marginTop: isGrouped ? "0px" : `${spacing}px`,
                    paddingTop: isGrouped ? "2px" : "var(--chat-item-padding-y)",
                    paddingBottom: isGrouped ? "2px" : "var(--chat-item-padding-y)",
                }}
            >
                <div className="w-12 text-right tabular-nums flex-shrink-0">
                    <span className={cn("text-[10px] opacity-70", mutedColor)}>{timestamp}</span>
                </div>
                <span className={cn("text-sm font-bold", nameColor)}>{user.name}</span>
                <span className="text-sm font-normal text-foreground/90" style={{ fontSize: "var(--chat-font-scaling)" }}>{content}</span>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "group relative px-4 hover:bg-muted/50 transition-colors",
                textColor
            )}
            style={{
                marginTop: isGrouped ? "0px" : `${spacing}px`,
                paddingTop: isGrouped ? "2px" : "var(--chat-item-padding-y)",
                paddingBottom: isGrouped ? "2px" : "var(--chat-item-padding-y)",
            }}
        >
            <div className="flex gap-2.5">
                <div className="w-8 flex-shrink-0 flex items-start justify-center pt-[2px]">
                    {!isGrouped ? (
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                            ) : (
                                <span className="text-[10px] font-medium">{user.initials}</span>
                            )}
                        </div>
                    ) : (
                        <span className={cn("text-[8px] opacity-0 group-hover:opacity-100 tabular-nums transition-opacity font-medium", mutedColor)}>
                            {timestamp}
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {!isGrouped && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                            <span className={cn("font-bold text-base", nameColor)}>
                                {user.name}
                            </span>
                            <span className={cn("text-[11px] font-medium opacity-70 tabular-nums", mutedColor)}>
                                {timestamp}
                            </span>
                        </div>
                    )}
                    <div
                        className="text-foreground/90 leading-[1.46] text-sm"
                        style={{
                            fontSize: 'var(--chat-font-scaling)',
                            marginTop: "0"
                        }}
                    >
                        {content}
                    </div>
                </div>
            </div>
        </div>
    )
}
