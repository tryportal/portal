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
            await ctx.db.patch(existing._id, {
                ...settings,
                updatedAt: Date.now(),
            });
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
