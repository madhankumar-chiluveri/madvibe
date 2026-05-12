import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import {
  getCurrentUserRecord,
  requireAuthenticatedUserId,
} from "./workspaceAccess";

const LEDGER_PIN_PATTERN = /^\d{4}$/;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const RESET_EMAIL_COOLDOWN_MS = 1000 * 60;
const TOKEN_BYTES = 32;

function validateLedgerPin(pin: string) {
  const normalized = pin.trim();
  if (!LEDGER_PIN_PATTERN.test(normalized)) {
    throw new Error("Use a 4-digit PIN for Ledger security.");
  }
  return normalized;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

async function hashPin(pin: string, salt: string) {
  return sha256(`ledger-pin:${salt}:${pin}`);
}

async function hashResetToken(token: string) {
  return sha256(`ledger-pin-reset:${token}`);
}

function maskEmail(email: string | null | undefined) {
  if (!email) return null;

  const trimmed = email.trim();
  const [localPart, domainPart] = trimmed.split("@");
  if (!localPart || !domainPart) return trimmed;

  const visibleStart = localPart.slice(0, 2);
  const hiddenLength = Math.max(localPart.length - visibleStart.length, 1);
  return `${visibleStart}${"*".repeat(hiddenLength)}@${domainPart}`;
}

async function getPinConfig(ctx: any, userId: string) {
  return ctx.db
    .query("ledgerPinConfigs")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
}

async function getResetTokenRecord(ctx: any, tokenHash: string) {
  return ctx.db
    .query("ledgerPinResetTokens")
    .withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash))
    .unique();
}

async function clearOutstandingResetTokens(ctx: any, userId: string) {
  const tokens = await ctx.db
    .query("ledgerPinResetTokens")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .collect();

  const now = Date.now();
  await Promise.all(
    tokens
      .filter((token: any) => token.usedAt === undefined && token.expiresAt > now)
      .map((token: any) => ctx.db.delete(token._id))
  );
}

export const getPinStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    const pinConfig = await getPinConfig(ctx, String(userId));

    return {
      hasPin: Boolean(pinConfig),
      email: user?.email ?? null,
      maskedEmail: maskEmail(user?.email ?? null),
      pinUpdatedAt: pinConfig?.updatedAt ?? null,
      resetCooldownEndsAt:
        pinConfig?.lastResetEmailSentAt !== undefined
          ? pinConfig.lastResetEmailSentAt + RESET_EMAIL_COOLDOWN_MS
          : null,
    };
  },
});

export const createPin = mutation({
  args: {
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const normalizedPin = validateLedgerPin(args.pin);

    const existing = await getPinConfig(ctx, userId);
    if (existing) {
      throw new Error(
        "Ledger PIN already exists. Use the email reset link to change it."
      );
    }

    const now = Date.now();
    const pinSalt = randomHex(16);
    const pinHash = await hashPin(normalizedPin, pinSalt);

    await ctx.db.insert("ledgerPinConfigs", {
      userId,
      pinHash,
      pinSalt,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const verifyPin = mutation({
  args: {
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const pinConfig = await getPinConfig(ctx, userId);

    if (!pinConfig) {
      throw new Error("Set a Ledger PIN before trying to unlock Ledger.");
    }

    const normalizedPin = validateLedgerPin(args.pin);
    const pinHash = await hashPin(normalizedPin, pinConfig.pinSalt);
    const ok = pinHash === pinConfig.pinHash;

    if (ok) {
      await ctx.db.patch(pinConfig._id, {
        lastVerifiedAt: Date.now(),
      });
    }

    return {
      ok,
      message: ok ? null : "That PIN is incorrect.",
    };
  },
});

export const issueResetToken = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await getCurrentUserRecord(ctx);
    const email = String(user?.email ?? "").trim();
    if (!email) {
      throw new Error("Your account needs an email address before Ledger PIN reset can work.");
    }

    const pinConfig = await getPinConfig(ctx, userId);
    if (!pinConfig) {
      throw new Error("Set a Ledger PIN before requesting a reset link.");
    }

    const now = Date.now();
    if (
      pinConfig.lastResetEmailSentAt !== undefined &&
      pinConfig.lastResetEmailSentAt + RESET_EMAIL_COOLDOWN_MS > now
    ) {
      throw new Error("A reset link was sent recently. Wait a minute and try again.");
    }

    await clearOutstandingResetTokens(ctx, userId);

    const token = randomHex(TOKEN_BYTES);
    const tokenHash = await hashResetToken(token);

    await ctx.db.insert("ledgerPinResetTokens", {
      userId,
      email,
      tokenHash,
      createdAt: now,
      expiresAt: now + RESET_TOKEN_TTL_MS,
    });

    await ctx.db.patch(pinConfig._id, {
      lastResetEmailSentAt: now,
      updatedAt: now,
    });

    return {
      email,
      maskedEmail: maskEmail(email),
      token,
    };
  },
});

export const revokeResetToken = internalMutation({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await getResetTokenRecord(ctx, args.tokenHash);
    if (token) {
      await ctx.db.delete(token._id);
    }
  },
});

export const getResetTokenStatus = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) {
      return {
        valid: false,
        reason: "missing" as const,
        maskedEmail: null,
      };
    }

    const tokenHash = await hashResetToken(token);
    const record = await getResetTokenRecord(ctx, tokenHash);
    if (!record) {
      return {
        valid: false,
        reason: "invalid" as const,
        maskedEmail: null,
      };
    }

    const maskedEmail = maskEmail(record.email);
    if (record.usedAt !== undefined) {
      return {
        valid: false,
        reason: "used" as const,
        maskedEmail,
      };
    }

    if (record.expiresAt <= Date.now()) {
      return {
        valid: false,
        reason: "expired" as const,
        maskedEmail,
      };
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        valid: false,
        reason: "unauthenticated" as const,
        maskedEmail,
      };
    }

    if (record.userId !== String(userId)) {
      return {
        valid: false,
        reason: "wrong_user" as const,
        maskedEmail,
      };
    }

    return {
      valid: true,
      reason: "ok" as const,
      maskedEmail,
      expiresAt: record.expiresAt,
    };
  },
});

export const completeReset = mutation({
  args: {
    token: v.string(),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUserId(ctx);
    const normalizedPin = validateLedgerPin(args.pin);
    const tokenHash = await hashResetToken(args.token.trim());
    const resetRecord = await getResetTokenRecord(ctx, tokenHash);

    if (!resetRecord) {
      throw new Error("This Ledger PIN reset link is invalid.");
    }

    if (resetRecord.userId !== userId) {
      throw new Error("This Ledger PIN reset link belongs to a different account.");
    }

    if (resetRecord.usedAt !== undefined || resetRecord.expiresAt <= Date.now()) {
      throw new Error("This Ledger PIN reset link has expired.");
    }

    const now = Date.now();
    const pinSalt = randomHex(16);
    const pinHash = await hashPin(normalizedPin, pinSalt);
    const existing = await getPinConfig(ctx, userId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        pinHash,
        pinSalt,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("ledgerPinConfigs", {
        userId,
        pinHash,
        pinSalt,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(resetRecord._id, {
      usedAt: now,
    });

    await clearOutstandingResetTokens(ctx, userId);

    return { success: true };
  },
});
