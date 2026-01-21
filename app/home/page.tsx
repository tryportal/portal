import type { Metadata } from "next";
import { Navbar } from "@/components/home/navbar";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { OpenSource } from "@/components/home/open-source";
import { FAQ } from "@/components/home/faq";
import { CTA } from "@/components/home/cta";
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

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What makes Portal different?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Portal is designed to be your team's home base — the first place you go when you start work. It brings messaging, organization, and collaboration into one focused space. Plus, it's completely open source.",
      },
    },
    {
      "@type": "Question",
      name: "Is Portal really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Portal is 100% free and open source. No paid tiers, no hidden fees, no usage limits. Your team's workspace shouldn't come with a monthly bill.",
      },
    },
    {
      "@type": "Question",
      name: "How does Portal compare to Slack?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Portal offers real-time channels, DMs, file sharing, and mentions — but with a focus on simplicity over feature bloat. It's open source, privacy-first, and designed to stay fast as your team grows.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host Portal?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Check out our GitHub repository for deployment guides. Run Portal on your own infrastructure with full control over your data and security.",
      },
    },
    {
      "@type": "Question",
      name: "What does 'alpha' mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We're actively shipping new features every week. Core functionality works great, but you may encounter rough edges. Early adopters help shape what Portal becomes.",
      },
    },
    {
      "@type": "Question",
      name: "Is my data secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Security is foundational. Portal is privacy-first by design. Self-host for complete control, or use our cloud with confidence. End-to-end encryption is on the roadmap.",
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
      <main className="min-h-screen bg-background flex flex-col">
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
