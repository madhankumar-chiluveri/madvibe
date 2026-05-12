"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Delete, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { WorkspaceTopBar } from "@/components/workspace/workspace-top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LEDGER_PIN_LENGTH = 4;

function isValidLedgerPin(pin: string) {
  return /^\d{4}$/.test(pin.trim());
}

function getUnlockStorageKey(userId: string) {
  return `madvibe-ledger-unlocked:${userId}`;
}

function PinDots({ value }: { value: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: LEDGER_PIN_LENGTH }).map((_, index) => {
        const filled = index < value.length;
        return (
          <div
            key={index}
            className={cn(
              "flex h-14 items-center justify-center rounded-2xl border text-xl font-semibold transition-colors",
              filled
                ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                : "border-white/10 bg-white/[0.03] text-zinc-600"
            )}
          >
            {filled ? (
              <span className="h-3 w-3 rounded-full bg-current" aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function LedgerSecurityGate({ children }: { children: ReactNode }) {
  const user = useQuery(api.workspaces.getCurrentUser);
  const status = useQuery(api.ledgerSecurity.getPinStatus);
  const createPin = useMutation(api.ledgerSecurity.createPin);
  const verifyPin = useMutation(api.ledgerSecurity.verifyPin);

  const [unlocked, setUnlocked] = useState(false);
  const [pinDigits, setPinDigits] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const userId = useMemo(() => {
    const rawId = (user as { _id?: string } | null | undefined)?._id;
    return rawId ? String(rawId) : "";
  }, [user]);

  const pinVersion = String(status?.pinUpdatedAt ?? "");

  useEffect(() => {
    if (typeof window === "undefined" || !userId || !status?.hasPin || !pinVersion) {
      setUnlocked(false);
      return;
    }

    const stored = window.sessionStorage.getItem(getUnlockStorageKey(userId));
    setUnlocked(stored === pinVersion);
  }, [pinVersion, status?.hasPin, userId]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !userId ||
      !status?.hasPin ||
      !pinVersion ||
      !unlocked
    ) {
      return;
    }

    window.sessionStorage.setItem(getUnlockStorageKey(userId), pinVersion);
  }, [pinVersion, status?.hasPin, unlocked, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      return;
    }

    if (!status?.hasPin) {
      window.sessionStorage.removeItem(getUnlockStorageKey(userId));
    }
  }, [status?.hasPin, userId]);

  useEffect(() => {
    if (!status?.hasPin || unlocked || submitting) {
      return;
    }

    if (pinDigits.length !== LEDGER_PIN_LENGTH) {
      return;
    }

    void handleUnlock(pinDigits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinDigits, status?.hasPin, unlocked, submitting]);

  useEffect(() => {
    if (typeof window === "undefined" || !status?.hasPin || unlocked) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (submitting) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setPinDigits((current) =>
          current.length >= LEDGER_PIN_LENGTH ? current : `${current}${event.key}`
        );
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setPinDigits((current) => current.slice(0, -1));
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setPinDigits("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status?.hasPin, submitting, unlocked]);

  async function handleUnlock(candidate = pinDigits) {
    const pin = candidate.trim();
    if (!isValidLedgerPin(pin)) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyPin({ pin });
      if (!result.ok) {
        setPinDigits("");
        toast.error(result.message ?? "That PIN is incorrect.");
        return;
      }

      setPinDigits("");
      setUnlocked(true);
      toast.success("Ledger unlocked");
    } catch (error: any) {
      setPinDigits("");
      toast.error(error?.message ?? "Ledger could not be unlocked.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreatePin() {
    if (!isValidLedgerPin(setupPin)) {
      toast.error("Use a 4-digit PIN for Ledger security.");
      return;
    }

    if (setupPin !== confirmPin) {
      toast.error("PIN confirmation does not match.");
      return;
    }

    setSubmitting(true);
    try {
      await createPin({ pin: setupPin });
      setSetupPin("");
      setConfirmPin("");
      setUnlocked(true);
      toast.success("Ledger PIN created");
    } catch (error: any) {
      toast.error(error?.message ?? "Ledger PIN could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  function appendDigit(digit: string) {
    if (submitting) return;
    setPinDigits((current) =>
      current.length >= LEDGER_PIN_LENGTH ? current : `${current}${digit}`
    );
  }

  function removeDigit() {
    if (submitting) return;
    setPinDigits((current) => current.slice(0, -1));
  }

  if (status === undefined || user === undefined) {
    return (
      <div className="min-h-full bg-background">
        <WorkspaceTopBar moduleTitle="Ledger" />
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center px-4 py-10">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#151412] px-5 py-4 text-sm text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Ledger security...
          </div>
        </div>
      </div>
    );
  }

  if (unlocked || !status) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full bg-background">
      <WorkspaceTopBar moduleTitle="Ledger" />

      <div
        className={cn(
          "mx-auto flex min-h-[calc(100vh-5rem)] items-center px-4 py-8",
          status.hasPin ? "max-w-md" : "max-w-xl"
        )}
      >
        <div
          className={cn(
            "w-full rounded-[28px] border border-white/10 bg-[#141311] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
            status.hasPin ? "p-5 sm:p-6" : "p-6"
          )}
        >
          <div
            className={cn(
              "gap-4",
              status.hasPin
                ? "mb-5 flex flex-col items-center text-center"
                : "mb-6 flex items-start justify-between"
            )}
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Ledger Security
              </div>
              <h1
                className={cn(
                  "font-semibold tracking-tight",
                  status.hasPin ? "mt-3 text-xl" : "mt-4 text-2xl"
                )}
              >
                {status.hasPin ? "Enter your Ledger PIN" : "Create a Ledger PIN"}
              </h1>
              <p
                className={cn(
                  "text-sm text-zinc-400",
                  status.hasPin ? "mt-2 leading-5" : "mt-2 leading-6"
                )}
              >
                {status.hasPin
                  ? "Enter the 4-digit PIN to unlock Ledger for this tab session."
                  : "Add a dedicated 4-digit PIN before opening Ledger. Later changes happen through a reset link sent to your email."}
              </p>
            </div>

            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-400",
                status.hasPin ? "p-2.5" : "p-3"
              )}
            >
              <LockKeyhole className="h-5 w-5" />
            </div>
          </div>

          {status.hasPin ? (
            <div className="space-y-4">
              <PinDots value={pinDigits} />

              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => appendDigit(digit)}
                    disabled={submitting}
                    className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] text-base font-semibold text-zinc-100 transition-colors hover:bg-white/[0.07] disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPinDigits("")}
                  disabled={submitting}
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-zinc-100 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => appendDigit("0")}
                  disabled={submitting}
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] text-base font-semibold text-zinc-100 transition-colors hover:bg-white/[0.07] disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={removeDigit}
                  disabled={submitting}
                  className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-zinc-100 disabled:opacity-50"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    New PIN
                  </label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={LEDGER_PIN_LENGTH}
                    value={setupPin}
                    onChange={(event) =>
                      setSetupPin(event.target.value.replace(/\D/g, "").slice(0, LEDGER_PIN_LENGTH))
                    }
                    placeholder="4 digits"
                    className="h-12 rounded-2xl border-white/10 bg-[#181715] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Confirm PIN
                  </label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={LEDGER_PIN_LENGTH}
                    value={confirmPin}
                    onChange={(event) =>
                      setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, LEDGER_PIN_LENGTH))
                    }
                    placeholder="Repeat PIN"
                    className="h-12 rounded-2xl border-white/10 bg-[#181715] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-white/15"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
                Reset emails will go to{" "}
                <span className="font-medium text-zinc-200">
                  {status.maskedEmail ?? status.email ?? "your account email"}
                </span>
                .
              </div>

              <Button
                type="button"
                className="h-12 w-full rounded-2xl bg-white text-black hover:bg-zinc-200"
                onClick={() => void handleCreatePin()}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Create Ledger PIN
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
