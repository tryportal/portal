"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { CaretDown } from "@phosphor-icons/react"

const faqs = [
  {
    question: "Is Portal really free?",
    answer: "Yes, Portal is 100% free and open source. No paid tiers, no hidden fees. Team communication shouldn't cost a fortune.",
  },
  {
    question: "How does Portal compare to Slack?",
    answer: "Portal offers similar core features — channels, DMs, file sharing, mentions — but with a focus on privacy and simplicity. Plus, it's open source so you can self-host.",
  },
  {
    question: "Can I self-host Portal?",
    answer: "Absolutely. Check out our GitHub repository for deployment guides. Run Portal on your own infrastructure with full control over your data.",
  },
  {
    question: "What does 'alpha' mean?",
    answer: "Portal is actively being developed. Core features work well, but you may encounter bugs. We're shipping fast and improving based on user feedback.",
  },
  {
    question: "Is my data secure?",
    answer: "Security is a priority. Portal is designed with privacy-first principles. When self-hosting, you have complete control. E2E encryption is coming soon.",
  },
  {
    question: "How can I contribute?",
    answer: "We welcome contributions! Check out our GitHub for open issues, submit PRs, or join our community to discuss features.",
  },
]

function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 text-left group"
      >
        <span className="text-sm font-medium text-foreground pr-4">{question}</span>
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
        <p className="pb-3 text-xs text-muted-foreground leading-relaxed pr-8">{answer}</p>
      </motion.div>
    </div>
  )
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-10 sm:py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">FAQ</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Got questions? We&apos;ve got answers.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-background border border-border rounded-lg px-4"
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
