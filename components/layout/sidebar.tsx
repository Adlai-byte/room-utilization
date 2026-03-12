"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Building2,
  BookOpen,
  Search,
  ClipboardList,
  FileText,
  GraduationCap,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const allNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin"] },
  { href: "/schedule", label: "Schedule", icon: Calendar, roles: ["super_admin", "admin"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["super_admin", "admin"] },
  { href: "/rooms", label: "Rooms", icon: Building2, roles: ["super_admin", "admin"] },
  { href: "/bookings", label: "Bookings", icon: BookOpen, roles: ["super_admin", "admin", "instructor"] },
  { href: "/availability", label: "Search", icon: Search, roles: ["super_admin", "admin", "instructor"] },
  { href: "/requests", label: "Requests", icon: ClipboardList, roles: ["super_admin", "admin"] },
  { href: "/activity-log", label: "Activity", icon: FileText, roles: ["super_admin", "admin"] },
  { href: "/semesters", label: "Semesters", icon: GraduationCap, roles: ["super_admin"] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobile, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navLinks = allNavLinks.filter(
    (link) => !user?.role || link.roles.includes(user.role)
  );

  return (
    <div className={cn(
      "flex h-full flex-col bg-white border-r border-slate-200 no-print",
      mobile ? "w-64" : collapsed ? "w-16" : "w-64",
      "transition-[width] duration-200 ease-in-out"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex h-14 items-center border-b border-slate-200 px-4",
        collapsed && !mobile && "justify-center px-0"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-xl font-bold text-transparent">
            {collapsed && !mobile ? "P" : "PA-Set"}
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navLinks.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              title={collapsed && !mobile ? link.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && !mobile && "justify-center px-0",
                isActive
                  ? "bg-orange-50 text-orange-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {(!collapsed || mobile) && (
                <span className="truncate">{link.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle — desktop only */}
      {!mobile && (
        <div className="border-t border-slate-200 p-2">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="h-5 w-5 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
