"use client";

import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Gear, SignOut } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-14 items-center justify-center border-l border-border transition-colors hover:bg-muted cursor-pointer outline-none">
        <img
          src={user.imageUrl}
          alt={user.fullName ?? "Profile"}
          className="size-6 object-cover"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={0} className="w-44">
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Gear size={14} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ redirectUrl: "/" })}
        >
          <SignOut size={14} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
