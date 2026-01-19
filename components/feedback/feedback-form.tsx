"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function FeedbackForm() {
  const { user } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    featureDescription: "",
    problemSolved: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const webhookUrl =
        "https://discord.com/api/webhooks/1462749772351016972/kSQrmPtrP7A3i6vmib9Wc-E4__5nrq-srsastFUdPuGXQ3bWlEKVKUDShQfVm24gPnV-"

      const userEmail = user?.primaryEmailAddress?.emailAddress

      const fields = [
        {
          name: "Name",
          value: formData.name || "Not provided",
          inline: true,
        },
        ...(userEmail
          ? [
              {
                name: "Email",
                value: userEmail,
                inline: true,
              },
            ]
          : []),
        {
          name: "Feature Description",
          value: formData.featureDescription || "Not provided",
        },
        {
          name: "What problem does this solve?",
          value: formData.problemSolved || "Not provided",
        },
      ]

      const embed = {
        title: "📬 New Feature Request",
        color: 0x5865f2,
        fields,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "<@1128770568032886874> New feature request submitted!",
          embeds: [embed],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      setIsSubmitted(true)
    } catch (error) {
      console.error("Failed to submit feedback:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-bold mb-4">Thank you!</h1>
        <p className="text-muted-foreground">
          Your feature request has been submitted. We appreciate your feedback!
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Feature Requests</h1>
        <p className="text-muted-foreground">
          Have an idea for Portal? We&apos;d love to hear it!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="featureDescription">
            Describe the feature you&apos;d like to see
          </Label>
          <Textarea
            id="featureDescription"
            placeholder="I would love to see..."
            rows={4}
            required
            value={formData.featureDescription}
            onChange={(e) =>
              setFormData({ ...formData, featureDescription: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="problemSolved">
            What problem would this feature solve for you?
          </Label>
          <Textarea
            id="problemSolved"
            placeholder="This would help me..."
            rows={3}
            value={formData.problemSolved}
            onChange={(e) =>
              setFormData({ ...formData, problemSolved: e.target.value })
            }
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Feature Request"}
        </Button>
      </form>
    </div>
  )
}
