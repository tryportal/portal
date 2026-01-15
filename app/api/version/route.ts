import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    buildId:
      process.env.NEXT_BUILD_ID ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      "development",
  });
}
