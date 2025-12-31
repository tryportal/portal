import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { PostHogProvider } from "@/lib/posthog";
import { DatabuddyProvider } from "@/lib/databuddy";
import { ThemeProvider } from "@/lib/theme-provider";
import { RootNotificationProvider } from "@/components/notifications/notification-provider";
import { UserSettingsProvider } from "@/lib/user-settings-provider";
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
      <html lang="en" className={inter.variable} suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#26251E" />
          {/* Prevent flash of wrong theme */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var theme = localStorage.getItem('portal-theme');
                    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var resolved = theme === 'dark' || (theme === 'system' && systemDark) || (!theme && systemDark);
                    if (resolved) {
                      document.documentElement.classList.add('dark');
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider defaultTheme="system" storageKey="portal-theme">
            <PostHogProvider>
              <DatabuddyProvider>
                <ConvexClientProvider>
                  <RootNotificationProvider>
                    <UserSettingsProvider>
                      {children}
                    </UserSettingsProvider>
                  </RootNotificationProvider>
                </ConvexClientProvider>
              </DatabuddyProvider>
            </PostHogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
