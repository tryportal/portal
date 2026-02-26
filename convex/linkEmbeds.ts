import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const storeLinkEmbed = internalMutation({
  args: {
    messageId: v.id("messages"),
    linkEmbed: v.object({
      url: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
      favicon: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;
    await ctx.db.patch(args.messageId, { linkEmbed: args.linkEmbed });
  },
});
