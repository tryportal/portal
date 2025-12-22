/**
 * Convex Auth Configuration for Clerk
 * 
 * IMPORTANT: Set CLERK_JWT_ISSUER_DOMAIN in your Convex Dashboard:
 * 1. Go to Convex Dashboard > Settings > Environment Variables
 * 2. Add CLERK_JWT_ISSUER_DOMAIN with value matching your Clerk issuer EXACTLY
 * 3. Find your issuer in Clerk Dashboard > API Keys > Issuer field
 *    - Format is usually: https://your-app.clerk.accounts.dev
 *    - Copy it EXACTLY as shown (including https://)
 * 4. After setting the variable, run: npx convex dev (or npx convex deploy)
 * 5. Verify: Check browser console for [Convex Auth] logs to see token status
 * 
 * TROUBLESHOOTING:
 * - If auth fails, check that CLERK_JWT_ISSUER_DOMAIN matches the 'iss' claim in your JWT token
 * - The domain must match EXACTLY (case-sensitive, including protocol)
 * - Make sure you've deployed after setting the env var: npx convex deploy
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN || "",
      applicationID: "convex",
    },
  ],
};

