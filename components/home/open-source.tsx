"use client"

import { motion } from "framer-motion"
import { Star, GitFork, ArrowRight } from "@phosphor-icons/react"
import Link from "next/link"
import { GitHubLogo } from "./icons/github-logo"

export function OpenSource() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          {/* Large Typography */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Open source.{" "}
            <span className="text-muted-foreground">Always.</span>
          </h2>

          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Audit the code, contribute features, or run Portal on your own servers. 
            Your data, your rules.
          </p>

          {/* CTA */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://github.com/tryportal/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all shadow-md shadow-foreground/10"
            >
              <GitHubLogo className="w-4 h-4" />
              View on GitHub
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>

          {/* Stats / Social Proof */}
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="size-4 text-foreground" weight="fill" />
              <span>Star the repo</span>
            </div>
            <div className="flex items-center gap-2">
              <GitFork className="size-4 text-foreground" weight="fill" />
              <span>Fork & contribute</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
