"use client";

import * as SignUp from "@clerk/elements/sign-up";
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

export default function GetStartedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center p-4">
        <SignUp.Root path="/get-started">
          {/* Step: Start - Registration form */}
          <SignUp.Step name="start">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Create your account</CardTitle>
                <CardDescription>Get started with Portal for free.</CardDescription>
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
                    <Button className="w-full">Create account</Button>
                  </SignUp.Action>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-center">
                <p className="text-muted-foreground text-xs">
                  Already have an account?{" "}
                  <Clerk.Link navigate="sign-in" className="text-foreground underline underline-offset-4">
                    Sign in
                  </Clerk.Link>
                </p>
              </CardFooter>
            </Card>
          </SignUp.Step>

          {/* Step: Continue - Additional required fields */}
          <SignUp.Step name="continue">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Complete your profile</CardTitle>
                <CardDescription>Fill in the remaining details to continue.</CardDescription>
              </CardHeader>
              <CardContent>
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
                    <Button className="w-full">Continue</Button>
                  </SignUp.Action>
                </FieldGroup>
              </CardContent>
            </Card>
          </SignUp.Step>

          {/* Step: Verifications - Email/phone verification */}
          <SignUp.Step name="verifications">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Verify your email</CardTitle>
                <CardDescription>
                  Enter the verification code sent to your email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <SignUp.Strategy name="email_code">
                    <Clerk.Field name="code" asChild>
                      <Field>
                        <Clerk.Label asChild>
                          <FieldLabel>Verification code</FieldLabel>
                        </Clerk.Label>
                        <div className="flex justify-center gap-1">
                          <OTPInput />
                        </div>
                        <Clerk.FieldError className="text-destructive text-xs" />
                      </Field>
                    </Clerk.Field>
                    <SignUp.Action submit asChild>
                      <Button className="w-full">Verify</Button>
                    </SignUp.Action>
                  </SignUp.Strategy>

                  <SignUp.Strategy name="phone_code">
                    <Clerk.Field name="code" asChild>
                      <Field>
                        <Clerk.Label asChild>
                          <FieldLabel>Phone verification code</FieldLabel>
                        </Clerk.Label>
                        <div className="flex justify-center gap-1">
                          <OTPInput />
                        </div>
                        <Clerk.FieldError className="text-destructive text-xs" />
                      </Field>
                    </Clerk.Field>
                    <SignUp.Action submit asChild>
                      <Button className="w-full">Verify</Button>
                    </SignUp.Action>
                  </SignUp.Strategy>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-center">
                <SignUp.Action navigate="start" asChild>
                  <button type="button" className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground">
                    Use a different email
                  </button>
                </SignUp.Action>
              </CardFooter>
            </Card>
          </SignUp.Step>
        </SignUp.Root>
      </div>
    </div>
  );
}
