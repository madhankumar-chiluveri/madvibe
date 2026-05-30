"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  AuthField,
  AuthPanel,
  LoginBackdrop,
  LoginMotionBlock,
  MadVibeShowcase,
} from "@/components/auth/login-visuals";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";

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

  return (
    <>
      <main className="relative h-[100dvh] overflow-hidden bg-background text-foreground">
        <LoginBackdrop />

        <div className="relative z-10 grid h-full grid-cols-1 lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_560px]">
          <section className="hidden h-full min-h-0 items-center justify-center overflow-hidden px-8 py-[clamp(1rem,3vh,2.5rem)] lg:flex xl:px-14">
            <MadVibeShowcase />
          </section>

          <section className="flex h-full min-h-0 items-center justify-center overflow-y-auto scrollbar-hide px-5 py-6 sm:py-8 lg:py-10 [@media(max-height:850px)]:py-6 [@media(max-height:700px)]:py-3 sm:px-8 lg:px-10">
            <div className="w-full max-w-[460px]">
              <AuthPanel>
                <LoginMotionBlock delay={0.08} className="mb-6 sm:mb-7 [@media(max-height:750px)]:mb-3.5 [@media(max-height:650px)]:mb-2">
                  <div className="mb-5 sm:mb-6 flex items-center justify-between gap-4 [@media(max-height:750px)]:mb-3 [@media(max-height:750px)]:hidden">
                    <div className="flex items-center gap-3">
                      <AppIcon className="h-10 w-10 rounded-2xl shadow-sm" />
                      <div>
                        <p className="text-sm font-semibold leading-none">MadVibe</p>
                        <p className="mt-1 text-xs text-muted-foreground">AI workspace</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                      Private
                    </span>
                  </div>

                  <h2 className="text-3xl font-semibold tracking-tight sm:text-[2rem] [@media(max-height:750px)]:text-2xl [@media(max-height:650px)]:text-xl">
                    {step === "signIn" ? "Welcome back" : "Create your workspace"}
                  </h2>
                  <p className="mt-2.5 text-sm leading-6 text-muted-foreground [@media(max-height:750px)]:hidden">
                    {step === "signIn"
                      ? "Continue into your notes, tasks, ledger, and feeds."
                      : "Start with one private place for your ideas, routines, money, and daily signal."}
                  </p>
                </LoginMotionBlock>

                <LoginMotionBlock delay={0.14}>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="group h-11 sm:h-12 [@media(max-height:750px)]:h-11 [@media(max-height:650px)]:h-10 w-full gap-3 rounded-xl border-border/80 bg-background/72 text-[15px] shadow-[0_1px_0_rgb(var(--card-rgb)/0.9)_inset] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-card hover:shadow-[0_14px_36px_rgb(var(--foreground-rgb)/0.08)]"
                    onClick={() => handleGoogleSignIn({ forceAccountSelection: true })}
                    disabled={googleLoading || loading}
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GoogleMark />
                    )}
                    Continue with Google
                  </Button>
                </LoginMotionBlock>

                <LoginMotionBlock delay={0.18} className="relative my-5 sm:my-6 [@media(max-height:750px)]:my-3.5 [@media(max-height:650px)]:my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/80" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 font-medium text-muted-foreground">
                      or use email
                    </span>
                  </div>
                </LoginMotionBlock>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5 [@media(max-height:750px)]:space-y-3 [@media(max-height:650px)]:space-y-2">
                  {step === "signUp" ? (
                    <LoginMotionBlock delay={0.21}>
                      <AuthField
                        id="name"
                        icon={UserRound}
                        label="Your name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Johnson"
                        required
                        autoComplete="name"
                      />
                    </LoginMotionBlock>
                  ) : null}

                  <LoginMotionBlock delay={step === "signUp" ? 0.24 : 0.21}>
                    <AuthField
                      id="email"
                      icon={Mail}
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </LoginMotionBlock>

                  <LoginMotionBlock delay={step === "signUp" ? 0.27 : 0.24}>
                    <AuthField
                      id="password"
                      icon={LockKeyhole}
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={step === "signUp" ? "Min. 8 characters" : "Enter your password"}
                      required
                      autoComplete={step === "signIn" ? "current-password" : "new-password"}
                      minLength={step === "signUp" ? 8 : undefined}
                    />
                  </LoginMotionBlock>

                  <LoginMotionBlock delay={step === "signUp" ? 0.3 : 0.27}>
                    <Button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="group relative h-11 sm:h-12 [@media(max-height:750px)]:h-11 [@media(max-height:650px)]:h-10 w-full overflow-hidden rounded-xl bg-foreground text-[15px] font-semibold text-background shadow-[0_16px_40px_rgb(var(--foreground-rgb)/0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-foreground hover:shadow-[0_22px_48px_rgb(var(--foreground-rgb)/0.2)]"
                      size="lg"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/20 to-transparent transition-transform duration-700 ease-linear group-hover:translate-x-full" />
                      <span className="relative z-10 flex items-center gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {step === "signIn" ? "Open workspace" : "Create account"}
                        {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                      </span>
                    </Button>
                  </LoginMotionBlock>
                </form>

                <LoginMotionBlock delay={step === "signUp" ? 0.34 : 0.31}>
                  <div className="mt-5 sm:mt-6 [@media(max-height:750px)]:mt-3.5 [@media(max-height:650px)]:mt-2.5 rounded-xl border border-border/60 bg-background/56 px-4 py-2.5 sm:py-3 [@media(max-height:750px)]:py-2 [@media(max-height:650px)]:py-1.5 text-center text-sm [@media(max-height:750px)]:text-[13px] text-muted-foreground">
                    {step === "signIn" ? (
                      <>
                        Need a MadVibe account?{" "}
                        <button
                          type="button"
                          onClick={() => setStep("signUp")}
                          className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                        >
                          Create account
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setStep("signIn")}
                          className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </div>
                </LoginMotionBlock>
              </AuthPanel>
            </div>
          </section>
        </div>
      </main>

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
