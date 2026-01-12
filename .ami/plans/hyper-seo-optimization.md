---
name: "Hyper SEO Optimization"
overview: "Add comprehensive SEO optimizations including sitemap, robots.txt, Open Graph meta, JSON-LD structured data, and improved metadata for all public pages."
todos:
  - id: "sitemap"
    content: "Create app/sitemap.ts with public routes"
    status: not_started
  - id: "robots"
    content: "Create app/robots.ts with crawler config"
    status: not_started
  - id: "root-meta"
    content: "Add OpenGraph, Twitter, canonical, keywords to root layout"
    status: not_started
  - id: "home-meta"
    content: "Add metadata export to home page"
    status: not_started
  - id: "jsonld"
    content: "Add JSON-LD structured data (Organization, WebApplication, FAQPage)"
    status: not_started
  - id: "og-image"
    content: "Create or add Open Graph preview image"
    status: not_started
createdAt: "2026-01-12T02:37:27.386Z"
updatedAt: "2026-01-12T02:38:10.550Z"
---

# SEO Hyper-Optimization Plan

Domain: `https://tryportal.app`

## 1. Core SEO Files
- **`app/sitemap.ts`** - Sitemap with /home, /privacy routes
- **`app/robots.ts`** - Allow all crawlers, reference sitemap

## 2. Root Metadata (`app/layout.tsx`)
```ts
metadataBase: new URL('https://tryportal.app'),
openGraph: { title, description, url, siteName, type: 'website', images },
twitter: { card: 'summary_large_image', title, description, images },
keywords: ['team chat', 'slack alternative', 'open source', 'privacy', ...],
alternates: { canonical: 'https://tryportal.app' }
```

## 3. Home Page (`app/home/page.tsx`)
- Add page-specific metadata with landing page keywords
- Add JSON-LD: Organization + SoftwareApplication + FAQPage schemas

## 4. OG Image
- Add static `public/og-image.png` (1200x630) for social previews

## Key Files
- `app/layout.tsx` - Root metadata
- `app/home/page.tsx` - Landing page metadata + JSON-LD
- `app/sitemap.ts` - New
- `app/robots.ts` - New