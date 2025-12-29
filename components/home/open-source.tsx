"use client"

import { motion } from "framer-motion"
import { Star, GitFork, Code } from "@phosphor-icons/react"
import Link from "next/link"
import { GitHubLogo } from "./icons/github-logo"

export function OpenSource() {
  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground text-background mb-6">
            <Code size={32} weight="bold" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Open source at heart</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Portal is fully open source. Audit the code, contribute features, or self-host your own instance. Your data,
            your rules.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://github.com/tryportal/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <GitHubLogo className="w-5 h-5" />
              View Repository
            </Link>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Star size={18} weight="fill" />
                <span className="text-sm">Star us</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GitFork size={18} weight="fill" />
                <span className="text-sm">Fork & contribute</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

