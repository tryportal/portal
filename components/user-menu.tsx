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
  { value: "light", icon: Sun },
  { value: "system", icon: Monitor },
  { value: "dark", icon: Moon },
] as const;

export function UserMenu() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center justify-center rounded-full cursor-pointer outline-none">
        <img
          src={user.imageUrl}
          alt={user.fullName ?? "Profile"}
          className="size-7 rounded-full object-cover"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={0} className="w-44">
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Gear size={14} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-1 px-2 py-1.5">
          <span className="text-xs font-medium mr-auto">Theme</span>
          <div className="flex items-center gap-0.5 rounded-full border border-border p-0.5">
            {themeOptions.map((option) => {
              const isActive = theme === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex size-6 items-center justify-center rounded-full transition-colors ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={14} weight={isActive ? "bold" : "regular"} />
                </button>
              );
            })}
          </div>
        </div>
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
