/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiChat from "../aiChat.js";
import type * as auth from "../auth.js";
import type * as blocks from "../blocks.js";
import type * as crons from "../crons.js";
import type * as databases from "../databases.js";
import type * as files from "../files.js";
import type * as finance from "../finance.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as maddy from "../maddy.js";
import type * as maddyOrganise from "../maddyOrganise.js";
import type * as news from "../news.js";
import type * as newsSync from "../newsSync.js";
import type * as notifications from "../notifications.js";
import type * as pages from "../pages.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiChat: typeof aiChat;
  auth: typeof auth;
  blocks: typeof blocks;
  crons: typeof crons;
  databases: typeof databases;
  files: typeof files;
  finance: typeof finance;
  habits: typeof habits;
  http: typeof http;
  maddy: typeof maddy;
  maddyOrganise: typeof maddyOrganise;
  news: typeof news;
  newsSync: typeof newsSync;
  notifications: typeof notifications;
  pages: typeof pages;
  workspaces: typeof workspaces;
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
