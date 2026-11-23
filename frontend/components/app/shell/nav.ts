import {
  FileStack,
  Gavel,
  LayoutDashboard,
  Lightbulb,
  ScanSearch,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { isAdmin, isReviewer, type Role } from "@/lib/auth/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Count shown as a badge (the review queue's waiting reports). */
  badge?: "reviews";
  /** Active only on an exact match (Overview), not on every sub-path. */
  exact?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

/**
 * The sidebar, filtered by role. Hiding an item is only cosmetic: every page and API
 * call still checks the session and role on the server.
 */
export function navFor(role: Role): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "Workspace",
      items: [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
        { href: "/dashboard/related", label: "Prior work", icon: Lightbulb },
        { href: "/dashboard/analyze", label: "Analyze", icon: ScanSearch },
        { href: "/dashboard/reports", label: "My reports", icon: FileStack },
      ],
    },
  ];
  if (isReviewer(role)) {
    groups.push({
      label: "Review",
      items: [{ href: "/dashboard/reviews", label: "Review queue", icon: Gavel, badge: "reviews" }],
    });
  }
  if (isAdmin(role)) {
    groups.push({
      label: "Manage",
      items: [{ href: "/dashboard/admin", label: "Administration", icon: Users }],
    });
  }
  groups.push({
    label: "Account",
    items: [{ href: "/dashboard/settings", label: "Settings", icon: Settings }],
  });
  return groups;
}

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const TITLES: [RegExp, string][] = [
  [/^\/dashboard\/related/, "Prior work"],
  [/^\/dashboard\/analyze/, "Analyze"],
  [/^\/dashboard\/reports/, "My reports"],
  [/^\/dashboard\/reviews/, "Review queue"],
  [/^\/dashboard\/admin/, "Administration"],
  [/^\/dashboard\/settings/, "Settings"],
];

/** The breadcrumb trail for a path; a page can add its own last crumb (a report title). */
export function crumbsFor(pathname: string): { href: string; label: string }[] {
  for (const [pattern, label] of TITLES) {
    const match = pattern.exec(pathname);
    if (match) return [{ href: match[0], label }];
  }
  return [{ href: "/dashboard", label: "Overview" }];
}
