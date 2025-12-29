"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Link from "next/link"
import { motion } from "framer-motion"

const privacyContent = `# Privacy Policy

**Last Updated:** 2025-12-29

## Introduction

Portal ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our team communication platform (the "Service"). By using Portal, you agree to the collection and use of information in accordance with this policy.

## Information We Collect

### 1. Account and Authentication Information

When you create an account or sign in, we collect:

- **Email address** (required for account creation)
- **Name** (first name, last name, and full name)
- **User ID** (unique identifier provided by our authentication provider)
- **Authentication credentials** (managed securely by Clerk, our authentication provider)

### 2. Profile Information

You may optionally provide:

- **Job title**
- **Department**
- **Location**
- **Timezone**
- **Bio or personal description**

### 3. Workspace and Organization Data

When you create or join a workspace, we collect:

- **Workspace name**
- **Workspace URL/slug**
- **Workspace description**
- **Workspace logo** (if uploaded)
- **Your role** (admin or member)
- **Join date**

### 4. Messages and Communication Data

We collect and store:

- **Message content** (text, markdown)
- **Message timestamps** (creation and edit times)
- **File attachments** (images, documents up to 5MB)
- **Message metadata**:
  - Reactions (emoji and user associations)
  - Reply threads
  - Pinned status
  - Mentions of other users
  - Saved messages

These messages are stored in the database and are not shared with any third parties. Our database is hosted on Convex, a SOC-2 compliant database.

### 5. Channel and Conversation Data

We collect:

- **Channel names, descriptions, and icons**
- **Channel permissions** (open or read-only)
- **Direct message conversations** (participant information and message history)
- **Typing indicators** (temporary data showing when users are typing)
- **Read receipts** (when messages were read)

### 6. Invitation Data

When you invite others to your workspace:

- **Email addresses** of invited users (for email-based invitations)
- **Invitation tokens** (for link-based invitations)
- **Invitation status** (pending, accepted, or revoked)

### 7. Usage and Analytics Data

We collect usage information through analytics services (PostHog and Databuddy, when enabled):

- **Page views** and navigation patterns
- **Feature usage** (workspace creation, channel views, message actions)
- **Event tracking** (messages sent, reactions added, files uploaded, etc.)
- **Device and browser information**

### 8. File Storage

When you upload files:

- **File content** (stored securely)
- **File metadata** (name, size, type)
- **Storage identifiers**

## How We Use Your Information

We use the collected information for the following purposes:

1. **Service Provision**: To provide, maintain, and improve our communication platform
2. **User Authentication**: To verify your identity and manage access to workspaces
3. **Communication**: To enable messaging, file sharing, and collaboration features
4. **Workspace Management**: To organize channels, manage members, and control access
5. **Analytics**: To understand how the Service is used and improve user experience
6. **Security**: To detect and prevent fraud, abuse, and security threats
7. **Support**: To respond to your inquiries and provide customer support
8. **Legal Compliance**: To comply with applicable laws and regulations

## Data Storage and Security

- **Data Storage**: Your data is stored using Convex, a secure backend platform
- **Authentication**: User authentication is handled by Clerk, a trusted authentication provider
- **File Storage**: Files are stored securely using Convex file storage
- **Security Measures**: We implement industry-standard security measures to protect your data, including encryption in transit and at rest
- **Access Controls**: Workspace administrators control access to workspace data

## Third-Party Services

We use the following third-party services that may collect or process your data:

1. **Clerk** (Authentication)
   - Purpose: User authentication and account management
   - Data: Email, name, authentication tokens
   - Privacy Policy: [Clerk Privacy Policy](https://clerk.com/privacy)

2. **Convex** (Backend and Database)
   - Purpose: Data storage and real-time synchronization
   - Data: All application data
   - Privacy Policy: [Convex Privacy Policy](https://www.convex.dev/privacy)

3. **PostHog** (Analytics - Optional)
   - Purpose: Usage analytics and product insights
   - Data: User interactions, page views, device information
   - Privacy Policy: [PostHog Privacy Policy](https://posthog.com/privacy)

4. **Databuddy** (Analytics - Optional)
   - Purpose: Product analytics
   - Data: Usage data and user interactions
   - Privacy Policy: [Databuddy Privacy Policy](https://databuddy.cc/privacy)

## Data Sharing and Disclosure

We do not sell your personal information. We may share your information only in the following circumstances:

1. **Within Your Workspace**: Your messages, profile information, and activity are visible to other members of your workspace(s)
2. **Service Providers**: With third-party service providers (Clerk, Convex, PostHog, Databuddy) who assist in operating the Service
3. **Legal Requirements**: When required by law, court order, or government regulation
4. **Business Transfers**: In connection with a merger, acquisition, or sale of assets (with notice to users)
5. **Consent**: With your explicit consent

## Your Rights and Choices

You have the following rights regarding your personal information:

1. **Access**: You can access your account information through the Service
2. **Correction**: You can update your profile information at any time
3. **Deletion**: You can request deletion of your account and associated data
4. **Data Export**: You can request a copy of your data
5. **Opt-Out**: You can disable analytics tracking (though some features may require analytics)

To exercise these rights, please contact us using the information provided below.

## Data Retention

- **Active Accounts**: We retain your data while your account is active
- **Deleted Accounts**: When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal purposes
- **Messages**: Messages may be retained as part of workspace history even after you leave a workspace, subject to workspace administrator controls
- **Analytics Data**: Analytics data may be retained in aggregated or anonymized form

## International Data Transfers

Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using the Service, you consent to the transfer of your information to these countries.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:

- Posting the new Privacy Policy on this page
- Updating the "Last Updated" date
- Sending you an email notification (for material changes)

Your continued use of the Service after changes become effective constitutes acceptance of the updated policy.

## Contact Us

If you have questions about this Privacy Policy or our data practices, please contact us:

- **Email**: [privacy@tryportal.app](mailto:privacy@tryportal.app)
- **Website**: [tryportal.app](https://tryportal.app)

## Additional Information

### Cookies and Tracking Technologies

We use cookies and similar tracking technologies to:

- Maintain your session
- Remember your preferences
- Analyze usage patterns
- Provide personalized experiences

You can control cookies through your browser settings, though this may affect Service functionality.

### Do Not Track Signals

We do not currently respond to "Do Not Track" signals from browsers. However, you can opt out of analytics tracking through your account settings or by disabling analytics services.

### California Privacy Rights

If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):

- Right to know what personal information is collected
- Right to delete personal information
- Right to opt-out of the sale of personal information (we do not sell personal information)
- Right to non-discrimination for exercising your privacy rights`

export function PrivacyContent() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto"
    >
      <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-5xl prose-h1:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="text-5xl font-bold text-foreground mb-8 mt-8 first:mt-0 tracking-tight" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-3xl font-semibold text-foreground mb-6 mt-12 first:mt-0 tracking-tight" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xl font-semibold text-foreground mb-4 mt-8" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed font-light" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2 ml-4" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal list-inside text-muted-foreground mb-6 space-y-2 ml-4" {...props} />
            ),
            li: ({ node, ...props }) => (
              <li className="text-muted-foreground leading-relaxed pl-2" {...props} />
            ),
            strong: ({ node, ...props }) => (
              <strong className="font-semibold text-foreground" {...props} />
            ),
            a: ({ node, href, ...props }) => (
              <Link
                href={href || "#"}
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-foreground underline decoration-muted-foreground/30 hover:decoration-foreground transition-all"
                {...props}
              />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-foreground/10 pl-6 italic text-muted-foreground my-8" {...props} />
            ),
          }}
        >
          {privacyContent}
        </ReactMarkdown>
      </div>
    </motion.div>
  )
}

