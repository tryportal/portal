import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null; // Or throw, but null is often safer for queries that might run optimistically
        }

        // Security check: Ensure user can only read their own settings
        if (identity.subject !== args.userId) {
            throw new Error("Unauthorized: You can only view your own settings");
        }

        return await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
    },
});

export const update = mutation({
    args: {
        userId: v.string(),
        density: v.optional(v.union(v.literal("compact"), v.literal("default"), v.literal("spacious"))),
        messageDisplay: v.optional(v.union(v.literal("default"), v.literal("compact"))),
        groupSpacing: v.optional(v.number()),
        fontScaling: v.optional(v.number()),
        zoomLevel: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated");
        }

        // Security check: Ensure user can only update their own settings
        if (identity.subject !== args.userId) {
            throw new Error("Unauthorized: You can only update your own settings");
        }

        const { userId, ...settings } = args;
        const existing = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique();

        if (existing) {
            // Only patch fields that are actually provided (not undefined)
            const updates: Record<string, unknown> = { updatedAt: Date.now() };
            if (settings.density !== undefined) updates.density = settings.density;
            if (settings.messageDisplay !== undefined) updates.messageDisplay = settings.messageDisplay;
            if (settings.groupSpacing !== undefined) updates.groupSpacing = settings.groupSpacing;
            if (settings.fontScaling !== undefined) updates.fontScaling = settings.fontScaling;
            if (settings.zoomLevel !== undefined) updates.zoomLevel = settings.zoomLevel;

            await ctx.db.patch(existing._id, updates);
        } else {
            await ctx.db.insert("userSettings", {
                userId,
                density: settings.density ?? "default",
                messageDisplay: settings.messageDisplay ?? "default",
                groupSpacing: settings.groupSpacing ?? 16,
                fontScaling: settings.fontScaling ?? 16,
                zoomLevel: settings.zoomLevel ?? 100,
                updatedAt: Date.now(),
            });
        }
    },
});
