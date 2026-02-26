"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChatCircleDots,
  Lightning,
  MagnifyingGlass,
  Users,
  Bell,
  Lock,
  ArrowRight,
  PushPin,
  At,
  Paperclip,
  TextAa,
  BookmarkSimple,
  ArrowsOutCardinal,
  ChatTeardrop,
  LinkSimple,
  Smiley,
  Tray,
  VideoCamera,
  Plugs,
  DeviceMobile,
  Robot,
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

const coreFeatures = [
  {
    icon: <ChatCircleDots weight="bold" className="size-5" />,
    title: "Channels & categories",
    description:
      "Group conversations by project, team, or topic. Drag and drop to reorder. Pin channels you check often, archive the ones you don't.",
    screenshot: "/screenshots/channels.png",
    screenshotAlt:
      "Channel sidebar with categorized channels, unread counts, and drag-drop reordering",
    screenshotPosition: "object-center" as const,
  },
  {
    icon: <Lightning weight="bold" className="size-5" />,
    title: "Threaded replies",
    description:
      "Every message can spawn its own discussion. Side conversations stay attached to context. Your main channel never gets buried.",
    screenshot: "/screenshots/threads.png",
    screenshotAlt:
      "Thread panel beside the main chat showing a focused conversation branching off a message",
    screenshotPosition: "object-top" as const,
  },
];

const detailFeatures = [
  {
    icon: <MagnifyingGlass weight="bold" className="size-5" />,
    title: "Search everything",
    description:
      "Find any message, file, or person across every channel and thread. Results show up as you type.",
  },
  {
    icon: <Users weight="bold" className="size-5" />,
    title: "Workspaces",
    description:
      "Separate spaces for each team or project. Full isolation, shared login. Switch between them in a click.",
  },
  {
    icon: <ChatTeardrop weight="bold" className="size-5" />,
    title: "Direct messages",
    description:
      "Private conversations between two people. Share a link to your DMs so anyone on your team can reach you.",
  },
  {
    icon: <At weight="bold" className="size-5" />,
    title: "Mentions & inbox",
    description:
      "Tag someone with @name and they get notified. Every mention lands in a dedicated inbox so nothing slips through.",
  },
  {
    icon: <TextAa weight="bold" className="size-5" />,
    title: "Rich text & markdown",
    description:
      "Bold, italic, code blocks, lists, and more. Write in markdown or use the toolbar. Messages render beautifully either way.",
  },
  {
    icon: <Paperclip weight="bold" className="size-5" />,
    title: "File sharing",
    description:
      "Drag files into any conversation. Images preview inline. Documents are searchable and stay attached to their context.",
  },
  {
    icon: <Smiley weight="bold" className="size-5" />,
    title: "Reactions",
    description:
      "React to any message with emoji. Quick acknowledgments without cluttering the conversation.",
  },
  {
    icon: <PushPin weight="bold" className="size-5" />,
    title: "Pinned messages",
    description:
      "Pin important messages to the top of any channel. Decisions, links, and key context stay visible.",
  },
  {
    icon: <BookmarkSimple weight="bold" className="size-5" />,
    title: "Saved messages",
    description:
      "Bookmark messages you want to come back to. Your saved list is private and accessible from anywhere.",
  },
  {
    icon: <Tray weight="bold" className="size-5" />,
    title: "Forum channels",
    description:
      "Long-form posts with structured replies. Mark answers as solved. Perfect for Q&A, announcements, and async updates.",
  },
  {
    icon: <Bell weight="bold" className="size-5" />,
    title: "Smart notifications",
    description:
      "Granular control over what pings you. Mute channels, set schedules, and focus on what actually needs your attention.",
  },
  {
    icon: <Lock weight="bold" className="size-5" />,
    title: "Permissions & privacy",
    description:
      "Private channels with invite-only access. Role-based permissions. Read-only channels for announcements. Your data stays yours.",
  },
  {
    icon: <ArrowsOutCardinal weight="bold" className="size-5" />,
    title: "Drag-and-drop organization",
    description:
      "Reorder channels and categories by dragging them. Structure your sidebar the way your team thinks.",
  },
  {
    icon: <LinkSimple weight="bold" className="size-5" />,
    title: "Link previews",
    description:
      "Paste a URL and Portal pulls in the title, description, and image. No need to explain what you're sharing.",
  },
];

const comingSoonFeatures = [
  {
    icon: <VideoCamera weight="bold" className="size-5" />,
    title: "Voice & video",
    description:
      "Hop on a call from any channel or DM. Screen sharing, recording, and transcription built in.",
  },
  {
    icon: <Plugs weight="bold" className="size-5" />,
    title: "Integrations",
    description:
      "Connect GitHub, Linear, Figma, and the tools your team already uses. Updates flow into Portal automatically.",
  },
  {
    icon: <DeviceMobile weight="bold" className="size-5" />,
    title: "Mobile app",
    description:
      "Full Portal experience on your phone. Push notifications, offline access, and the same clean interface.",
  },
  {
    icon: <Robot weight="bold" className="size-5" />,
    title: "Workflows",
    description:
      "Automate repetitive tasks with custom triggers and actions. No code required.",
  },
];

export function FeaturesPage() {
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
            Everything your team needs
          </motion.p>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
          >
            Less noise,
            <br />
            more work done.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Channels, threads, search, and permissions. All in one place,
            nothing bolted on.
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
          </motion.div>
        </motion.div>
      </section>

      {/* ===================== CORE FEATURES — TWO CARDS ===================== */}
      <section className="px-6 py-24 md:py-32">
        <motion.div
          className="mx-auto max-w-5xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} custom={0} className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              The fundamentals, done right
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              Messaging and organization that gets out of your way.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {coreFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                custom={i + 1}
                className="group overflow-hidden border border-border"
              >
                <div className="p-6 md:p-8">
                  <div className="mb-1 flex items-center gap-2">
                    {feature.icon}
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <div className="relative aspect-[4/3] overflow-hidden border-t border-border bg-muted/30">
                  <Image
                    src={feature.screenshot}
                    alt={feature.screenshotAlt}
                    fill
                    className={`object-cover ${feature.screenshotPosition}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ===================== SEARCH — BIG FEATURE ===================== */}
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
              alt="Search modal showing results across messages, files, and channels with highlighted matches"
              width={1920}
              height={960}
              className="border border-border"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ===================== ALL FEATURES GRID ===================== */}
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
              Everything else you&apos;d expect
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              The details that make Portal feel like home for your team.
            </p>
          </motion.div>

          <div className="grid gap-px border border-border bg-border md:grid-cols-3">
            {detailFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                custom={(i % 3) + 1}
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

      {/* ===================== COMING SOON ===================== */}
      <section className="px-6 py-24 md:py-32">
        <motion.div
          className="mx-auto max-w-5xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} custom={0} className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium tracking-wide text-muted-foreground">
              On the roadmap
            </p>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              What&apos;s coming next
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              We ship fast. These are already in progress.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {comingSoonFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                custom={i + 1}
                className="border border-dashed border-border p-6"
              >
                <div className="mb-3 text-muted-foreground">{feature.icon}</div>
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
            Ready to try it?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base"
          >
            Portal is free to start. No credit card, no trial clock. Bring your
            team and see how work should feel.
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
