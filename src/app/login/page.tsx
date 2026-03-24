"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppIcon } from "@/components/ui/app-icon";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [step, setStep] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    router.prefetch(DEFAULT_WORKSPACE_ROUTE);
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (step === "signIn") {
        await signIn("password", { email, password, flow: "signIn" });
      } else {
        await signIn("password", { email, password, name, flow: "signUp" });
      }
      setRedirecting(true);
      router.replace(DEFAULT_WORKSPACE_ROUTE);
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
  };

  return (
    <>
      <div className="min-h-screen flex">
        {/* Left panel — branding */}
        <div className="hidden lg:flex lg:w-1/2 maddy-gradient-bg relative overflow-hidden items-center justify-center p-12">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 text-white text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="/app-icon.svg" alt="MadVibe" className="w-12 h-12 rounded-2xl" />
              <h1 className="text-4xl font-bold tracking-tight">MadVibe</h1>
            </div>
            <p className="text-xl text-white/80 font-medium mb-8">
              AI-Powered Personal BRAIN OS
            </p>
            <div className="space-y-4 text-white/70 text-sm max-w-sm mx-auto">
              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3 backdrop-blur">
                <AppIcon className="w-4 h-4 rounded-md" />
                <span>Maddy AI organises your thoughts automatically</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3 backdrop-blur">
                <span className="text-lg">⚡</span>
                <span>Real-time sync across all your devices</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3 backdrop-blur">
                <span className="text-lg">∞</span>
                <span>Unlimited pages, databases, and projects — free forever</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3 backdrop-blur">
                <span className="text-lg">🔒</span>
                <span>Your data, your control — zero vendor lock-in</span>
              </div>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-white/5" />
        </div>

        {/* Right panel — auth form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <img src="/app-icon.svg" alt="MadVibe" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold">MadVibe</span>
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {step === "signIn" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              {step === "signIn"
                ? "Sign in to your BRAIN OS"
                : "Start building your second brain"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === "signUp" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Johnson"
                    required={step === "signUp"}
                    autoComplete="name"
                  />
                </div>
              )}

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
                  placeholder={step === "signUp" ? "Min. 8 characters" : "••••••••"}
                  required
                  autoComplete={step === "signIn" ? "current-password" : "new-password"}
                  minLength={step === "signUp" ? 8 : undefined}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-background hover:opacity-90 transition-opacity"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {step === "signIn" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {step === "signIn" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setStep("signUp")}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setStep("signIn")}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <p className="mt-8 text-xs text-center text-muted-foreground">
              $0 forever · No credit card · Your data stays yours
            </p>
          </div>
        </div>
      </div>

      {/* Full-page redirect overlay */}
      {redirecting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <AppIcon variant="loader" className="w-12 h-12" />
            <p className="text-sm font-medium">Opening Overview...</p>
          </div>
        </div>
      )}
    </>
  );
}
