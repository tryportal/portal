import { HashIcon, MegaphoneIcon, LightbulbIcon, CodeIcon, RocketIcon, ChatCircleDotsIcon, BookOpenIcon } from "@phosphor-icons/react"
import type { Message } from "./message-list"

export const mockCategories = [
  {
    id: "general",
    name: "General",
    channels: [
      { id: "announcements", name: "announcements", icon: MegaphoneIcon },
      { id: "general", name: "general", icon: HashIcon },
      { id: "random", name: "random", icon: ChatCircleDotsIcon },
    ],
  },
  {
    id: "engineering",
    name: "Engineering",
    channels: [
      { id: "frontend", name: "frontend", icon: CodeIcon },
      { id: "backend", name: "backend", icon: CodeIcon },
      { id: "devops", name: "devops", icon: RocketIcon },
    ],
  },
  {
    id: "product",
    name: "Product",
    channels: [
      { id: "ideas", name: "ideas", icon: LightbulbIcon },
      { id: "feedback", name: "feedback", icon: ChatCircleDotsIcon },
      { id: "docs", name: "documentation", icon: BookOpenIcon },
    ],
  },
]

export const mockUsers = {
  john: {
    id: "john",
    name: "John Doe",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
    initials: "JD",
  },
  sarah: {
    id: "sarah",
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=face",
    initials: "SC",
  },
  mike: {
    id: "mike",
    name: "Mike Wilson",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
    initials: "MW",
  },
  emma: {
    id: "emma",
    name: "Emma Taylor",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face",
    initials: "ET",
  },
  alex: {
    id: "alex",
    name: "Alex Rivera",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face",
    initials: "AR",
  },
}

export const mockMessages: Record<string, Message[]> = {
  general: [
    {
      id: "1",
      content: "Hey everyone! 👋 Hope you're all having a great Monday. Just wanted to check in and see how the new project kickoff went last week.",
      timestamp: "9:32 AM",
      user: mockUsers.sarah,
    },
    {
      id: "2",
      content: "It went really well! The client was happy with the initial proposal. We're moving forward with the design phase starting tomorrow.",
      timestamp: "9:45 AM",
      user: mockUsers.mike,
    },
    {
      id: "3",
      content: "That's awesome news! 🎉 Let me know if you need any help with the design assets. I've got some time this week.",
      timestamp: "9:48 AM",
      user: mockUsers.emma,
    },
    {
      id: "4",
      content: "Thanks Emma! Actually, we could use some help with the icon set. Can you hop on a quick call later today?",
      timestamp: "9:52 AM",
      user: mockUsers.mike,
    },
    {
      id: "5",
      content: "Of course! I'm free after 2pm. Just send me a calendar invite whenever works for you.",
      timestamp: "9:55 AM",
      user: mockUsers.emma,
    },
    {
      id: "6",
      content: "Perfect, I'll set something up. Also @alex - did you get a chance to review the API specs I sent over Friday?",
      timestamp: "10:02 AM",
      user: mockUsers.mike,
    },
    {
      id: "7",
      content: "Yes! I went through them this morning. Everything looks solid, but I have a few questions about the authentication flow. Want to discuss in standup?",
      timestamp: "10:15 AM",
      user: mockUsers.alex,
    },
    {
      id: "8",
      content: "Sounds good. Standup is in 45 minutes, we can dive into it then.",
      timestamp: "10:18 AM",
      user: mockUsers.mike,
    },
  ],
  announcements: [
    {
      id: "1",
      content: "📢 Team Update: We're excited to announce that our Q4 results exceeded expectations! Thank you all for your incredible hard work. There will be a company-wide celebration next Friday. More details to follow.",
      timestamp: "Yesterday",
      user: mockUsers.john,
    },
    {
      id: "2",
      content: "🎄 Holiday Schedule Reminder: The office will be closed from Dec 24th through Jan 2nd. Please plan accordingly and make sure all critical tasks are wrapped up before then.",
      timestamp: "2 days ago",
      user: mockUsers.sarah,
    },
  ],
  frontend: [
    {
      id: "1",
      content: "Just pushed the new component library updates. Can someone review the PR when you get a chance?",
      timestamp: "11:30 AM",
      user: mockUsers.alex,
    },
    {
      id: "2",
      content: "I'll take a look! Is this the one with the new button variants?",
      timestamp: "11:35 AM",
      user: mockUsers.emma,
    },
    {
      id: "3",
      content: "Yeah, and also includes the updated form components. Let me know if you have any questions.",
      timestamp: "11:38 AM",
      user: mockUsers.alex,
    },
  ],
  ideas: [
    {
      id: "1",
      content: "What do you all think about adding a dark mode toggle? I've been getting a lot of requests from users.",
      timestamp: "Yesterday",
      user: mockUsers.sarah,
    },
    {
      id: "2",
      content: "Love that idea! We already have the color tokens set up for it. Should be fairly straightforward to implement.",
      timestamp: "Yesterday",
      user: mockUsers.alex,
    },
    {
      id: "3",
      content: "+1 from me. Let's add it to the next sprint.",
      timestamp: "Yesterday",
      user: mockUsers.mike,
    },
  ],
}

// Helper to get messages for a channel
export function getMessagesForChannel(channelId: string): Message[] {
  return mockMessages[channelId] || []
}

// Helper to get channel info
export function getChannelInfo(channelId: string) {
  for (const category of mockCategories) {
    const channel = category.channels.find((c) => c.id === channelId)
    if (channel) {
      return channel
    }
  }
  return { id: channelId, name: channelId, icon: HashIcon }
}

