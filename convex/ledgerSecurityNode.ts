"use node";

import nodemailer from "nodemailer";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashResetToken(token: string) {
  const data = new TextEncoder().encode(`ledger-pin-reset:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

function getLedgerSiteUrl() {
  const candidate =
    process.env.SITE_URL?.trim() ||
    process.env.CUSTOM_AUTH_SITE_URL?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");

  if (!candidate) {
    throw new Error(
      "Missing `SITE_URL` or `CUSTOM_AUTH_SITE_URL`, so Ledger PIN reset links cannot be generated."
    );
  }

  return candidate.replace(/\/$/, "");
}

async function buildResetTransport() {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.trim();

  if (!user || !pass) {
    throw new Error(
      "Missing `GMAIL_SMTP_USER` or `GMAIL_SMTP_APP_PASSWORD`. Add them before sending Ledger PIN reset emails."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  await transporter.verify();
  return {
    transporter,
    from: `${process.env.GMAIL_FROM_NAME?.trim() || "MadVibe Security"} <${user}>`,
  };
}

export const sendPinResetEmail = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ success: true; maskedEmail: string | null }> => {
    const issued = (await ctx.runMutation(
      (internal as any).ledgerSecurity.issueResetToken,
      {}
    )) as {
      email: string;
      maskedEmail: string | null;
      token: string;
    };
    const tokenHash = await hashResetToken(issued.token);
    const resetUrl = `${getLedgerSiteUrl()}/ledger-pin-reset?token=${encodeURIComponent(
      issued.token
    )}`;

    try {
      const { transporter, from } = await buildResetTransport();
      await transporter.sendMail({
        from,
        to: issued.email,
        subject: "Reset your MadVibe Ledger PIN",
        text: [
          "A request was made to reset your Ledger security PIN.",
          "",
          "Open this secure link to choose a new 4-digit PIN:",
          resetUrl,
          "",
          "This link expires in 30 minutes. If you did not request this, you can ignore this email.",
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
            <h2 style="margin-bottom: 8px;">Reset your Ledger PIN</h2>
            <p>A request was made to reset your MadVibe Ledger security PIN.</p>
            <p>
              <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;">
                Reset Ledger PIN
              </a>
            </p>
            <p style="word-break: break-all; color: #4b5563;">${resetUrl}</p>
            <p>This secure link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });

      return {
        success: true,
        maskedEmail: issued.maskedEmail,
      };
    } catch (error) {
      await ctx.runMutation((internal as any).ledgerSecurity.revokeResetToken, {
        tokenHash,
      });
      throw error;
    }
  },
});
