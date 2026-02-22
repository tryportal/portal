"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChatCircleDots,
  Lightning,
  Users,
  Bell,
  MagnifyingGlass,
  Lock,
  ArrowRight,
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


export function LandingPage() {
  return (
    <main className="overflow-hidden">
      {/* ===================== HERO ===================== */}
      <section className="relative px-6 pb-24 pt-32 md:pb-32 md:pt-44">
        {/* Subtle radial glow */}
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
            Your team&apos;s homebase
          </motion.p>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
          >
            Where work actually
            <br />
            happens.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Portal brings your conversations, files, and tools into one place.
            No tab-switching. No context lost. Just your team, focused.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center gap-2 bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Get started free
              <ArrowRight weight="bold" className="size-3.5" />
            </Link>
            <Link
              href="/features"
              className="inline-flex h-11 items-center gap-2 border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              See how it works
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="relative">
            <Image
              src="/screenshots/hero-image.png"
              alt="Full Portal workspace view — sidebar with channels, main chat area, thread panel open"
              width={1920}
              height={1080}
              className="border border-border"
              priority
            />
            {/* Shadow / depth */}
            <div className="absolute -inset-px -z-10 translate-y-2 bg-foreground/5 blur-xl" />
          </div>
        </motion.div>
      </section>

      {/* ===================== FEATURE PAIR — TWO CARDS ===================== */}
      <section className="px-6 py-24 md:py-32">
        <motion.div
          className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          {/* Card 1 */}
          <motion.div
            variants={fadeUp}
            custom={0}
            className="group overflow-hidden border border-border"
          >
            <div className="p-6 md:p-8">
              <div className="mb-1 flex items-center gap-2">
                <ChatCircleDots weight="bold" className="size-5" />
                <h3 className="text-lg font-semibold">Channels that make sense</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Organize by project, team, or topic. Pin what matters. Archive
                what doesn&apos;t. Every conversation has a home.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden border-t border-border bg-muted/30">
              <Image
                src="/screenshots/channels.png"
                alt="Channel list sidebar showing organized channels with unread counts, pins, and sections"
                fill
                className="object-cover object-top"
              />
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            variants={fadeUp}
            custom={1}
            className="group overflow-hidden border border-border"
          >
            <div className="p-6 md:p-8">
              <div className="mb-1 flex items-center gap-2">
                <Lightning weight="bold" className="size-5" />
                <h3 className="text-lg font-semibold">Threads, not noise</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Discussions stay attached to the message that started them. Your
                main channel stays clean. Context stays intact.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden border-t border-border bg-muted/30">
              <Image
                src="/screenshots/threads.png"
                alt="Thread panel open beside main chat — showing a focused conversation branching off a message"
                fill
                className="object-cover object-top"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ===================== BIG FEATURE — SEARCH ===================== */}
      <section className="px-6 py-24 md:py-32">
        <motion.div
          className="mx-auto max-w-5xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} custom={0} className="mb-12 max-w-lg">
            <div className="mb-1 flex items-center gap-2">
              <MagnifyingGlass weight="bold" className="size-5" />
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Find anything, instantly
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
              Search across every channel, thread, and file. Portal indexes
              everything so you never waste time hunting for that one
              conversation.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={1}>
            <Image
              src="/screenshots/find-anything.png"
              alt="Search modal — query at top, results showing messages, files, and channels with highlighted matches"
              width={1920}
              height={960}
              className="border border-border"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ===================== THREE FEATURES ===================== */}
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
              Built for how teams work today
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              Not another chat app with features bolted on. Portal was designed
              from scratch around the way modern teams operate.
            </p>
          </motion.div>

          <div className="grid gap-px border border-border bg-border md:grid-cols-3">
            {[
              {
                icon: <Users weight="bold" className="size-5" />,
                title: "Workspaces",
                description:
                  "Separate spaces for each team or project. Full isolation. One account.",
              },
              {
                icon: <Bell weight="bold" className="size-5" />,
                title: "Smart notifications",
                description:
                  "Get notified about what matters. Mute what doesn't. Set schedules that respect your focus.",
              },
              {
                icon: <Lock weight="bold" className="size-5" />,
                title: "Private by default",
                description:
                  "End-to-end encryption for DMs. Granular permissions for channels. Your data stays yours.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                custom={i + 1}
                className="bg-background p-8"
              >
                <div className="mb-3">{feature.icon}</div>
                <h3 className="mb-1 text-sm font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
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
            Your team deserves
            <br />
            a better homebase.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base"
          >
            Portal is free to start. No credit card, no trial limits. Bring
            your team and see the difference.
          </motion.p>
          <motion.div variants={fadeUp} custom={2} className="mt-10">
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center gap-2 bg-foreground px-8 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Get started free
              <ArrowRight weight="bold" className="size-3.5" />
            </Link>
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
            {["Privacy", "Terms", "Docs"].map((link) => (
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
