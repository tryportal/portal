"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useTheme } from "@/lib/theme-provider";

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
      if (mode === "sign-in") {
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
      } else {
        await signUp!.create({
          emailAddress: email,
          password,
        });
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingVerification(true);
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { code?: string; message: string }[] };
      setError(clerkError.errors?.[0]?.message || "Something went wrong");
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
      <main className="min-h-screen flex items-center justify-center bg-background font-[family-name:var(--font-jetbrains-mono)]">
        <div className="w-full max-w-xl px-6">
          <Link href="/home" className="flex items-center gap-4 mb-6">
            <Image
              src={isDark ? "/portal-dark.svg" : "/portal.svg"}
              alt="Portal"
              width={48}
              height={48}
              className="w-10 h-10"
            />
          </Link>

          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-xl text-foreground">check your email</h1>
              <p className="text-sm text-muted-foreground">
                we sent a verification code to<br />
                <span className="text-foreground">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm text-muted-foreground">verification code</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="enter 6-digit code"
                  className="bg-background border-border rounded-none shadow-none"
                  required
                />
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <button
                  type="submit"
                  disabled={isLoading || !isLoaded}
                  className="hover:opacity-95 active:translate-y-px flex items-center gap-2 bg-foreground text-background px-4 py-2 disabled:opacity-50"
                >
                  {isLoading ? <SpinnerGap className="size-4 animate-spin" /> : "verify email"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingVerification(false)}
                  className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                >
                  use different email
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  const isSignIn = mode === "sign-in";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background font-[family-name:var(--font-jetbrains-mono)]">
      <div className="w-full max-w-xl px-6">
        <Link href="/home" className="flex items-center gap-4 mb-6">
          <Image
            src={isDark ? "/portal-dark.svg" : "/portal.svg"}
            alt="Portal"
            width={48}
            height={48}
            className="w-10 h-10"
          />
        </Link>

        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl text-foreground">{isSignIn ? "welcome back" : "create your account"}</h1>
            <p className="text-sm text-muted-foreground">
              {isSignIn ? "sign in to continue to portal" : "get started with portal today"}
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading || !isLoaded}
              className="hover:opacity-95 active:translate-y-px flex items-center gap-2 bg-foreground text-background px-3 py-1.5 text-sm disabled:opacity-50 mb-8"
            >
              {isGoogleLoading ? (
                <SpinnerGap className="size-4 animate-spin" />
              ) : (
                <Image
                  src={isDark ? "/google-black-icon.svg" : "/google-white-icon.svg"}
                  alt="Google"
                  width={16}
                  height={16}
                />
              )}
              continue with google
            </button>

            <div className="text-xs text-muted-foreground uppercase">or continue with email</div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-background border-border rounded-none shadow-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-muted-foreground">password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignIn ? "enter your password" : "create a password"}
                  className="bg-background border-border rounded-none shadow-none"
                  required
                />
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <button
                  type="submit"
                  disabled={isLoading || !isLoaded || !email || !password}
                  className="hover:opacity-95 active:translate-y-px flex items-center gap-2 bg-foreground text-background px-4 py-2 disabled:opacity-50"
                >
                  {isLoading ? <SpinnerGap className="size-4 animate-spin" /> : "continue"}
                </button>
                {isSignIn ? (
                  <Link
                    href="/sign-up"
                    className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                  >
                    create account
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                  >
                    sign in
                  </Link>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
