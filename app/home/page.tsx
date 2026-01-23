import type { Metadata } from "next";
import { Navbar } from "@/components/home/navbar";
import { Hero } from "@/components/home/hero";
import { Footer } from "@/components/home/footer";

export const metadata: Metadata = {
  title: "Portal - Your Team's Home Base | Free Open Source Team Chat",
  description:
    "Portal is your team's home base — a free, open-source workspace that brings messaging, channels, and collaboration together. The modern Slack alternative that's privacy-first and free forever.",
  keywords: [
    "team home base",
    "team workspace",
    "team chat app",
    "slack alternative",
    "open source slack",
    "free team chat",
    "real-time messaging",
    "team collaboration",
    "channel messaging",
    "direct messages",
    "self-hosted chat",
    "privacy-first messaging",
    "discord alternative for teams",
    "microsoft teams alternative",
    "workplace chat",
    "team communication tool",
    "free collaboration software",
    "unified workspace",
  ],
  alternates: {
    canonical: "https://tryportal.app/home",
  },
  openGraph: {
    title: "Portal - Your Team's Home Base | Free Open Source Team Chat",
    description:
      "Portal is your team's home base — a free, open-source workspace for messaging and collaboration. Privacy-first and free forever.",
    url: "https://tryportal.app/home",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Portal",
  url: "https://tryportal.app",
  logo: "https://tryportal.app/portal.svg",
  sameAs: ["https://github.com/tryportal/portal"],
  description:
    "Portal is your team's home base — a free, open-source workspace for team communication and collaboration.",
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Portal",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Your team's home base. Open-source workspace alternative to Slack with real-time messaging, organized channels, and seamless collaboration — privacy-first and free forever.",
  featureList: [
    "Real-time messaging",
    "Team channels",
    "Direct messages",
    "Smart inbox",
    "Saved items",
    "Self-hosting support",
    "Privacy-first design",
  ],
  screenshot: "https://tryportal.app/images/portal-main.png",
  url: "https://tryportal.app",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
      <main className="h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col min-h-0 pt-[64px]">
          <Hero />
          <Footer />
        </div>
      </main>
    </>
  );
}
