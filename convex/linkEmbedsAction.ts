"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as cheerio from "cheerio";

export const fetchLinkEmbed = internalAction({
  args: {
    messageId: v.id("messages"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(args.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "bot",
          Accept: "text/html",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!response.ok) return;

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) return;

      const html = await response.text();
      const $ = cheerio.load(html);

      const ogTitle = $('meta[property="og:title"]').attr("content");
      const ogDescription = $('meta[property="og:description"]').attr("content");
      const ogImage = $('meta[property="og:image"]').attr("content");
      const ogSiteName = $('meta[property="og:site_name"]').attr("content");

      const title = ogTitle || $("title").text() || undefined;
      const description =
        ogDescription ||
        $('meta[name="description"]').attr("content") ||
        undefined;

      // Resolve favicon
      let favicon =
        $('link[rel="icon"]').attr("href") ||
        $('link[rel="shortcut icon"]').attr("href") ||
        undefined;

      if (favicon && !favicon.startsWith("http")) {
        const urlObj = new URL(args.url);
        favicon = favicon.startsWith("/")
          ? `${urlObj.origin}${favicon}`
          : `${urlObj.origin}/${favicon}`;
      }

      // Resolve relative og:image
      let image = ogImage;
      if (image && !image.startsWith("http")) {
        const urlObj = new URL(args.url);
        image = image.startsWith("/")
          ? `${urlObj.origin}${image}`
          : `${urlObj.origin}/${image}`;
      }

      if (!title && !description && !image) return;

      await ctx.runMutation(internal.linkEmbeds.storeLinkEmbed, {
        messageId: args.messageId,
        linkEmbed: {
          url: args.url,
          title,
          description,
          image,
          siteName: ogSiteName || undefined,
          favicon,
        },
      });
    } catch {
      // Silently fail — embed is optional
    }
  },
});
