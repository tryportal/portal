"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { CaretDown } from "@phosphor-icons/react"

const faqs = [
  {
    question: "What makes Portal different?",
    answer: "Portal is designed to be your team's home base — the first place you go when you start work. It brings messaging, organization, and collaboration into one focused space. Plus, it's completely open source.",
  },
  {
    question: "Is Portal really free?",
    answer: "Yes, Portal is 100% free and open source. No paid tiers, no hidden fees, no usage limits. Your team's workspace shouldn't come with a monthly bill.",
  },
  {
    question: "How does Portal compare to Slack?",
    answer: "Portal offers real-time channels, DMs, file sharing, and mentions — but with a focus on simplicity over feature bloat. It's open source, privacy-first, and designed to stay fast as your team grows.",
  },
  {
    question: "Can I self-host Portal?",
    answer: "Absolutely. Check out our GitHub repository for deployment guides. Run Portal on your own infrastructure with full control over your data and security.",
  },
  {
    question: "What does 'alpha' mean?",
    answer: "We're actively shipping new features every week. Core functionality works great, but you may encounter rough edges. Early adopters help shape what Portal becomes.",
  },
  {
    question: "Is my data secure?",
    answer: "Security is foundational. Portal is privacy-first by design. Self-host for complete control, or use our cloud with confidence. End-to-end encryption is on the roadmap.",
  },
]

function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-sm sm:text-base font-medium text-foreground pr-4">{question}</span>
        <CaretDown 
          className={`size-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed pr-8">{answer}</p>
      </motion.div>
    </div>
  )
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8 sm:mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Questions & Answers
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to know about Portal.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="bg-background border border-border rounded-xl px-5 sm:px-6 shadow-sm"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
