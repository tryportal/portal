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
    <section className="py-16 sm:py-32 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 sm:mb-20"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight px-2">Everything you need for team communication</h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-light px-4">
            Built for teams who value simplicity, speed, and privacy.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              whileHover={{ y: -5 }}
              className="bg-background border border-border/50 rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:shadow-lg hover:border-foreground/10 transition-all duration-300"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-muted/50 flex items-center justify-center mb-4 sm:mb-6 text-foreground">
                <feature.icon className="size-5 sm:size-6" weight="fill" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

