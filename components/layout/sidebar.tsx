"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Inbox,
  Users,
  LogOut,
  LayoutDashboard,
  TrendingUp,
  MessageCircleQuestion,
  FileText,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@prisma/client";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
  };
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/ask", label: "Ask LOOP", icon: MessageCircleQuestion },
  { href: "/reports", label: "Reports", icon: FileText },
];

function LoopMark() {
  // The signature element: a scatter of dots (scattered feedback) with a
  // single arc threading through and closing around them (the loop being
  // closed) - the product's own metaphor, rather than a generic
  // letter-in-a-box logo.
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="9" cy="11" r="2" fill="currentColor" opacity="0.55" />
      <circle cx="22" cy="9" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="24" cy="20" r="2" fill="currentColor" opacity="0.55" />
      <circle cx="11" cy="23" r="1.5" fill="currentColor" opacity="0.4" />
      <path
        d="M9 11a9 9 0 1 0 15 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Inbox;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive ? "bg-primary-50 text-primary" : "text-fg-2 hover:bg-base-3/60 hover:text-fg"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

/**
 * Responsive since Milestone 4: on screens >= lg, this renders exactly as
 * it always has (static, always visible - `lg:static lg:translate-x-0`
 * restores the original layout precisely). Below lg, it's a fixed-position
 * drawer, translated off-screen unless `isMobileOpen`, closed by its own X
 * button, the backdrop (rendered by AppShell), or navigating anywhere.
 */
export function Sidebar({ user, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "no-print glass fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r transition-transform duration-200 ease-out",
        "lg:static lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2.5 border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-white shadow-glow">
            <LoopMark />
          </div>
          <span className="text-lg font-semibold tracking-tight text-fg">LOOP</span>
        </div>
        <button
          onClick={onMobileClose}
          className="rounded-md p-1 text-fg-3 hover:bg-base-3/60 hover:text-fg lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-3">
          Workspace
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            isActive={pathname.startsWith(item.href)}
            onClick={onMobileClose}
          />
        ))}

        {user.role === "ADMIN" && (
          <>
            <p className="px-3 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-wider text-fg-3">
              Admin
            </p>
            <NavLink
              href="/settings/members"
              label="Members"
              icon={Users}
              isActive={pathname.startsWith("/settings")}
              onClick={onMobileClose}
            />
          </>
        )}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
            {initials(user.name ?? user.email ?? "?")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{user.name}</p>
            <p className="truncate text-xs text-fg-3">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-fg-2 transition-colors hover:bg-base-3/60 hover:text-fg"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
