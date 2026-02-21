"use client";

import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Gear, SignOut, Moon, Sun, Monitor } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function UserMenu() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  const nextTheme = () => {
    const current = themeOptions.findIndex((o) => o.value === theme);
    const next = (current + 1) % themeOptions.length;
    setTheme(themeOptions[next].value);
  };

  const currentOption = themeOptions.find((o) => o.value === theme) ?? themeOptions[2];
  const ThemeIcon = currentOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-14 items-center justify-center border-l border-border hover:bg-muted cursor-pointer outline-none">
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
        <DropdownMenuItem onClick={nextTheme}>
          <ThemeIcon size={14} />
          {currentOption.label}
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
