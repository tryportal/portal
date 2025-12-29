"use client"

import { motion } from "framer-motion"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "Is Portal really free?",
    answer:
      "Yes, Portal is 100% free and open source. There are no paid tiers, no hidden fees. We believe team communication shouldn't cost a fortune.",
  },
  {
    question: "How does Portal compare to Slack?",
    answer:
      "Portal offers similar core features — channels, DM, file sharing, mentions — but with a focus on privacy and simplicity. Plus, it's open source so you can self-host and own your data.",
  },
  {
    question: "Can I self-host Portal?",
    answer:
      "Absolutely. Check out our GitHub repository for deployment guides. You can run Portal on your own infrastructure with full control over your data.",
  },
  {
    question: "What does 'alpha' mean?",
    answer:
      "Portal is actively being developed. While core features work well, you may encounter bugs or incomplete features. We're shipping fast and improving every day based on user feedback.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security is a priority. Portal is designed with privacy-first principles. When self-hosting, you have complete control. We're also working on end-to-end encryption for the hosted version.",
  },
  {
    question: "How can I contribute?",
    answer:
      "We welcome contributions! Check out our GitHub for open issues, submit PRs, or join our community to discuss features. Every contribution helps make Portal better.",
  },
]

export function FAQ() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Frequently Asked Questions</h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">Got questions? We've got answers.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-sm sm:text-base text-foreground hover:no-underline py-3 sm:py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}

