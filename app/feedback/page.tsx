import type { Metadata } from "next"
import { Navbar } from "@/components/home/navbar"
import { Footer } from "@/components/home/footer"
import { FeedbackForm } from "@/components/feedback/feedback-form"

export const metadata: Metadata = {
  title: "Feature Requests | Portal",
  description: "Share your feature requests and ideas to help us improve Portal.",
}

export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 pb-20 px-6">
        <FeedbackForm />
      </div>
      <Footer />
    </main>
  )
}
