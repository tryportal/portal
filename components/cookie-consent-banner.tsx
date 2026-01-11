"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const COOKIE_CONSENT_KEY = "portal-cookie-consent"

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)

useEffect(() => {
  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (consent === null) {
      setShowBanner(true)
    }
  } catch (error) {
    // Failed to access localStorage, don't show banner
    console.warn('localStorage not available:', error)
  }
}, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted")
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined")
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-background border border-border rounded-lg p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <p className="text-sm text-muted-foreground flex-1">
            We use cookies to improve your experience and analyze site usage.{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Learn more
            </Link>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleDecline}>
              Decline
            </Button>
            <Button size="sm" onClick={handleAccept}>
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
