import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const resendOptions = {
  testMode: false,
};

export const resend: Resend = new Resend(components.resend, resendOptions);

const DEFAULT_FROM_ADDRESS = "MadVibe <onboarding@resend.dev>";
const DEFAULT_APP_URL = "https://madvibe.app";

function resolveAppUrl(): string {
  const fromEnv =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL;

  if (fromEnv && fromEnv.startsWith("http")) {
    return fromEnv.replace(/\/+$/, "");
  }

  return DEFAULT_APP_URL;
}

function resolveFromAddress(): string {
  const fromEnv = process.env.RESEND_FROM_ADDRESS?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  return DEFAULT_FROM_ADDRESS;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInviteHtml(args: {
  inviterName: string;
  inviterEmail: string | null;
  workspaceName: string;
  role: "viewer" | "editor";
  inviteUrl: string;
}): string {
  const inviterLine = args.inviterEmail
    ? `${escapeHtml(args.inviterName)} (${escapeHtml(args.inviterEmail)})`
    : escapeHtml(args.inviterName);
  const roleLabel = args.role === "editor" ? "Editor" : "Viewer";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr>
              <td style="font-size:14px;color:#6b7280;padding-bottom:8px;">MadVibe</td>
            </tr>
            <tr>
              <td style="font-size:22px;font-weight:600;padding-bottom:16px;">
                You&rsquo;ve been invited to join <span style="color:#4f46e5;">${escapeHtml(args.workspaceName)}</span>
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.6;color:#374151;padding-bottom:24px;">
                ${inviterLine} invited you as a <strong>${roleLabel}</strong> in their MadVibe workspace.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="${args.inviteUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">
                  Accept invite
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;line-height:1.6;">
                If the button does not work, paste this link into your browser:<br />
                <a href="${args.inviteUrl}" style="color:#4f46e5;word-break:break-all;">${args.inviteUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#9ca3af;padding-top:24px;border-top:1px solid #e5e7eb;margin-top:24px;">
                You received this email because ${inviterLine} added your email to a MadVibe workspace. If this was a mistake, you can ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildInviteText(args: {
  inviterName: string;
  inviterEmail: string | null;
  workspaceName: string;
  role: "viewer" | "editor";
  inviteUrl: string;
}): string {
  const inviter = args.inviterEmail
    ? `${args.inviterName} (${args.inviterEmail})`
    : args.inviterName;
  const roleLabel = args.role === "editor" ? "Editor" : "Viewer";

  return [
    `${inviter} invited you to join the MadVibe workspace "${args.workspaceName}" as ${roleLabel}.`,
    "",
    `Accept the invite: ${args.inviteUrl}`,
    "",
    "If you weren't expecting this, you can safely ignore the email.",
  ].join("\n");
}

export const sendWorkspaceInviteEmail = internalMutation({
  args: {
    to: v.string(),
    inviteId: v.string(),
    workspaceName: v.string(),
    inviterName: v.string(),
    inviterEmail: v.union(v.string(), v.null()),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        "[emails] RESEND_API_KEY not set — skipping workspace invite email",
      );
      return null;
    }

    const appUrl = resolveAppUrl();
    const inviteUrl = `${appUrl}/workspace?invite=${encodeURIComponent(args.inviteId)}`;

    const html = buildInviteHtml({
      inviterName: args.inviterName,
      inviterEmail: args.inviterEmail,
      workspaceName: args.workspaceName,
      role: args.role,
      inviteUrl,
    });
    const text = buildInviteText({
      inviterName: args.inviterName,
      inviterEmail: args.inviterEmail,
      workspaceName: args.workspaceName,
      role: args.role,
      inviteUrl,
    });

    const emailId = await resend.sendEmail(ctx, {
      from: resolveFromAddress(),
      to: args.to,
      subject: `${args.inviterName} invited you to ${args.workspaceName} on MadVibe`,
      html,
      text,
    });

    return emailId;
  },
});
