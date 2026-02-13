import { WorkspaceNavbar } from "@/components/workspace-navbar";
import { SetLastWorkspace } from "@/components/set-last-workspace";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="min-h-screen">
      <SetLastWorkspace slug={slug} />
      <WorkspaceNavbar slug={slug} />
      {children}
    </div>
  );
}
