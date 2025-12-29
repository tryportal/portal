import { Navbar } from "@/components/home/navbar"
import { Hero } from "@/components/home/hero"
import { Features } from "@/components/home/features"
import { FeatureShowcase } from "@/components/home/feature-showcase"
import { OpenSource } from "@/components/home/open-source"
import { FAQ } from "@/components/home/faq"
import { CTA } from "@/components/home/cta"
import { Footer } from "@/components/home/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <FeatureShowcase />
      <OpenSource />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}

