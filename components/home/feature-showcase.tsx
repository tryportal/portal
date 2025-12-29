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
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto space-y-32">
        {showcases.map((showcase, index) => (
          <motion.div
            key={showcase.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className={`flex flex-col ${
              index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            } items-center gap-12 lg:gap-16`}
          >
            <div className="flex-1 space-y-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{showcase.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{showcase.description}</p>
              <a
                href="https://github.com/tryportal/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-foreground font-medium hover:gap-3 transition-all"
              >
                Learn more
                <ArrowRight size={16} weight="bold" />
              </a>
            </div>
            <div className="flex-1 w-full">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="rounded-2xl overflow-hidden border border-border shadow-xl"
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

