"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";

/**
 * Hook to get organization management utilities
 */
export function useOrganizationManager() {
  const { organization, isLoaded } = useOrganization();
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  /**
   * Update organization name and slug
   */
  const updateOrganization = async (data: { name?: string; slug?: string }) => {
    if (!organization) throw new Error("No organization found");
    try {
      await organization.update(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Handle slug conflict errors
        if (error.message.includes("slug") || error.message.includes("taken")) {
          throw new Error("That slug is already taken. Please try another.");
        }
        throw error;
      }
      throw new Error("Failed to update organization");
    }
  };

  /**
   * Update organization image
   */
  const updateOrganizationImage = async (file: File) => {
    if (!organization) throw new Error("No organization found");
    await organization.setLogo({ file });
  };

  /**
   * Remove organization image
   */
  const removeOrganizationImage = async () => {
    if (!organization) throw new Error("No organization found");
    await organization.setLogo({ file: null });
  };

  /**
   * Update organization public metadata (for storing description)
   * Note: Clerk organizations don't support metadata updates via frontend SDK.
   * Metadata should be stored in Convex or updated via Clerk backend API.
   * This function is kept for API compatibility but does nothing.
   */
  const updateOrganizationMetadata = async (_metadata: Record<string, unknown>) => {
    if (!organization) throw new Error("No organization found");
    // Clerk organizations don't support publicMetadata updates via frontend SDK
    // The description is stored in Convex instead, so this is a no-op
    // If you need to update Clerk metadata, use the Clerk backend API
  };

  /**
   * Invite a member to the organization
   */
  const inviteMember = async (emailAddress: string, role: "org:admin" | "org:member" = "org:member") => {
    if (!organization) throw new Error("No organization found");
    await organization.inviteMember({
      emailAddress,
      role,
    });
  };

  /**
   * Get pending invitations
   */
  const getPendingInvitations = async () => {
    if (!organization) return [];
    const invitations = await organization.getInvitations();
    return invitations.data?.filter((inv) => inv.status === "pending") ?? [];
  };

  /**
   * Revoke an invitation
   */
  const revokeInvitation = async (invitationId: string) => {
    if (!organization) throw new Error("No organization found");
    const invitations = await organization.getInvitations();
    const invitation = invitations.data?.find((inv) => inv.id === invitationId);
    if (invitation) {
      await invitation.revoke();
    }
  };

  /**
   * Get organization members
   */
  const getMembers = async () => {
    if (!organization) return [];
    const memberships = await organization.getMemberships();
    return memberships.data ?? [];
  };

  return {
    organization,
    isLoaded,
    userMemberships: userMemberships?.data ?? [],
    setActive,
    updateOrganization,
    updateOrganizationImage,
    removeOrganizationImage,
    updateOrganizationMetadata,
    inviteMember,
    getPendingInvitations,
    revokeInvitation,
    getMembers,
  };
}

