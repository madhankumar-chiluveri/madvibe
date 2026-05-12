/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountConversion from "../accountConversion.js";
import type * as aiChat from "../aiChat.js";
import type * as auth from "../auth.js";
import type * as automations_csvUtils from "../automations/csvUtils.js";
import type * as automations_ociSettings from "../automations/ociSettings.js";
import type * as automations_ociUploader from "../automations/ociUploader.js";
import type * as automations_pinManager from "../automations/pinManager.js";
import type * as automations_uploads from "../automations/uploads.js";
import type * as blocks from "../blocks.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as databases from "../databases.js";
import type * as emails from "../emails.js";
import type * as feed from "../feed.js";
import type * as feedSync from "../feedSync.js";
import type * as files from "../files.js";
import type * as financeShared from "../financeShared.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as ledger from "../ledger.js";
import type * as ledgerCards from "../ledgerCards.js";
import type * as ledgerInvestments from "../ledgerInvestments.js";
import type * as ledgerLoans from "../ledgerLoans.js";
import type * as ledgerRecurring from "../ledgerRecurring.js";
import type * as maddy from "../maddy.js";
import type * as maddyOrganise from "../maddyOrganise.js";
import type * as marketData from "../marketData.js";
import type * as migrations_wipeOldAutomations from "../migrations/wipeOldAutomations.js";
import type * as notifications from "../notifications.js";
import type * as pages from "../pages.js";
import type * as reminders from "../reminders.js";
import type * as workspaceAccess from "../workspaceAccess.js";
import type * as workspaceShared from "../workspaceShared.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountConversion: typeof accountConversion;
  aiChat: typeof aiChat;
  auth: typeof auth;
  "automations/csvUtils": typeof automations_csvUtils;
  "automations/ociSettings": typeof automations_ociSettings;
  "automations/ociUploader": typeof automations_ociUploader;
  "automations/pinManager": typeof automations_pinManager;
  "automations/uploads": typeof automations_uploads;
  blocks: typeof blocks;
  comments: typeof comments;
  crons: typeof crons;
  databases: typeof databases;
  emails: typeof emails;
  feed: typeof feed;
  feedSync: typeof feedSync;
  files: typeof files;
  financeShared: typeof financeShared;
  habits: typeof habits;
  http: typeof http;
  ledger: typeof ledger;
  ledgerCards: typeof ledgerCards;
  ledgerInvestments: typeof ledgerInvestments;
  ledgerLoans: typeof ledgerLoans;
  ledgerRecurring: typeof ledgerRecurring;
  maddy: typeof maddy;
  maddyOrganise: typeof maddyOrganise;
  marketData: typeof marketData;
  "migrations/wipeOldAutomations": typeof migrations_wipeOldAutomations;
  notifications: typeof notifications;
  pages: typeof pages;
  reminders: typeof reminders;
  workspaceAccess: typeof workspaceAccess;
  workspaceShared: typeof workspaceShared;
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

export declare const components: {
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: Array<string> | string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bcc?: Array<string>;
          bounced?: boolean;
          cc?: Array<string>;
          clicked?: boolean;
          complained: boolean;
          createdAt: number;
          deliveryDelayed?: boolean;
          errorMessage?: string;
          failed?: boolean;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bounced: boolean;
          clicked: boolean;
          complained: boolean;
          deliveryDelayed: boolean;
          errorMessage: string | null;
          failed: boolean;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string>;
          cc?: Array<string>;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
};
