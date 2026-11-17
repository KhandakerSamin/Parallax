"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const subscribe = () => () => {};

/** True after hydration: the theme is only known in the browser. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** Light / dark / system, remembered by next-themes. */
export function ThemeMenu() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const Icon = !mounted ? Sun : resolvedTheme === "dark" ? Moon : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Theme"
          className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-9 cursor-pointer place-items-center rounded-full transition-colors"
        >
          <Icon className="size-[18px]" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {THEME_OPTIONS.map(({ value, label, icon: OptionIcon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <OptionIcon aria-hidden />
            {label}
            {mounted && theme === value && <Check className="ml-auto" aria-label="Selected" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
