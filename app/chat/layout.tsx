import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WorkspaceNavbar } from "@/components/workspace-navbar";
import { ChatShell } from "@/components/chat-shell";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const slug = cookieStore.get("last-workspace")?.value;

  if (!slug) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen">
      <WorkspaceNavbar slug={slug} />
      <ChatShell>{children}</ChatShell>
    </div>
  );
}
