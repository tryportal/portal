import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { PostHogProvider } from "@/lib/posthog";
import { DatabuddyProvider } from "@/lib/databuddy";
import { ThemeProvider } from "@/lib/theme-provider";
import { ClerkThemeProvider } from "@/lib/clerk-theme-provider";
import { UserSettingsProvider } from "@/lib/user-settings";
import { RootNotificationProvider } from "@/components/notifications/notification-provider";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tryportal.app"),
  title: {
    default: "Portal - Team Chat, Reimagined",
    template: "%s | Portal",
  },
  description:
    "Open-source team chat alternative to Slack. Real-time messaging, organized channels, seamless collaboration — privacy-first and free forever.",
  keywords: [
    "team chat",
    "slack alternative",
    "open source chat",
    "team messaging",
    "real-time messaging",
    "privacy-first chat",
    "free team chat",
    "workspace collaboration",
    "channel-based messaging",
    "self-hosted chat",
    "secure team communication",
    "discord alternative",
    "microsoft teams alternative",
  ],
  authors: [{ name: "Portal Team", url: "https://tryportal.app" }],
  creator: "Portal",
  publisher: "Portal",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/portal.svg",
    apple: "/portal.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tryportal.app",
    siteName: "Portal",
    title: "Portal - Team Chat, Reimagined",
    description:
      "Open-source team chat alternative to Slack. Real-time messaging, organized channels, seamless collaboration — privacy-first and free forever.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Portal - Open Source Team Chat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal - Team Chat, Reimagined",
    description:
      "Open-source team chat alternative to Slack. Real-time messaging, organized channels, seamless collaboration — privacy-first and free forever.",
    images: ["/og-image.png"],
    creator: "@tryportal",
  },
  alternates: {
    canonical: "https://tryportal.app/home",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#26251E" />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ThemeProvider defaultTheme="system" storageKey="portal-theme">
            <DynamicFavicon />
            <ClerkThemeProvider>
              <UserSettingsProvider>
                <PostHogProvider>
                  <DatabuddyProvider>
                    <ConvexClientProvider>
                      <RootNotificationProvider>
                        {children}
                        <CookieConsentBanner />
                        <Toaster position="bottom-right" richColors />
                      </RootNotificationProvider>
                    </ConvexClientProvider>
                  </DatabuddyProvider>
                </PostHogProvider>
              </UserSettingsProvider>
            </ClerkThemeProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
