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
  icons: {
    icon: "/portal.svg",
  },
  title: "Portal",
  description: "Team chat, reimagined.",
  manifest: "/manifest.json",
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
        <body>
          <ThemeProvider defaultTheme="system" storageKey="portal-theme">
            <ClerkThemeProvider>
              <UserSettingsProvider>
                <PostHogProvider>
                  <DatabuddyProvider>
                    <ConvexClientProvider>
                      <RootNotificationProvider>
                        {children}
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
