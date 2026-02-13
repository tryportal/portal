import { WorkspaceNavbar } from "@/components/workspace-navbar";

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
      <WorkspaceNavbar slug={slug} />
      {children}
    </div>
  );
}
