"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type SavedAccount, getAccounts } from "@/lib/account-manager";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getSafeRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_WORKSPACE_ROUTE;
  }

  return value;
}

function buildGoogleLoginUrl({
  redirectTo,
  loginHint,
  forceAccountSelection,
}: {
  redirectTo: string;
  loginHint?: string;
  forceAccountSelection?: boolean;
}) {
  const params = new URLSearchParams({ redirectTo });

  if (loginHint) {
    params.set("login_hint", loginHint);
  } else if (forceAccountSelection) {
    params.set("prompt", "select_account");
  }

  return `/api/auth/signin/google?${params.toString()}`;
}

function GoogleMark() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const autoStartedGoogleRef = useRef(false);
  const [hintEmail, setHintEmail] = useState("");
  const [hintProvider, setHintProvider] = useState("");
  const [redirectTo, setRedirectTo] = useState<string>(DEFAULT_WORKSPACE_ROUTE);

  const [step, setStep] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    router.prefetch(DEFAULT_WORKSPACE_ROUTE);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const nextHintEmail = params.get("hint") ?? "";
    const nextHintProvider = params.get("provider") ?? "";
    const nextRedirectTo = getSafeRedirectTarget(params.get("redirectTo"));

    setHintEmail(nextHintEmail);
    setHintProvider(nextHintProvider);
    setRedirectTo(nextRedirectTo);
  }, []);

  useEffect(() => {
    setSavedAccounts(getAccounts());
  }, []);

  useEffect(() => {
    if (!hintEmail) return;
    setStep("signIn");
    setEmail(hintEmail);
  }, [hintEmail]);

  useEffect(() => {
    if (hintProvider !== "google" || autoStartedGoogleRef.current) {
      return;
    }

    autoStartedGoogleRef.current = true;
    handleGoogleSignIn({ loginHint: hintEmail || undefined });
  }, [hintEmail, hintProvider]);

  function handleGoogleSignIn(options?: {
    loginHint?: string;
    forceAccountSelection?: boolean;
  }) {
    setGoogleLoading(true);
    window.location.assign(
      buildGoogleLoginUrl({
        redirectTo,
        loginHint: options?.loginHint,
        forceAccountSelection: options?.forceAccountSelection,
      })
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (step === "signIn") {
        await signIn("password", { email, password, flow: "signIn" });
      } else {
        await signIn("password", { email, password, name, flow: "signUp" });
      }

      setRedirecting(true);
      router.replace(redirectTo);
    } catch (err: any) {
      const message = err?.message ?? "";

      if (message.includes("reading 'redirect'")) {
        toast.error(
          "Authentication service is not ready. Sync Convex (`npx convex dev --once`) and retry."
        );
      } else {
        toast.error(message || "Authentication failed. Please try again.");
      }

      setLoading(false);
    }
  }

  function handleSavedAccountSelect(account: SavedAccount) {
    setStep("signIn");
    setEmail(account.email);

    if (account.provider === "google") {
      handleGoogleSignIn({ loginHint: account.email });
      return;
    }

    toast.message("Password account selected", {
      description: "Enter your password to continue.",
    });
  }

  return (
    <>
      <div className="flex min-h-screen bg-background">
        <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 items-center justify-center p-12 maddy-gradient-bg">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-white/5 blur-2xl" />

          <div className="relative z-10 max-w-lg text-center text-white">
            <div className="mb-6 flex items-center justify-center gap-3">
              <img src="/app-icon.svg" alt="MadVibe" className="h-12 w-12 rounded-2xl" />
              <h1 className="text-4xl font-bold tracking-tight">MadVibe</h1>
            </div>

            <p className="mb-8 text-xl font-medium text-white/82">
              AI-powered personal BRAIN OS
            </p>

            <div className="mx-auto max-w-sm space-y-4 text-left text-sm text-white/78">
              <div className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-md">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Maddy AI organizes your thoughts, tasks, and notes automatically.</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-md">
                <Zap className="h-4 w-4 shrink-0" />
                <span>Real-time sync keeps your workspaces ready on every device.</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-md">
                <Cloud className="h-4 w-4 shrink-0" />
                <span>Unlimited pages, databases, and projects in one calm workspace.</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-md">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Your data stays under your control with zero vendor lock-in.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <img src="/app-icon.svg" alt="MadVibe" className="h-8 w-8 rounded-lg" />
              <span className="text-xl font-bold">MadVibe</span>
            </div>

            <h2 className="mb-2 text-2xl font-bold">
              {step === "signIn" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {step === "signIn"
                ? "Sign in to your BRAIN OS"
                : "Start building your second brain"}
            </p>

            {savedAccounts.length > 0 ? (
              <div className="mb-6 space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Recent accounts
                </div>
                <div className="text-xs leading-5 text-muted-foreground">
                  Saved Google accounts try the matching account first. The main Google button opens the chooser.
                </div>
                <div className="space-y-2">
                  {savedAccounts.map((account) => {
                    const isHinted = hintEmail === account.email;
                    const initials = getInitials(account.name || account.email);

                    return (
                      <button
                        key={account.userId}
                        type="button"
                        onClick={() => handleSavedAccountSelect(account)}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors touch-manipulation",
                          isHinted
                            ? "border-primary/40 bg-accent/70"
                            : "border-border/70 bg-background hover:bg-accent/60"
                        )}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={account.image} />
                          <AvatarFallback className="bg-foreground text-xs text-background">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-5 break-words">
                            {account.name}
                          </div>
                          <div className="text-xs leading-4 text-muted-foreground break-all">
                            {account.email}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-full border border-border/70 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          {account.provider === "google" ? "Fast Google" : "Password"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mb-4 w-full gap-3 touch-manipulation"
              onClick={() => handleGoogleSignIn({ forceAccountSelection: true })}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleMark />
              )}
              Choose Google account
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === "signUp" ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Johnson"
                    required
                    autoComplete="name"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={step === "signUp" ? "Min. 8 characters" : "Enter your password"}
                  required
                  autoComplete={step === "signIn" ? "current-password" : "new-password"}
                  minLength={step === "signUp" ? 8 : undefined}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full touch-manipulation bg-foreground text-background transition-opacity hover:opacity-90"
                size="lg"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {step === "signIn" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {step === "signIn" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setStep("signUp")}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setStep("signIn")}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              $0 forever | No credit card | Your data stays yours
            </p>
          </div>
        </div>
      </div>

      {redirecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <AppIcon variant="loader" className="h-12 w-12" />
            <p className="text-sm font-medium">Opening Overview...</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
