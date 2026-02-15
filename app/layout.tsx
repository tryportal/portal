import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Agentation } from "agentation";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { AuthSync } from "@/components/auth-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal",
  description: "Team messaging for everyone",
  icons: {
    icon: "/portal-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ConvexClientProvider>
            <AuthSync />
            {children}
          </ConvexClientProvider>
          {process.env.NODE_ENV === "development" && <Agentation />}
        </body>
      </html>
    </ClerkProvider>
  );
}
