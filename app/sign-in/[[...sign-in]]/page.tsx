"use client";

import * as SignIn from "@clerk/elements/sign-in";
import * as Clerk from "@clerk/elements/common";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Navbar } from "@/components/navbar";
import { GoogleLogo } from "@phosphor-icons/react";

function OTPInput() {
  return (
    <Clerk.Input
      type="otp"
      autoSubmit
      render={({ value, status }) => (
        <div
          data-status={status}
          className="border-input data-[status=cursor]:border-ring data-[status=selected]:border-ring flex h-9 w-8 items-center justify-center border bg-transparent text-sm font-medium"
        >
          {value}
        </div>
      )}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-4">
        <SignIn.Root>
          {/* Step: Start - Email/identifier entry */}
          <SignIn.Step name="start">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Sign in to Portal</CardTitle>
                <CardDescription>Welcome back! Enter your details to continue.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Clerk.Connection name="google" asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <GoogleLogo weight="bold" className="size-4" />
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
                    <Button className="w-full">Continue</Button>
                  </SignIn.Action>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-center">
                <p className="text-muted-foreground text-xs">
                  Don&apos;t have an account?{" "}
                  <Clerk.Link navigate="sign-up" className="text-foreground underline underline-offset-4">
                    Get started
                  </Clerk.Link>
                </p>
              </CardFooter>
            </Card>
          </SignIn.Step>

          {/* Step: Verifications - Password, OTP, 2FA */}
          <SignIn.Step name="verifications">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Verify your identity</CardTitle>
                <CardDescription>
                  We&apos;ve sent a verification to <SignIn.SafeIdentifier />.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                      <Button className="w-full">Sign in</Button>
                    </SignIn.Action>
                    <div className="flex items-center justify-between">
                      <SignIn.Action navigate="forgot-password" asChild>
                        <button type="button" className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground">
                          Forgot password?
                        </button>
                      </SignIn.Action>
                      <SignIn.Action navigate="choose-strategy" asChild>
                        <button type="button" className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground">
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
                        <div className="flex justify-center gap-1">
                          <OTPInput />
                        </div>
                        <Clerk.FieldError className="text-destructive text-xs" />
                      </Field>
                    </Clerk.Field>
                    <SignIn.Action submit asChild>
                      <Button className="w-full">Verify</Button>
                    </SignIn.Action>
                  </SignIn.Strategy>

                  {/* Phone code strategy */}
                  <SignIn.Strategy name="phone_code">
                    <Clerk.Field name="code" asChild>
                      <Field>
                        <Clerk.Label asChild>
                          <FieldLabel>Phone code</FieldLabel>
                        </Clerk.Label>
                        <div className="flex justify-center gap-1">
                          <OTPInput />
                        </div>
                        <Clerk.FieldError className="text-destructive text-xs" />
                      </Field>
                    </Clerk.Field>
                    <SignIn.Action submit asChild>
                      <Button className="w-full">Verify</Button>
                    </SignIn.Action>
                  </SignIn.Strategy>

                  {/* TOTP (2FA authenticator app) */}
                  <SignIn.Strategy name="totp">
                    <Clerk.Field name="code" asChild>
                      <Field>
                        <Clerk.Label asChild>
                          <FieldLabel>Authenticator code</FieldLabel>
                        </Clerk.Label>
                        <div className="flex justify-center gap-1">
                          <OTPInput />
                        </div>
                        <Clerk.FieldError className="text-destructive text-xs" />
                      </Field>
                    </Clerk.Field>
                    <SignIn.Action submit asChild>
                      <Button className="w-full">Verify</Button>
                    </SignIn.Action>
                    <SignIn.Action navigate="choose-strategy" asChild>
                      <button type="button" className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground">
                        Use another method
                      </button>
                    </SignIn.Action>
                  </SignIn.Strategy>

                  {/* Backup code strategy */}
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
                      <Button className="w-full">Verify</Button>
                    </SignIn.Action>
                  </SignIn.Strategy>

                  {/* Password reset via email code */}
                  <SignIn.Strategy name="reset_password_email_code">
                    <Clerk.Field name="code" asChild>
                      <Field>
                        <Clerk.Label asChild>
                          <FieldLabel>Reset code</FieldLabel>
                        </Clerk.Label>
                        <div className="flex justify-center gap-1">
                          <OTPInput />
                        </div>
                        <Clerk.FieldError className="text-destructive text-xs" />
                      </Field>
                    </Clerk.Field>
                    <SignIn.Action submit asChild>
                      <Button className="w-full">Verify</Button>
                    </SignIn.Action>
                  </SignIn.Strategy>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-center">
                <SignIn.Action navigate="start" asChild>
                  <button type="button" className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground">
                    Use a different account
                  </button>
                </SignIn.Action>
              </CardFooter>
            </Card>
          </SignIn.Step>

          {/* Step: Choose strategy */}
          <SignIn.Step name="choose-strategy">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Choose a method</CardTitle>
                <CardDescription>
                  Select a verification method to continue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <SignIn.SupportedStrategy name="email_code" asChild>
                    <Button variant="outline" className="w-full">Email code</Button>
                  </SignIn.SupportedStrategy>
                  <SignIn.SupportedStrategy name="password" asChild>
                    <Button variant="outline" className="w-full">Password</Button>
                  </SignIn.SupportedStrategy>
                  <SignIn.SupportedStrategy name="phone_code" asChild>
                    <Button variant="outline" className="w-full">Phone code</Button>
                  </SignIn.SupportedStrategy>
                  <SignIn.SupportedStrategy name="totp" asChild>
                    <Button variant="outline" className="w-full">Authenticator app</Button>
                  </SignIn.SupportedStrategy>
                  <SignIn.SupportedStrategy name="backup_code" asChild>
                    <Button variant="outline" className="w-full">Backup code</Button>
                  </SignIn.SupportedStrategy>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-center">
                <SignIn.Action navigate="previous" asChild>
                  <button type="button" className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground">
                    Go back
                  </button>
                </SignIn.Action>
              </CardFooter>
            </Card>
          </SignIn.Step>

          {/* Step: Forgot password */}
          <SignIn.Step name="forgot-password">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Forgot your password?</CardTitle>
                <CardDescription>
                  We&apos;ll send a reset code to your email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <SignIn.SupportedStrategy name="reset_password_email_code" asChild>
                    <Button className="w-full">Send reset code</Button>
                  </SignIn.SupportedStrategy>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-center">
                <SignIn.Action navigate="previous" asChild>
                  <button type="button" className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground">
                    Go back
                  </button>
                </SignIn.Action>
              </CardFooter>
            </Card>
          </SignIn.Step>

          {/* Step: Reset password */}
          <SignIn.Step name="reset-password">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Reset your password</CardTitle>
                <CardDescription>Enter your new password below.</CardDescription>
              </CardHeader>
              <CardContent>
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
                    <Button className="w-full">Reset password</Button>
                  </SignIn.Action>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-center">
                <SignIn.Action navigate="start" asChild>
                  <button type="button" className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground">
                    Back to sign in
                  </button>
                </SignIn.Action>
              </CardFooter>
            </Card>
          </SignIn.Step>
        </SignIn.Root>
      </div>
    </div>
  );
}
