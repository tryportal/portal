import type { Metadata } from "next"
import { Navbar } from "@/components/home/navbar"
import { Footer } from "@/components/home/footer"
import { PrivacyContent } from "@/components/privacy/privacy-content"

export const metadata: Metadata = {
  title: "Privacy Policy | Portal",
  description: "Portal's Privacy Policy - Learn how we collect, use, and protect your data.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <PrivacyContent />
      </div>
      <Footer />
    </main>
  )
}

