import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/preview(.*)",
  "/api/webhooks(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isSetupRoute = createRouteMatcher(["/setup(.*)"]);

const clerkHandler = clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // If user is not signed in, redirect to sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Allow setup route for authenticated users
  if (isSetupRoute(request)) {
    return NextResponse.next();
  }

  // Protect all other routes
  await auth.protect();

  return NextResponse.next();
});

export function proxy(request: NextRequest) {
  return clerkHandler(request);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

