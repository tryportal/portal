import type { Metadata } from "next";
import { Navbar } from "@/components/home/navbar";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { OpenSource } from "@/components/home/open-source";
import { FAQ } from "@/components/home/faq";
import { CTA } from "@/components/home/cta";
import { Footer } from "@/components/home/footer";

export const metadata: Metadata = {
  title: "Portal - Free Open Source Team Chat | Slack Alternative",
  description:
    "Portal is a free, open-source team chat app and Slack alternative. Real-time messaging, organized channels, direct messages, and seamless collaboration — privacy-first and free forever. Self-host or use our cloud.",
  keywords: [
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
  ],
  alternates: {
    canonical: "https://tryportal.app/home",
  },
  openGraph: {
    title: "Portal - Free Open Source Team Chat | Slack Alternative",
    description:
      "Portal is a free, open-source team chat app and Slack alternative. Real-time messaging, organized channels, seamless collaboration — privacy-first and free forever.",
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
    "Portal is a free, open-source team chat platform focused on privacy and simplicity.",
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
    "Open-source team chat alternative to Slack. Real-time messaging, organized channels, seamless collaboration — privacy-first and free forever.",
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

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Portal really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Portal is 100% free and open source. No paid tiers, no hidden fees. Team communication shouldn't cost a fortune.",
      },
    },
    {
      "@type": "Question",
      name: "How does Portal compare to Slack?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Portal offers similar core features — channels, DMs, file sharing, mentions — but with a focus on privacy and simplicity. Plus, it's open source so you can self-host.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host Portal?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Check out our GitHub repository for deployment guides. Run Portal on your own infrastructure with full control over your data.",
      },
    },
    {
      "@type": "Question",
      name: "What does 'alpha' mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Portal is actively being developed. Core features work well, but you may encounter bugs. We're shipping fast and improving based on user feedback.",
      },
    },
    {
      "@type": "Question",
      name: "Is my data secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Security is a priority. Portal is designed with privacy-first principles. When self-hosting, you have complete control. E2E encryption is coming soon.",
      },
    },
    {
      "@type": "Question",
      name: "How can I contribute?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We welcome contributions! Check out our GitHub for open issues, submit PRs, or join our community to discuss features.",
      },
    },
  ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <main className="min-h-screen bg-background">
        <Navbar />
        <Hero />
        <Features />
        <OpenSource />
        <FAQ />
        <CTA />
        <Footer />
      </main>
    </>
  );
}
