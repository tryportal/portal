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

type AuthView =
  | "default"
  | "email-verification"
  | "2fa"
  | "forgot-password"
  | "reset-password";

export function AuthForm({ mode }: AuthFormProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const router = useRouter();

  const isLoaded = isSignInLoaded && isSignUpLoaded;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [view, setView] = useState<AuthView>("default");
  const [useBackupCode, setUseBackupCode] = useState(false);

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
        } else if (result.status === "needs_second_factor") {
          setView("2fa");
          setCode("");
        } else {
          setError("Additional verification required. Please complete all steps.");
        }
      } else {
        await signUp!.create({
          emailAddress: email,
          password,
        });
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setView("email-verification");
        setCode("");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { code?: string; message: string }[] };
      setError(clerkError.errors?.[0]?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerification = async (e: React.FormEvent) => {
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

  const handle2FAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: useBackupCode ? "backup_code" : "totp",
        code,
      });

      if (result.status === "complete") {
        if (result.createdSessionId) {
          await setSignInActive!({ session: result.createdSessionId });
          router.push("/setup");
        } else {
          setError("Authentication failed. Please try again.");
        }
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setView("reset-password");
      setCode("");
      setNewPassword("");
    } catch (err: unknown) {
      const clerkError = err as { errors?: { longMessage?: string; message: string }[] };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (result.status === "needs_second_factor") {
        setView("2fa");
        setCode("");
      } else if (result.status === "complete") {
        if (result.createdSessionId) {
          await setSignInActive!({ session: result.createdSessionId });
          router.push("/setup");
        } else {
          setError("Authentication failed. Please try again.");
        }
      } else {
        setError("Password reset failed. Please try again.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { longMessage?: string; message: string }[] };
      setError(clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = () => {
    setView("default");
    setError("");
    setCode("");
    setNewPassword("");
    setUseBackupCode(false);
  };

  // Email verification view (sign-up)
  if (view === "email-verification") {
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

            <form onSubmit={handleEmailVerification} className="space-y-4">
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
                  onClick={resetToDefault}
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

  // 2FA verification view
  if (view === "2fa") {
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
              <h1 className="text-xl text-foreground">two-factor authentication</h1>
              <p className="text-sm text-muted-foreground">
                {useBackupCode
                  ? "enter one of your backup codes to continue"
                  : "enter the 6-digit code from your authenticator app"}
              </p>
            </div>

            <form onSubmit={handle2FAVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm text-muted-foreground">
                  {useBackupCode ? "backup code" : "verification code"}
                </Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={useBackupCode ? "enter backup code" : "enter 6-digit code"}
                  className="bg-background border-border rounded-none shadow-none"
                  required
                />
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <button
                  type="submit"
                  disabled={isLoading || !isLoaded || !code}
                  className="hover:opacity-95 active:translate-y-px flex items-center gap-2 bg-foreground text-background px-4 py-2 disabled:opacity-50"
                >
                  {isLoading ? <SpinnerGap className="size-4 animate-spin" /> : "verify"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setCode("");
                    setError("");
                  }}
                  className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                >
                  {useBackupCode ? "use authenticator app" : "use backup code"}
                </button>
                <button
                  type="button"
                  onClick={resetToDefault}
                  className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                >
                  back to sign in
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Forgot password view - enter email
  if (view === "forgot-password") {
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
              <h1 className="text-xl text-foreground">forgot your password?</h1>
              <p className="text-sm text-muted-foreground">
                enter your email address and we&apos;ll send you a code to reset your password
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
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

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <button
                  type="submit"
                  disabled={isLoading || !isLoaded || !email}
                  className="hover:opacity-95 active:translate-y-px flex items-center gap-2 bg-foreground text-background px-4 py-2 disabled:opacity-50"
                >
                  {isLoading ? <SpinnerGap className="size-4 animate-spin" /> : "send reset code"}
                </button>
                <button
                  type="button"
                  onClick={resetToDefault}
                  className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                >
                  back to sign in
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Reset password view - enter code and new password
  if (view === "reset-password") {
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
              <h1 className="text-xl text-foreground">reset your password</h1>
              <p className="text-sm text-muted-foreground">
                we sent a reset code to<br />
                <span className="text-foreground">{email}</span>
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm text-muted-foreground">reset code</Label>
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

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm text-muted-foreground">new password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="enter your new password"
                  className="bg-background border-border rounded-none shadow-none"
                  required
                />
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <button
                  type="submit"
                  disabled={isLoading || !isLoaded || !code || !newPassword}
                  className="hover:opacity-95 active:translate-y-px flex items-center gap-2 bg-foreground text-background px-4 py-2 disabled:opacity-50"
                >
                  {isLoading ? <SpinnerGap className="size-4 animate-spin" /> : "reset password"}
                </button>
                <button
                  type="button"
                  onClick={() => setView("forgot-password")}
                  className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                >
                  resend code
                </button>
                <button
                  type="button"
                  onClick={resetToDefault}
                  className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                >
                  back to sign in
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
                  <>
                    <Link
                      href="/sign-up"
                      className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                    >
                      create account
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setView("forgot-password");
                      }}
                      className="hover:text-foreground active:translate-y-px underline underline-offset-4 text-muted-foreground"
                    >
                      forgot password?
                    </button>
                  </>
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
