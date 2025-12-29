"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { ArrowRight } from "@phosphor-icons/react"

const showcases = [
  {
    title: "Lightning-fast messaging",
    description:
      "Messages sync instantly across all devices using Convex. No delays, no refresh needed — just real-time communication that keeps your team in sync.",
    image: "/images/instant-messages.png",
    imageAlt: "Portal instant messaging with real-time sync",
  },
  {
    title: "Everything in one inbox",
    description:
      "All your @mentions and direct messages appear in a unified inbox. Quickly catch up on what you missed and mark everything as read with one click.",
    image: "/images/inbox-everything-in-one-place.png",
    imageAlt: "Portal inbox showing mentions and direct messages",
  },
  {
    title: "Organized channels",
    description:
      "Create channels for any topic with custom icons from 100+ options. Set permissions, add descriptions, and keep your workspace structured.",
    image: "/images/create-channels.png",
    imageAlt: "Portal channel creation interface with custom icons",
  },
]

export function FeatureShowcase() {
  return (
    <section className="py-16 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-16 sm:space-y-40">
        {showcases.map((showcase, index) => (
          <motion.div
            key={showcase.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`flex flex-col ${
              index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            } items-center gap-8 lg:gap-24`}
          >
            <div className="flex-1 space-y-4 sm:space-y-6 text-center lg:text-left">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">{showcase.title}</h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-light">{showcase.description}</p>
              <a
                href="https://github.com/tryportal/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-foreground font-medium hover:gap-3 transition-all group"
              >
                Learn more
                <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            <div className="flex-1 w-full">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="rounded-xl sm:rounded-2xl overflow-hidden border border-border/50 shadow-xl sm:shadow-2xl bg-card ring-1 ring-black/5"
              >
                <Image
                  src={showcase.image || "/placeholder.svg"}
                  alt={showcase.imageAlt}
                  width={600}
                  height={400}
                  className="w-full h-auto"
                />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

