"use client";

import * as SignIn from "@clerk/elements/sign-in";
import * as Clerk from "@clerk/elements/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { ArrowLeft } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { LightRays } from "@/components/ui/light-rays";

function OTPInput() {
  return (
    <Clerk.Input
      type="otp"
      autoSubmit
      className="flex flex-row gap-2 justify-center"
      render={({ value, status }) => (
        <div
          data-status={status}
          className="border-input data-[status=cursor]:border-foreground data-[status=selected]:border-foreground data-[status=cursor]:bg-muted/50 flex size-10 items-center justify-center border text-sm font-medium transition-colors"
        >
          {value}
        </div>
      )}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-foreground p-10 text-background lg:flex">
        <LightRays mouseInfluence={0} />
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <Image
            src="/portal.svg"
            alt="Portal"
            width={24}
            height={24}
            className="invert dark:invert-0"
          />
          <span className="text-sm font-medium">Portal</span>
        </Link>
        <div className="relative z-10 max-w-md" />
        <p className="relative z-10 text-xs text-background/40">
          &copy; {new Date().getFullYear()} Portal. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Mobile header */}
        <div className="flex items-center border-b border-border p-4 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/portal.svg" alt="Portal" width={20} height={20} className="dark:invert" />
            <span className="text-xs font-medium">Portal</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <SignIn.Root>
            {/* Step: Start */}
            <SignIn.Step name="start" className="w-full max-w-sm">
              <div className="mb-8">
                <h1 className="text-xl font-medium tracking-tight">
                  Welcome back
                </h1>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Sign in to your account to continue.
                </p>
              </div>
              <FieldGroup>
                <Clerk.Connection name="google" asChild>
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <Image src="/google-black-icon.svg" alt="Google" width={16} height={16} className="dark:hidden" />
                    <Image src="/google-white-icon.svg" alt="Google" width={16} height={16} className="hidden dark:block" />
                    Continue with Google
                  </Button>
                </Clerk.Connection>
                <FieldSeparator>or</FieldSeparator>
                <Clerk.Field name="identifier" asChild>
                  <Field>
                    <Clerk.Label asChild>
                      <FieldLabel>Email address</FieldLabel>
                    </Clerk.Label>
                    <Clerk.Input asChild>
                      <Input placeholder="you@example.com" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-destructive text-xs" />
                  </Field>
                </Clerk.Field>
                <SignIn.Action submit asChild>
                  <Button size="lg" className="w-full">
                    Continue
                  </Button>
                </SignIn.Action>
              </FieldGroup>
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/get-started"
                  className="text-foreground underline underline-offset-4 hover:no-underline"
                >
                  Get started
                </Link>
              </p>
            </SignIn.Step>

            {/* Step: Verifications */}
            <SignIn.Step name="verifications" className="w-full max-w-sm">
              <div className="mb-8">
                <h1 className="text-xl font-medium tracking-tight">
                  Verify your identity
                </h1>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  We&apos;ve sent a verification to{" "}
                  {/* @ts-expect-error - Clerk types don't include className but it works */}
                  <SignIn.SafeIdentifier className="font-medium text-foreground" />
                </p>
              </div>
              <FieldGroup>
                {/* Password strategy */}
                <SignIn.Strategy name="password">
                  <Clerk.Field name="password" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Password</FieldLabel>
                      </Clerk.Label>
                      <Clerk.Input asChild>
                        <Input type="password" />
                      </Clerk.Input>
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <SignIn.Action submit asChild>
                    <Button size="lg" className="w-full">
                      Sign in
                    </Button>
                  </SignIn.Action>
                  <div className="flex items-center justify-between">
                    <SignIn.Action navigate="forgot-password" asChild>
                      <button
                        type="button"
                        className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
                      >
                        Forgot password?
                      </button>
                    </SignIn.Action>
                    <SignIn.Action navigate="choose-strategy" asChild>
                      <button
                        type="button"
                        className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
                      >
                        Use another method
                      </button>
                    </SignIn.Action>
                  </div>
                </SignIn.Strategy>

                {/* Email code strategy */}
                <SignIn.Strategy name="email_code">
                  <Clerk.Field name="code" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Email code</FieldLabel>
                      </Clerk.Label>
                      <OTPInput />
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <SignIn.Action submit asChild>
                    <Button size="lg" className="w-full">
                      Verify
                    </Button>
                  </SignIn.Action>
                  <SignIn.Action
                    resend
                    asChild
                    fallback={<p className="text-center text-xs text-muted-foreground">Resend code</p>}
                  >
                    <button
                      type="button"
                      className="text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Resend code
                    </button>
                  </SignIn.Action>
                </SignIn.Strategy>

                {/* Phone code strategy */}
                <SignIn.Strategy name="phone_code">
                  <Clerk.Field name="code" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Phone code</FieldLabel>
                      </Clerk.Label>
                      <OTPInput />
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <SignIn.Action submit asChild>
                    <Button size="lg" className="w-full">
                      Verify
                    </Button>
                  </SignIn.Action>
                </SignIn.Strategy>

                {/* TOTP */}
                <SignIn.Strategy name="totp">
                  <Clerk.Field name="code" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Authenticator code</FieldLabel>
                      </Clerk.Label>
                      <OTPInput />
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <SignIn.Action submit asChild>
                    <Button size="lg" className="w-full">
                      Verify
                    </Button>
                  </SignIn.Action>
                  <SignIn.Action navigate="choose-strategy" asChild>
                    <button
                      type="button"
                      className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
                    >
                      Use another method
                    </button>
                  </SignIn.Action>
                </SignIn.Strategy>

                {/* Backup code */}
                <SignIn.Strategy name="backup_code">
                  <Clerk.Field name="code" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Backup code</FieldLabel>
                      </Clerk.Label>
                      <Clerk.Input asChild>
                        <Input placeholder="Enter a backup code" />
                      </Clerk.Input>
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <SignIn.Action submit asChild>
                    <Button size="lg" className="w-full">
                      Verify
                    </Button>
                  </SignIn.Action>
                </SignIn.Strategy>

                {/* Password reset via email code */}
                <SignIn.Strategy name="reset_password_email_code">
                  <Clerk.Field name="code" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Reset code</FieldLabel>
                      </Clerk.Label>
                      <OTPInput />
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <SignIn.Action submit asChild>
                    <Button size="lg" className="w-full">
                      Verify
                    </Button>
                  </SignIn.Action>
                  <SignIn.Action
                    resend
                    asChild
                    fallback={<p className="text-center text-xs text-muted-foreground">Resend code</p>}
                  >
                    <button
                      type="button"
                      className="text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Resend code
                    </button>
                  </SignIn.Action>
                </SignIn.Strategy>
              </FieldGroup>
              <div className="mt-6 text-center">
                <SignIn.Action navigate="start" asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" />
                    Use a different account
                  </button>
                </SignIn.Action>
              </div>
            </SignIn.Step>

            {/* Step: Choose strategy */}
            <SignIn.Step name="choose-strategy" className="w-full max-w-sm">
              <div className="mb-8">
                <h1 className="text-xl font-medium tracking-tight">
                  Choose a method
                </h1>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Select how you&apos;d like to verify your identity.
                </p>
              </div>
              <FieldGroup>
                <SignIn.SupportedStrategy name="email_code" asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    Email code
                  </Button>
                </SignIn.SupportedStrategy>
                <SignIn.SupportedStrategy name="password" asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    Password
                  </Button>
                </SignIn.SupportedStrategy>
                <SignIn.SupportedStrategy name="phone_code" asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    Phone code
                  </Button>
                </SignIn.SupportedStrategy>
                <SignIn.SupportedStrategy name="totp" asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    Authenticator app
                  </Button>
                </SignIn.SupportedStrategy>
                <SignIn.SupportedStrategy name="backup_code" asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    Backup code
                  </Button>
                </SignIn.SupportedStrategy>
              </FieldGroup>
              <div className="mt-6 text-center">
                <SignIn.Action navigate="previous" asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" />
                    Go back
                  </button>
                </SignIn.Action>
              </div>
            </SignIn.Step>

            {/* Step: Forgot password */}
            <SignIn.Step name="forgot-password" className="w-full max-w-sm">
              <div className="mb-8">
                <h1 className="text-xl font-medium tracking-tight">
                  Reset your password
                </h1>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  We&apos;ll send a reset code to your email address.
                </p>
              </div>
              <FieldGroup>
                <SignIn.SupportedStrategy
                  name="reset_password_email_code"
                  asChild
                >
                  <Button size="lg" className="w-full">
                    Send reset code
                  </Button>
                </SignIn.SupportedStrategy>
              </FieldGroup>
              <div className="mt-6 text-center">
                <SignIn.Action navigate="previous" asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" />
                    Go back
                  </button>
                </SignIn.Action>
              </div>
            </SignIn.Step>

            {/* Step: Reset password */}
            <SignIn.Step name="reset-password" className="w-full max-w-sm">
              <div className="mb-8">
                <h1 className="text-xl font-medium tracking-tight">
                  New password
                </h1>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Enter your new password below.
                </p>
              </div>
              <FieldGroup>
                <Clerk.Field name="password" asChild>
                  <Field>
                    <Clerk.Label asChild>
                      <FieldLabel>New password</FieldLabel>
                    </Clerk.Label>
                    <Clerk.Input asChild>
                      <Input type="password" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-destructive text-xs" />
                  </Field>
                </Clerk.Field>
                <Clerk.Field name="confirmPassword" asChild>
                  <Field>
                    <Clerk.Label asChild>
                      <FieldLabel>Confirm password</FieldLabel>
                    </Clerk.Label>
                    <Clerk.Input asChild>
                      <Input type="password" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-destructive text-xs" />
                  </Field>
                </Clerk.Field>
                <SignIn.Action submit asChild>
                  <Button size="lg" className="w-full">
                    Reset password
                  </Button>
                </SignIn.Action>
              </FieldGroup>
              <div className="mt-6 text-center">
                <SignIn.Action navigate="start" asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" />
                    Back to sign in
                  </button>
                </SignIn.Action>
              </div>
            </SignIn.Step>
          </SignIn.Root>
        </div>
      </div>
    </div>
  );
}
