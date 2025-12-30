import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { PostHogProvider } from "@/lib/posthog";
import { DatabuddyProvider } from "@/lib/databuddy";
import { RootNotificationProvider } from "@/components/notifications/notification-provider";
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
  icons: {
    icon: "/portal.svg",
  },
  title: "Portal",
  description: "Team chat, reimagined.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <head>
          <meta name="theme-color" content="#26251E" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <PostHogProvider>
            <DatabuddyProvider>
              <ConvexClientProvider>
                <RootNotificationProvider>
                  {children}
                </RootNotificationProvider>
              </ConvexClientProvider>
            </DatabuddyProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
