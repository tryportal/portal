"use client";

import * as React from "react";
import { SunIcon, MoonIcon } from "@phosphor-icons/react";
import { useTheme } from "@/lib/theme-provider";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface ThemeToggleProps {
  variant?: "icon" | "dropdown";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    analytics.themeChanged({ theme: newTheme });
  };

  // Simple icon toggle between light/dark
  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => handleThemeChange(resolvedTheme === "light" ? "dark" : "light")}
        className={`text-muted-foreground hover:text-foreground ${className}`}
        title={resolvedTheme === "light" ? "Dark mode" : "Light mode"}
      >
        <SunIcon className="size-[18px] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <MoonIcon className="absolute size-[18px] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  // Dropdown with light/dark/system options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={`text-muted-foreground hover:text-foreground ${className}`}
          />
        }
      >
        <SunIcon className="size-[18px] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <MoonIcon className="absolute size-[18px] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <SunIcon className="size-4 mr-2" />
          Light
          {theme === "light" && <span className="ml-auto text-xs opacity-60">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <MoonIcon className="size-4 mr-2" />
          Dark
          {theme === "dark" && <span className="ml-auto text-xs opacity-60">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <span className="size-4 mr-2 flex items-center justify-center text-xs">💻</span>
          System
          {theme === "system" && <span className="ml-auto text-xs opacity-60">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

