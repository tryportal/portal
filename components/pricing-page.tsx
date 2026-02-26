"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  GithubLogo,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const included = [
  "Unlimited messages",
  "Unlimited channels & categories",
  "Unlimited workspaces",
  "Threaded replies",
  "Direct messages",
  "File sharing",
  "Full-text search",
  "Forum channels",
  "Pearl AI assistant",
  "Mentions & inbox",
  "Reactions & pinned messages",
  "Granular permissions",
  "Private channels",
  "Link previews",
  "Drag-and-drop organization",
  "Dark mode",
];

const selfHostPerks = [
  "Run on your own infrastructure",
  "Full control over your data",
  "No external dependencies",
  "Customize anything",
];

export function PricingPage() {
  return (
    <main className="overflow-hidden">
      {/* ===================== HERO ===================== */}
      <section className="relative px-6 pb-24 pt-32 md:pb-32 md:pt-44">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-foreground/[0.02] blur-3xl" />
        </div>

        <motion.div
          className="relative mx-auto max-w-3xl text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="mb-6 text-sm font-medium tracking-wide text-muted-foreground"
          >
            Pricing
          </motion.p>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
          >
            Free. All of it.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            No tiers. No per-seat pricing. No &ldquo;contact sales&rdquo;
            button. Portal is completely free and open source.
          </motion.p>
        </motion.div>
      </section>

      {/* ===================== PRICING CARD ===================== */}
      <section className="px-6 pb-24 md:pb-32">
        <motion.div
          className="mx-auto max-w-5xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* Free plan */}
            <motion.div
              variants={fadeUp}
              custom={0}
              className="border border-foreground p-8 md:p-10"
            >
              <p className="text-sm font-medium text-muted-foreground">
                For everyone
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-semibold tracking-tight">
                  $0
                </span>
                <span className="text-sm text-muted-foreground">/ forever</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Every feature, unlimited usage, no strings attached. Just sign
                up and go.
              </p>

              <Link
                href="/sign-in"
                className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Get started
                <ArrowRight weight="bold" className="size-3.5" />
              </Link>

              <ul className="mt-10 space-y-3">
                {included.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-relaxed"
                  >
                    <Check
                      weight="bold"
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Self-host */}
            <motion.div
              variants={fadeUp}
              custom={1}
              className="flex flex-col border border-border p-8 md:p-10"
            >
              <p className="text-sm font-medium text-muted-foreground">
                Self-hosted
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-semibold tracking-tight">
                  $0
                </span>
                <span className="text-sm text-muted-foreground">
                  / open source
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Run Portal on your own servers. Same features, your
                infrastructure, your rules.
              </p>

              <a
                href="https://github.com/tryportal/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <GithubLogo weight="bold" className="size-4" />
                View on GitHub
                <ArrowSquareOut weight="bold" className="size-3" />
              </a>

              <ul className="mt-10 space-y-3">
                {selfHostPerks.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-relaxed"
                  >
                    <Check
                      weight="bold"
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-10">
                <div className="border-t border-border pt-6">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Portal is MIT licensed. Fork it, modify it, deploy it
                    however you want. Contributions welcome.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section className="border-y border-border px-6 py-24 md:py-32">
        <motion.div
          className="mx-auto max-w-5xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} custom={0} className="mb-16 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Questions you might have
            </h2>
          </motion.div>

          <div className="grid gap-px border border-border bg-border md:grid-cols-2">
            {[
              {
                q: "Is it actually free?",
                a: "Yes. Portal is free to use and open source. There are no paid tiers, no usage limits, and no plans to add them.",
              },
              {
                q: "How do you make money?",
                a: "We don't, yet. Portal is a passion project. If we ever monetize, it will be through optional managed hosting, not by gating features.",
              },
              {
                q: "Can I use it for my company?",
                a: "Absolutely. Personal teams, startups, enterprises — no restrictions on commercial use.",
              },
              {
                q: "What does self-hosting require?",
                a: "A server that can run Node.js and a Convex backend. The README on GitHub walks you through setup in under 10 minutes.",
              },
              {
                q: "Is my data private?",
                a: "On the hosted version, your data is stored securely and never shared. Self-host if you want full control.",
              },
              {
                q: "Will free users get fewer features later?",
                a: "No. Every feature we build ships to everyone. That's the point.",
              },
            ].map((faq, i) => (
              <motion.div
                key={faq.q}
                variants={fadeUp}
                custom={(i % 2) + 1}
                className="bg-background p-8"
              >
                <h3 className="mb-2 text-sm font-semibold">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="px-6 py-32 md:py-44">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-3xl font-semibold tracking-tight md:text-5xl"
          >
            No catch.
            <br />
            Just get started.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base"
          >
            Sign up in 30 seconds. Invite your team. That&apos;s it.
          </motion.p>
          <motion.div
            variants={fadeUp}
            custom={2}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center gap-2 bg-foreground px-8 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Get started free
              <ArrowRight weight="bold" className="size-3.5" />
            </Link>
            <a
              href="https://github.com/tryportal/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 border border-border px-8 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <GithubLogo weight="bold" className="size-4" />
              GitHub
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Portal. All rights reserved.
          </p>
          <nav className="flex gap-6">
            {["Privacy", "Docs"].map((link) => (
              <Link
                key={link}
                href={`/${link.toLowerCase()}`}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}
