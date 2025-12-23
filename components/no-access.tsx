"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LockKey, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface NoAccessProps {
  slug: string;
  organizationExists: boolean;
}

export function NoAccess({ slug, organizationExists }: NoAccessProps) {
  const router = useRouter();
  const userOrgs = useQuery(api.organizations.getUserOrganizations);

  const handleGoToOrganization = (orgSlug: string) => {
    router.push(`/${orgSlug}`);
  };

  const handleSetup = () => {
    router.push("/setup");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F4] p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white shadow-sm">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#26251E]/5 flex items-center justify-center">
            <LockKey className="w-8 h-8 text-[#26251E]/40" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-[#26251E]">
              {organizationExists ? "No Access" : "Workspace Not Found"}
            </h1>
            <p className="text-sm text-[#26251E]/60">
              {organizationExists 
                ? `You don't have access to the workspace "${slug}". Please contact an admin to get an invitation.`
                : `The workspace "${slug}" doesn't exist or has been removed.`
              }
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {userOrgs && userOrgs.length > 0 ? (
            <>
              <div className="text-xs font-medium text-[#26251E]/60 uppercase tracking-wider">
                Your Workspaces
              </div>
              <div className="space-y-2">
                {userOrgs.map((org) => (
                  <button
                    key={org._id}
                    onClick={() => handleGoToOrganization(org.slug)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-[#26251E]/10 hover:bg-[#26251E]/5 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[#26251E]/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-[#26251E]">
                            {org.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-[#26251E]">
                          {org.name}
                        </div>
                        <div className="text-xs text-[#26251E]/50">
                          /{org.slug}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#26251E]/30 group-hover:text-[#26251E]/60 transition-colors" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-medium text-[#26251E]/60 uppercase tracking-wider">
                Get Started
              </div>
              <Button
                onClick={handleSetup}
                className="w-full bg-[#26251E] hover:bg-[#26251E]/90 text-white"
              >
                Create a Workspace
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
