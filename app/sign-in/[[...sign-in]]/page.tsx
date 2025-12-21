"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-4">
            <img src="/portal.svg" alt="Portal" className="size-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full mx-auto",
              card: "shadow-lg border border-border rounded-xl",
            },
          }}
          forceRedirectUrl="/setup"
        />
      </div>
    </div>
  );
}

