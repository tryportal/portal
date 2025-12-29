"use client"

import { motion } from "framer-motion"
import { Star, GitFork, Code } from "@phosphor-icons/react"
import Link from "next/link"
import { GitHubLogo } from "./icons/github-logo"

export function OpenSource() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-foreground text-background mb-4 sm:mb-6">
            <Code className="size-6 sm:size-8" weight="bold" />
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Open source at heart</h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Portal is fully open source. Audit the code, contribute features, or self-host your own instance. Your data,
            your rules.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://github.com/tryportal/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-foreground text-background px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
            >
              <GitHubLogo className="w-4 h-4 sm:w-5 sm:h-5" />
              View Repository
            </Link>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Star className="size-4 sm:size-[18px]" weight="fill" />
                <span className="text-xs sm:text-sm">Star us</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GitFork className="size-4 sm:size-[18px]" weight="fill" />
                <span className="text-xs sm:text-sm">Fork & contribute</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

