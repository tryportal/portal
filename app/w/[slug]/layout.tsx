import { WorkspaceNavbar } from "@/components/workspace-navbar";
import { WorkspaceShell } from "@/components/workspace-shell";
import { SetLastWorkspace } from "@/components/set-last-workspace";
import { MobileSidebarProvider } from "@/components/mobile-sidebar-context";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <MobileSidebarProvider>
      <div className="min-h-screen">
        <SetLastWorkspace slug={slug} />
        <WorkspaceNavbar slug={slug} />
        <WorkspaceShell slug={slug}>{children}</WorkspaceShell>
      </div>
    </MobileSidebarProvider>
  );
}
