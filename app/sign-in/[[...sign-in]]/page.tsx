"use client";

import { useSignIn } from "@clerk/nextjs";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerGap } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return;
    setIsGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/setup",
      });
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message || "Something went wrong");
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          router.push("/setup");
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/setup");
      } else {
        // Handle other statuses like 2FA requirements
        setError("Additional verification required. Please check your email or authenticator app.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-primary/[0.03] to-transparent blur-3xl" />
        <div className="absolute -bottom-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-primary/[0.03] to-transparent blur-3xl" />
      </div>

      <div className="w-full max-w-[400px] relative">
        {/* Card container */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-xl shadow-black/[0.03] dark:shadow-black/[0.2]">
          {/* Header */}
          <div className="text-center mb-8">
            <Image
              src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
              alt="Portal"
              width={640}
              height={96}
              className="h-[50px] w-[190px] mx-auto mb-5"
            />
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Sign in to continue to Portal
            </p>
          </div>

          <div className="space-y-5">
            {/* Google button */}
            <Button
              variant="outline"
              size="lg"
              className="w-full h-11 gap-2.5 text-sm font-medium hover:bg-muted/50 transition-all duration-200"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || !isLoaded}
            >
              {isGoogleLoading ? (
                <SpinnerGap className="size-4 animate-spin" />
              ) : (
                <Image
                  src={
                    isDark ? "/google-white-icon.svg" : "/google-black-icon.svg"
                  }
                  alt="Google"
                  width={16}
                  height={16}
                  className="size-4"
                />
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-medium text-foreground/70"
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-4 bg-background/50 border-border/60 focus-visible:border-primary/50 transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-foreground/70"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 px-4 bg-background/50 border-border/60 focus-visible:border-primary/50 transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  <svg
                    className="size-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-11 text-sm font-medium transition-all duration-200"
                disabled={isLoading || !isLoaded}
              >
                {isLoading ? (
                  <SpinnerGap className="size-4 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer outside card */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="text-primary hover:underline font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
