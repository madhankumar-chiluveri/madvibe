import { getAuthSessionId, getAuthUserId, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, query } from "./_generated/server";

async function resolveCurrentAuthStatus(ctx: any, userId: any) {
  const user = await ctx.db.get(userId);
  if (!user) return null;

  const googleAccount = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q: any) =>
      q.eq("userId", userId).eq("provider", "google")
    )
    .unique();

  const passwordAccount = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q: any) =>
      q.eq("userId", userId).eq("provider", "password")
    )
    .unique();

  let hasLegacyPasswordAccount = false;
  if (typeof user.email === "string" && user.email.trim().length > 0) {
    const matchingPasswordAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q: any) =>
        q.eq("provider", "password").eq("providerAccountId", user.email)
      )
      .take(2);

    if (matchingPasswordAccounts.length > 1) {
      throw new Error("Multiple password accounts were found for this email.");
    }

    hasLegacyPasswordAccount =
      matchingPasswordAccounts.length === 1 &&
      matchingPasswordAccounts[0].userId !== userId;
  }

  return {
    email: user.email ?? null,
    name: user.name ?? null,
    hasGoogle: googleAccount !== null,
    hasPassword: passwordAccount !== null,
    hasLegacyPasswordAccount,
    preferredProvider: googleAccount !== null ? "google" : "password",
  } as const;
}

async function deleteAuthAccount(ctx: any, accountId: any) {
  const verificationCodes = await ctx.db
    .query("authVerificationCodes")
    .withIndex("accountId", (q: any) => q.eq("accountId", accountId))
    .collect();

  for (const code of verificationCodes) {
    await ctx.db.delete(code._id);
  }

  await ctx.db.delete(accountId);
}

async function invalidateUserSessions(ctx: any, userId: any, except: any[] = []) {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q: any) => q.eq("userId", userId))
    .collect();

  for (const session of sessions) {
    if (except.includes(session._id)) continue;

    const refreshTokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q: any) => q.eq("sessionId", session._id))
      .collect();

    for (const refreshToken of refreshTokens) {
      await ctx.db.delete(refreshToken._id);
    }

    await ctx.db.delete(session._id);
  }
}

export const getCurrentAuthStatusInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await resolveCurrentAuthStatus(ctx, userId);
  },
});

export const getCurrentAuthStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await resolveCurrentAuthStatus(ctx, userId);
  },
});

export const finalizePasswordToGoogleConversion = internalMutation({
  args: {
    currentGoogleUserId: v.id("users"),
    currentSessionId: v.optional(v.id("authSessions")),
    passwordUserId: v.id("users"),
    passwordAccountId: v.id("authAccounts"),
  },
  handler: async (ctx, args) => {
    const googleUser = await ctx.db.get(args.currentGoogleUserId);
    const passwordUser = await ctx.db.get(args.passwordUserId);
    const passwordAccount = await ctx.db.get(args.passwordAccountId);

    if (!googleUser || !passwordUser || !passwordAccount) {
      throw new Error("The account conversion could not be completed.");
    }

    if (
      passwordAccount.provider !== "password" ||
      passwordAccount.userId !== args.passwordUserId
    ) {
      throw new Error("The password account no longer matches this user.");
    }

    const googleAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.currentGoogleUserId).eq("provider", "google")
      )
      .unique();

    if (!googleAccount) {
      throw new Error("Sign in with Google for this email first.");
    }

    const existingTargetGoogleAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.passwordUserId).eq("provider", "google")
      )
      .unique();

    if (
      existingTargetGoogleAccount &&
      existingTargetGoogleAccount._id !== googleAccount._id
    ) {
      throw new Error("This account already has a different Google login attached.");
    }

    if (
      typeof googleUser.email !== "string" ||
      typeof passwordUser.email !== "string" ||
      googleUser.email.toLowerCase() !== passwordUser.email.toLowerCase()
    ) {
      throw new Error("The Google account email does not match the password account.");
    }

    if (args.currentSessionId) {
      const currentSession = await ctx.db.get(args.currentSessionId);
      if (currentSession && currentSession.userId !== args.currentGoogleUserId) {
        throw new Error("The current session changed while converting this account.");
      }
    }

    if (args.currentGoogleUserId === args.passwordUserId) {
      await deleteAuthAccount(ctx, passwordAccount._id);
      await invalidateUserSessions(
        ctx,
        args.passwordUserId,
        args.currentSessionId ? [args.currentSessionId] : []
      );

      return {
        mergedExistingData: false,
        removedPassword: true,
      };
    }

    await ctx.db.patch(googleAccount._id, { userId: args.passwordUserId });
    await ctx.db.patch(args.passwordUserId, {
      name: passwordUser.name ?? googleUser.name,
      email: passwordUser.email ?? googleUser.email,
      image: googleUser.image ?? passwordUser.image,
      emailVerificationTime:
        googleUser.emailVerificationTime ??
        passwordUser.emailVerificationTime ??
        Date.now(),
    });

    await deleteAuthAccount(ctx, passwordAccount._id);
    await invalidateUserSessions(ctx, args.passwordUserId);

    return {
      mergedExistingData: true,
      removedPassword: true,
    };
  },
});

export const convertPasswordAccountToGoogle = action({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const sessionId = await getAuthSessionId(ctx);

    if (!userId) {
      throw new Error("You need to be signed in first.");
    }

    const authStatus = await ctx.runQuery(
      (internal as any).accountConversion.getCurrentAuthStatusInternal,
      {}
    );

    if (!authStatus?.hasGoogle) {
      throw new Error("Sign in with Google for this email first.");
    }

    if (!authStatus.email) {
      throw new Error("Your Google account is missing an email address.");
    }

    if (!authStatus.hasPassword && !authStatus.hasLegacyPasswordAccount) {
      throw new Error("No password account was found for this email.");
    }

    let passwordAccount;
    try {
      passwordAccount = await retrieveAccount(ctx, {
        provider: "password",
        account: {
          id: authStatus.email,
          secret: args.password,
        },
      });
    } catch {
      throw new Error("That password did not match your existing password account.");
    }

    return await ctx.runMutation(
      (internal as any).accountConversion.finalizePasswordToGoogleConversion,
      {
        currentGoogleUserId: userId,
        currentSessionId: sessionId ?? undefined,
        passwordUserId: passwordAccount.user._id,
        passwordAccountId: passwordAccount.account._id,
      }
    );
  },
});
