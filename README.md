# Portal

Team chat, reimagined. Built with Next.js 15, Convex, and Clerk.

## Features

- Real-time messaging with channels and direct messages
- File attachments and image uploads
- Reactions, replies, and message pinning
- Workspace management with role-based access
- Typing indicators and read receipts

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Clerk account for authentication
- A Convex account for the backend

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/portal.git
   cd portal
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the environment file and configure it:
   ```bash
   cp .env.example .env.local
   ```
   
   Optional environment variables:
   - `NEXT_PUBLIC_DATABUDDY_CLIENT_ID` - Your Databuddy client ID (for analytics)
   - `NEXT_PUBLIC_POSTHOG_KEY` - Your PostHog key (for event tracking)

4. Start Convex (in a separate terminal):
   ```bash
   bun run dev:convex
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Backend**: Convex
- **Auth**: Clerk
- **Styling**: Tailwind CSS
- **Analytics**: PostHog (optional), Databuddy (optional)

## License

MIT

