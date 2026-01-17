"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerGap } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const router = useRouter();

  const isLoaded = isSignInLoaded && isSignUpLoaded;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleGoogleAuth = async () => {
    if (!isLoaded) return;
    setIsGoogleLoading(true);
    try {
      await signIn!.authenticateWithRedirect({
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn!.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setSignInActive!({ session: result.createdSessionId });
          router.push("/setup");
        } else {
          setError("Authentication failed. Please try again.");
        }
      } else {
        setError("Additional verification required. Please complete all steps.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { code?: string; message: string }[] };
      const errorCode = clerkError.errors?.[0]?.code;
      
      if (errorCode === "form_identifier_not_found") {
        try {
          await signUp!.create({
            emailAddress: email,
            password,
          });

          await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
          setPendingVerification(true);
        } catch (signUpErr: unknown) {
          const signUpError = signUpErr as { errors?: { message: string }[] };
          setError(signUpError.errors?.[0]?.message || "Something went wrong");
        }
      } else {
        setError(clerkError.errors?.[0]?.message || "Invalid email or password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signUp!.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setSignUpActive!({ session: result.createdSessionId });
          router.push("/setup");
        } else {
          setError("Authentication failed. Please try again.");
        }
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-primary/[0.03] to-transparent blur-3xl" />
          <div className="absolute -bottom-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-primary/[0.03] to-transparent blur-3xl" />
        </div>

        <div className="w-full max-w-[400px] relative">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-xl shadow-black/[0.03] dark:shadow-black/[0.2]">
            <div className="text-center mb-8">
              <Image
                src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
                alt="Portal"
                width={640}
                height={96}
                className="h-[50px] w-[190px] mx-auto mb-5"
              />
              <h1 className="text-2xl font-semibold tracking-tight">
                Check your email
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                We sent a verification code to
                <br />
                <span className="text-foreground font-medium">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerification} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="code"
                  className="text-xs font-medium text-foreground/70"
                >
                  Verification code
                </Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full h-11 px-4 bg-background/50 border-border/60 focus-visible:border-primary/50 transition-colors text-center tracking-widest text-lg"
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
                  "Verify email"
                )}
              </Button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => setPendingVerification(false)}
            className="mt-6 text-sm text-muted-foreground hover:text-primary w-full text-center transition-colors"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  const isSignIn = mode === "sign-in";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-primary/[0.03] to-transparent blur-3xl" />
        <div className="absolute -bottom-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-primary/[0.03] to-transparent blur-3xl" />
      </div>

      <div className="w-full max-w-[400px] relative">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-xl shadow-black/[0.03] dark:shadow-black/[0.2]">
          <div className="text-center mb-8">
            <Image
              src={isDark ? "/portal-dark-full.svg" : "/portal-full.svg"}
              alt="Portal"
              width={640}
              height={96}
              className="h-[50px] w-[190px] mx-auto mb-5"
            />
            <h1 className="text-2xl font-semibold tracking-tight">
              {isSignIn ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {isSignIn ? "Sign in to continue to Portal" : "Get started with Portal today"}
            </p>
          </div>

          <div className="space-y-5">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-11 gap-2.5 text-sm font-medium hover:bg-muted/50 transition-all duration-200"
              onClick={handleGoogleAuth}
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

            <form onSubmit={handleEmailAuth} className="space-y-4">
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
                  placeholder={isSignIn ? "Enter your password" : "Create a password"}
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
                  "Continue"
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isSignIn ? (
            <>
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-primary hover:underline font-medium transition-colors"
              >
                Create one
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-primary hover:underline font-medium transition-colors"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
