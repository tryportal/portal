"use client"

import { motion } from "framer-motion"
import { Star, GitFork, Code, ArrowRight } from "@phosphor-icons/react"
import Link from "next/link"
import { GitHubLogo } from "./icons/github-logo"

export function OpenSource() {
  return (
    <section className="py-10 sm:py-16 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-foreground text-background mb-4">
            <Code className="size-5" weight="bold" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Open source at heart</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Portal is fully open source. Audit the code, contribute features, or self-host your own instance. Your data, your rules.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="https://github.com/tryportal/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <GitHubLogo className="w-4 h-4" />
              View on GitHub
              <ArrowRight size={12} weight="bold" />
            </Link>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="size-3.5" weight="fill" />
                <span>Star us</span>
              </div>
              <div className="flex items-center gap-1">
                <GitFork className="size-3.5" weight="fill" />
                <span>Fork & contribute</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
