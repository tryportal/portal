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
    
    // Check if organization has an image before trying to remove it
    if (!organization.imageUrl) {
      // No image to remove, return early
      return;
    }
    
    try {
      await organization.setLogo({ file: null });
    } catch (error: unknown) {
      // Handle the case where image doesn't exist or is already removed
      if (error instanceof Error) {
        // If the error is about image not found, it's already removed - that's fine
        if (error.message.includes("not found") || error.message.includes("Image not found")) {
          return; // Silently succeed if image is already gone
        }
        throw error;
      }
      throw new Error("Failed to remove organization image");
    }
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
    
    // Check if user has admin permissions
    const membership = organization.membership;
    const userRole = membership?.role;
    const isAdmin = userRole === "org:admin";
    
    if (!membership || !isAdmin) {
      throw new Error("Only organization admins can invite members");
    }
    
    try {
      await organization.inviteMember({
        emailAddress,
        role,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("permission")) {
        throw new Error("You don't have permission to invite members");
      }
      throw error;
    }
  };

  /**
   * Get pending invitations
   */
  const getPendingInvitations = async () => {
    if (!organization) return [];
    
    // Check if user has admin permissions
    const membership = organization.membership;
    const userRole = membership?.role;
    const isAdmin = userRole === "org:admin";
    
    // Only admins can view invitations
    // If membership is not loaded yet or user is not admin, return empty array
    if (!membership || !isAdmin) {
      return [];
    }
    
    try {
      const invitations = await organization.getInvitations();
      return invitations.data?.filter((inv) => inv.status === "pending") ?? [];
    } catch (error) {
      // Handle permission errors gracefully
      if (error instanceof Error && error.message.includes("permission")) {
        console.warn("User lacks permission to view invitations:", error.message);
        return [];
      }
      throw error;
    }
  };

  /**
   * Revoke an invitation
   */
  const revokeInvitation = async (invitationId: string) => {
    if (!organization) throw new Error("No organization found");
    
    // Check if user has admin permissions
    const membership = organization.membership;
    const userRole = membership?.role;
    const isAdmin = userRole === "org:admin";
    
    if (!membership || !isAdmin) {
      throw new Error("Only organization admins can revoke invitations");
    }
    
    try {
      const invitations = await organization.getInvitations();
      const invitation = invitations.data?.find((inv) => inv.id === invitationId);
      if (invitation) {
        await invitation.revoke();
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("permission")) {
        throw new Error("You don't have permission to revoke invitations");
      }
      throw error;
    }
  };

  /**
   * Get organization members
   */
  const getMembers = async () => {
    if (!organization) return [];
    
    try {
      const memberships = await organization.getMemberships();
      return memberships.data ?? [];
    } catch (error) {
      // Handle permission errors gracefully
      if (error instanceof Error && error.message.includes("permission")) {
        console.warn("User lacks permission to view members:", error.message);
        return [];
      }
      throw error;
    }
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

