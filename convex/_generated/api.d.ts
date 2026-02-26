/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as channels from "../channels.js";
import type * as conversations from "../conversations.js";
import type * as emails from "../emails.js";
import type * as forumPosts from "../forumPosts.js";
import type * as invitations from "../invitations.js";
import type * as linkEmbeds from "../linkEmbeds.js";
import type * as linkEmbedsAction from "../linkEmbedsAction.js";
import type * as messages from "../messages.js";
import type * as organizations from "../organizations.js";
import type * as overview from "../overview.js";
import type * as sharedChannels from "../sharedChannels.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  channels: typeof channels;
  conversations: typeof conversations;
  emails: typeof emails;
  forumPosts: typeof forumPosts;
  invitations: typeof invitations;
  linkEmbeds: typeof linkEmbeds;
  linkEmbedsAction: typeof linkEmbedsAction;
  messages: typeof messages;
  organizations: typeof organizations;
  overview: typeof overview;
  sharedChannels: typeof sharedChannels;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
