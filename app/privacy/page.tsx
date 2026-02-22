import { Navbar } from "@/components/navbar";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Portal",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last Updated: December 29, 2025
        </p>

        <div className="mt-12 space-y-10 text-sm leading-relaxed text-foreground/80">
          {/* Introduction */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Introduction
            </h2>
            <p>
              Portal (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
              &ldquo;us&rdquo;) is committed to protecting your privacy. This
              Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our team communication
              platform (the &ldquo;Service&rdquo;). By using Portal, you agree
              to the collection and use of information in accordance with this
              policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Information We Collect
            </h2>

            <h3 className="mb-2 mt-6 font-semibold text-foreground">
              1. Account and Authentication Information
            </h3>
            <p className="mb-2">
              When you create an account or sign in, we collect:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Email address (required for account creation)</li>
              <li>Name (first name, last name, and full name)</li>
              <li>
                User ID (unique identifier provided by our authentication
                provider)
              </li>
              <li>
                Authentication credentials (managed securely by Clerk, our
                authentication provider)
              </li>
            </ul>

            <h3 className="mb-2 mt-6 font-semibold text-foreground">
              2. Profile Information
            </h3>
            <p className="mb-2">You may optionally provide:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Job title</li>
              <li>Department</li>
              <li>Location</li>
              <li>Timezone</li>
              <li>Bio or personal description</li>
            </ul>

            <h3 className="mb-2 mt-6 font-semibold text-foreground">
              3. Workspace and Organization Data
            </h3>
            <p className="mb-2">
              When you create or join a workspace, we collect:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Workspace name</li>
              <li>Workspace URL/slug</li>
              <li>Workspace description</li>
              <li>Workspace logo (if uploaded)</li>
              <li>Your role (admin or member)</li>
              <li>Join date</li>
            </ul>

            <h3 className="mb-2 mt-6 font-semibold text-foreground">
              4. Messages and Communication Data
            </h3>
            <p className="mb-2">We collect and store:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Message content (text, markdown)</li>
              <li>Message timestamps (creation and edit times)</li>
              <li>File attachments (images, documents up to 5MB)</li>
              <li>
                Message metadata: reactions (emoji and user associations), reply
                threads, pinned status, mentions of other users, saved messages
              </li>
            </ul>
            <p className="mt-2">
              These messages are stored in the database and are not shared with
              any third parties. Our database is hosted on Convex, a SOC-2
              compliant database.
            </p>

            <h3 className="mb-2 mt-6 font-semibold text-foreground">
              5. Channel and Conversation Data
            </h3>
            <p className="mb-2">We collect:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Channel names, descriptions, and icons</li>
              <li>Channel permissions (open or read-only)</li>
              <li>
                Direct message conversations (participant information and
                message history)
              </li>
              <li>
                Typing indicators (temporary data showing when users are typing)
              </li>
              <li>Read receipts (when messages were read)</li>
            </ul>

            <h3 className="mb-2 mt-6 font-semibold text-foreground">
              6. Invitation Data
            </h3>
            <p className="mb-2">
              When you invite others to your workspace:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Email addresses of invited users (for email-based invitations)
              </li>
              <li>Invitation tokens (for link-based invitations)</li>
              <li>Invitation status (pending, accepted, or revoked)</li>
            </ul>

            <h3 className="mb-2 mt-6 font-semibold text-foreground">
              7. Usage and Analytics Data
            </h3>
            <p className="mb-2">
              We collect usage information through Databuddy analytics (when
              enabled):
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Page views and navigation patterns</li>
              <li>
                Feature usage (workspace creation, channel views, message
                actions)
              </li>
              <li>
                Event tracking (messages sent, reactions added, files uploaded,
                etc.)
              </li>
              <li>Device and browser information</li>
            </ul>

            <h3 className="mb-2 mt-6 font-semibold text-foreground">
              8. File Storage
            </h3>
            <p className="mb-2">When you upload files:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>File content (stored securely)</li>
              <li>File metadata (name, size, type)</li>
              <li>Storage identifiers</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              How We Use Your Information
            </h2>
            <p className="mb-2">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Service Provision:</strong> To provide, maintain, and
                improve our communication platform
              </li>
              <li>
                <strong>User Authentication:</strong> To verify your identity and
                manage access to workspaces
              </li>
              <li>
                <strong>Communication:</strong> To enable messaging, file
                sharing, and collaboration features
              </li>
              <li>
                <strong>Workspace Management:</strong> To organize channels,
                manage members, and control access
              </li>
              <li>
                <strong>Analytics:</strong> To understand how the Service is used
                and improve user experience
              </li>
              <li>
                <strong>Security:</strong> To detect and prevent fraud, abuse,
                and security threats
              </li>
              <li>
                <strong>Support:</strong> To respond to your inquiries and
                provide customer support
              </li>
              <li>
                <strong>Legal Compliance:</strong> To comply with applicable laws
                and regulations
              </li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Data Storage and Security
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Data Storage:</strong> Your data is stored using Convex,
                a secure backend platform
              </li>
              <li>
                <strong>Authentication:</strong> User authentication is handled
                by Clerk, a trusted authentication provider
              </li>
              <li>
                <strong>File Storage:</strong> Files are stored securely using
                Convex file storage
              </li>
              <li>
                <strong>Security Measures:</strong> We implement
                industry-standard security measures to protect your data,
                including encryption in transit and at rest
              </li>
              <li>
                <strong>Access Controls:</strong> Workspace administrators
                control access to workspace data
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Third-Party Services
            </h2>
            <p className="mb-4">
              We use the following third-party services that may collect or
              process your data:
            </p>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground">
                  Clerk (Authentication)
                </h4>
                <p>
                  Purpose: User authentication and account management. Data
                  collected: email, name, authentication tokens. See the{" "}
                  <Link
                    href="https://clerk.com/legal/privacy"
                    className="underline underline-offset-2 hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Clerk Privacy Policy
                  </Link>
                  .
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">
                  Convex (Backend and Database)
                </h4>
                <p>
                  Purpose: Data storage and real-time synchronization. Data
                  collected: all application data. See the{" "}
                  <Link
                    href="https://www.convex.dev/legal/privacy"
                    className="underline underline-offset-2 hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Convex Privacy Policy
                  </Link>
                  .
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">
                  Databuddy (Analytics — Optional)
                </h4>
                <p>
                  Purpose: Privacy-first product analytics. Data collected:
                  anonymous usage data, page views, interactions, performance
                  metrics. No cookies, no PII collection, GDPR compliant by
                  design. See the{" "}
                  <Link
                    href="https://databuddy.dev/privacy"
                    className="underline underline-offset-2 hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Databuddy Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* Data Sharing and Disclosure */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Data Sharing and Disclosure
            </h2>
            <p className="mb-2">
              We do not sell your personal information. We may share your
              information only in the following circumstances:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Within Your Workspace:</strong> Your messages, profile
                information, and activity are visible to other members of your
                workspace(s)
              </li>
              <li>
                <strong>Service Providers:</strong> With third-party service
                providers (Clerk, Convex, Databuddy) who assist in operating the
                Service
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court
                order, or government regulation
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger,
                acquisition, or sale of assets (with notice to users)
              </li>
              <li>
                <strong>Consent:</strong> With your explicit consent
              </li>
            </ul>
          </section>

          {/* Your Rights and Choices */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Your Rights and Choices
            </h2>
            <p className="mb-2">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Access:</strong> You can access your account information
                through the Service
              </li>
              <li>
                <strong>Correction:</strong> You can update your profile
                information at any time
              </li>
              <li>
                <strong>Deletion:</strong> You can request deletion of your
                account and associated data
              </li>
              <li>
                <strong>Data Export:</strong> You can request a copy of your data
              </li>
              <li>
                <strong>Opt-Out:</strong> You can disable analytics tracking
                (though some features may require analytics)
              </li>
            </ul>
            <p className="mt-2">
              To exercise these rights, please contact us using the information
              provided below.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Data Retention
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Active Accounts:</strong> We retain your data while your
                account is active
              </li>
              <li>
                <strong>Deleted Accounts:</strong> When you delete your account,
                we will delete or anonymize your personal information, except
                where we are required to retain it for legal purposes
              </li>
              <li>
                <strong>Messages:</strong> Messages may be retained as part of
                workspace history even after you leave a workspace, subject to
                workspace administrator controls
              </li>
              <li>
                <strong>Analytics Data:</strong> Analytics data may be retained
                in aggregated or anonymized form
              </li>
            </ul>
          </section>

          {/* International Data Transfers */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than your country of residence. These countries may have data
              protection laws that differ from those in your country. By using
              the Service, you consent to the transfer of your information to
              these countries.
            </p>
          </section>

          {/* Changes to This Privacy Policy */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Changes to This Privacy Policy
            </h2>
            <p className="mb-2">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the &ldquo;Last Updated&rdquo; date</li>
              <li>
                Sending you an email notification (for material changes)
              </li>
            </ul>
            <p className="mt-2">
              Your continued use of the Service after changes become effective
              constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy or our data
              practices, please contact us:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Email:{" "}
                <Link
                  href="mailto:privacy@tryportal.app"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  privacy@tryportal.app
                </Link>
              </li>
              <li>
                Website:{" "}
                <Link
                  href="https://tryportal.app"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  tryportal.app
                </Link>
              </li>
            </ul>
          </section>

          {/* Cookies and Tracking Technologies */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Cookies and Tracking Technologies
            </h2>
            <p className="mb-2">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Maintain your session</li>
              <li>Remember your preferences</li>
              <li>Analyze usage patterns</li>
              <li>Provide personalized experiences</li>
            </ul>
            <p className="mt-2">
              You can control cookies through your browser settings, though this
              may affect Service functionality.
            </p>
          </section>

          {/* Do Not Track Signals */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Do Not Track Signals
            </h2>
            <p>
              We do not currently respond to &ldquo;Do Not Track&rdquo; signals
              from browsers. However, you can opt out of analytics tracking
              through your account settings or by disabling analytics services.
            </p>
          </section>

          {/* California Privacy Rights */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              California Privacy Rights
            </h2>
            <p className="mb-2">
              If you are a California resident, you have additional rights under
              the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>
                Right to opt-out of the sale of personal information (we do not
                sell personal information)
              </li>
              <li>
                Right to non-discrimination for exercising your privacy rights
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
