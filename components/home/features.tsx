"use client"

import { motion } from "framer-motion"
import { Lightning, ShieldCheck, Users, ChatCircle, Bell, Folder } from "@phosphor-icons/react"

const features = [
  {
    icon: Lightning,
    title: "Instant Messaging",
    description: "Messages sync in real-time using Convex. No refresh needed — everything stays in sync, always.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description: "Your conversations stay yours. Self-host or use our platform with end-to-end security.",
  },
  {
    icon: Users,
    title: "Team Channels",
    description: "Organize conversations into topic-based channels. Keep discussions focused and searchable.",
  },
  {
    icon: ChatCircle,
    title: "Direct Messages",
    description: "Private one-on-one conversations with read receipts and typing indicators.",
  },
  {
    icon: Bell,
    title: "Smart Inbox",
    description: "All your mentions and unread messages in one place. Never miss what matters.",
  },
  {
    icon: Folder,
    title: "File Sharing",
    description: "Share files and images up to 5MB. Keep your team's resources accessible.",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function Features() {
  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Everything you need for team communication</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for teams who value simplicity, speed, and privacy.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="bg-card border border-border rounded-xl p-6 hover:border-foreground/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                <feature.icon size={24} weight="duotone" className="text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

