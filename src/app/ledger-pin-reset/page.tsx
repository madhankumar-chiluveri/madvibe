"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";

function isValidLedgerPin(pin: string) {
  return /^\d{4}$/.test(pin.trim());
}

export default function LedgerPinResetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const user = useQuery(api.workspaces.getCurrentUser);
  const tokenStatus = useQuery(
    api.ledgerSecurity.getResetTokenStatus,
    token ? { token } : "skip"
  );
  const completeReset = useMutation(api.ledgerSecurity.completeReset);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  const loginRedirect = useMemo(() => {
    if (!token) return DEFAULT_WORKSPACE_ROUTE;
    return `/ledger-pin-reset?token=${encodeURIComponent(token)}`;
  }, [token]);

  async function handleSubmit() {
    if (!isValidLedgerPin(pin)) {
      toast.error("Use a 4-digit PIN for Ledger security.");
      return;
    }

    if (pin.trim() !== confirmPin.trim()) {
      toast.error("PIN confirmation does not match.");
      return;
    }

    setSaving(true);
    try {
      await completeReset({
        token,
        pin: pin.trim(),
      });
      toast.success("Ledger PIN updated");
      router.replace("/workspace/settings");
    } catch (error: any) {
      toast.error(error?.message ?? "This reset link could not be completed.");
    } finally {
      setSaving(false);
    }
  }

  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen bg-[#0f0e0d] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <AppIcon className="h-10 w-10 rounded-2xl" />
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-zinc-500 uppercase">
              MadVibe
            </p>
            <h1 className="text-xl font-semibold">Ledger PIN reset</h1>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#161513] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          {!token ? (
            <StateBlock
              icon={<LockKeyhole className="h-5 w-5" />}
              title="Missing reset token"
              description="Open the full Ledger PIN reset link from your email to continue."
            />
          ) : user === undefined || tokenStatus === undefined ? (
            <StateBlock
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Checking reset link"
              description="Verifying the reset token and your account access."
            />
          ) : !isAuthenticated ? (
            <div className="space-y-4">
              <StateBlock
                icon={<Mail className="h-5 w-5" />}
                title="Sign in to continue"
                description={`This Ledger PIN reset link is reserved for ${tokenStatus?.maskedEmail ?? "your account"} and only works after you sign in.`}
              />
              <Button asChild className="h-11 w-full rounded-2xl bg-white text-black hover:bg-zinc-200">
                <Link href={`/login?redirectTo=${encodeURIComponent(loginRedirect)}`}>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : tokenStatus.valid ? (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                  Choose a new Ledger PIN
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Set a fresh 4-digit PIN for Ledger. After saving, you can unlock Ledger with the new PIN right away.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  New PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="4 digits"
                  className="h-12 rounded-2xl border-white/10 bg-[#1a1917] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Confirm PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(event) =>
                    setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="Repeat PIN"
                  className="h-12 rounded-2xl border-white/10 bg-[#1a1917] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
                />
              </div>

              <Button
                type="button"
                className="h-12 w-full rounded-2xl bg-white text-black hover:bg-zinc-200"
                onClick={() => void handleSubmit()}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Save new PIN
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <StateBlock
                icon={<LockKeyhole className="h-5 w-5" />}
                title="This reset link cannot be used"
                description={getResetDescription(tokenStatus.reason, tokenStatus.maskedEmail)}
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="outline" className="h-11 flex-1 rounded-2xl border-white/10 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.07]">
                  <Link href="/workspace/settings">Open settings</Link>
                </Button>
                <Button asChild className="h-11 flex-1 rounded-2xl bg-white text-black hover:bg-zinc-200">
                  <Link href={DEFAULT_WORKSPACE_ROUTE}>Back to workspace</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StateBlock({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300">
        {icon}
      </div>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

function getResetDescription(
  reason: "missing" | "invalid" | "used" | "expired" | "unauthenticated" | "wrong_user" | "ok",
  maskedEmail: string | null
) {
  switch (reason) {
    case "used":
      return "This Ledger PIN reset link was already used. Request a fresh email from Settings if you still need to change the PIN.";
    case "expired":
      return "This Ledger PIN reset link expired. Request a fresh one from Settings.";
    case "wrong_user":
      return `This reset link belongs to ${maskedEmail ?? "another account"}. Sign in with that account and open the link again.`;
    case "unauthenticated":
      return `Sign in as ${maskedEmail ?? "the correct account"} to continue resetting the Ledger PIN.`;
    case "invalid":
    case "missing":
    default:
      return "This Ledger PIN reset link is invalid. Request a fresh one from Settings.";
  }
}
