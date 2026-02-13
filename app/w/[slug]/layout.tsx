import { cookies } from "next/headers";
import { WorkspaceNavbar } from "@/components/workspace-navbar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cookieStore = await cookies();
  cookieStore.set("last-workspace", slug, { path: "/" });

  return (
    <div className="min-h-screen">
      <WorkspaceNavbar slug={slug} />
      {children}
    </div>
  );
}
