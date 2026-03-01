"use client";

import * as SignUp from "@clerk/elements/sign-up";
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

export default function GetStartedPage() {
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
            className="invert"
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
            <Image src="/portal.svg" alt="Portal" width={20} height={20} />
            <span className="text-xs font-medium">Portal</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <SignUp.Root path="/get-started">
            {/* Step: Start */}
            <SignUp.Step name="start" className="w-full max-w-sm">
              <div className="mb-8">
                <h1 className="text-xl font-medium tracking-tight">
                  Create your account
                </h1>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Get started with Portal for free.
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
                <div className="grid grid-cols-2 gap-3">
                  <Clerk.Field name="firstName" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>First name</FieldLabel>
                      </Clerk.Label>
                      <Clerk.Input asChild>
                        <Input placeholder="First" />
                      </Clerk.Input>
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <Clerk.Field name="lastName" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Last name</FieldLabel>
                      </Clerk.Label>
                      <Clerk.Input asChild>
                        <Input placeholder="Last" />
                      </Clerk.Input>
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                </div>
                <Clerk.Field name="emailAddress" asChild>
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
                <SignUp.Captcha />
                <SignUp.Action submit asChild>
                  <Button size="lg" className="w-full">
                    Create account
                  </Button>
                </SignUp.Action>
              </FieldGroup>
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-foreground underline underline-offset-4 hover:no-underline"
                >
                  Sign in
                </Link>
              </p>
            </SignUp.Step>

            {/* Step: Continue */}
            <SignUp.Step name="continue" className="w-full max-w-sm">
              <div className="mb-8">
                <h1 className="text-xl font-medium tracking-tight">
                  Complete your profile
                </h1>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Fill in the remaining details to continue.
                </p>
              </div>
              <FieldGroup>
                <Clerk.Field name="firstName" asChild>
                  <Field>
                    <Clerk.Label asChild>
                      <FieldLabel>First name</FieldLabel>
                    </Clerk.Label>
                    <Clerk.Input asChild>
                      <Input placeholder="First" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-destructive text-xs" />
                  </Field>
                </Clerk.Field>
                <Clerk.Field name="lastName" asChild>
                  <Field>
                    <Clerk.Label asChild>
                      <FieldLabel>Last name</FieldLabel>
                    </Clerk.Label>
                    <Clerk.Input asChild>
                      <Input placeholder="Last" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-destructive text-xs" />
                  </Field>
                </Clerk.Field>
                <Clerk.Field name="username" asChild>
                  <Field>
                    <Clerk.Label asChild>
                      <FieldLabel>Username</FieldLabel>
                    </Clerk.Label>
                    <Clerk.Input asChild>
                      <Input placeholder="username" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-destructive text-xs" />
                  </Field>
                </Clerk.Field>
                <SignUp.Action submit asChild>
                  <Button size="lg" className="w-full">
                    Continue
                  </Button>
                </SignUp.Action>
              </FieldGroup>
            </SignUp.Step>

            {/* Step: Verifications */}
            <SignUp.Step name="verifications" className="w-full max-w-sm">
              <div className="mb-8">
                <h1 className="text-xl font-medium tracking-tight">
                  Verify your email
                </h1>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Enter the verification code sent to your email.
                </p>
              </div>
              <FieldGroup>
                <SignUp.Strategy name="email_code">
                  <Clerk.Field name="code" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Verification code</FieldLabel>
                      </Clerk.Label>
                      <OTPInput />
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <SignUp.Action submit asChild>
                    <Button size="lg" className="w-full">
                      Verify
                    </Button>
                  </SignUp.Action>
                </SignUp.Strategy>

                <SignUp.Strategy name="phone_code">
                  <Clerk.Field name="code" asChild>
                    <Field>
                      <Clerk.Label asChild>
                        <FieldLabel>Phone verification code</FieldLabel>
                      </Clerk.Label>
                      <OTPInput />
                      <Clerk.FieldError className="text-destructive text-xs" />
                    </Field>
                  </Clerk.Field>
                  <SignUp.Action submit asChild>
                    <Button size="lg" className="w-full">
                      Verify
                    </Button>
                  </SignUp.Action>
                </SignUp.Strategy>
              </FieldGroup>
              <div className="mt-6 text-center">
                <SignUp.Action navigate="start" asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" />
                    Use a different email
                  </button>
                </SignUp.Action>
              </div>
            </SignUp.Step>
          </SignUp.Root>
        </div>
      </div>
    </div>
  );
}
