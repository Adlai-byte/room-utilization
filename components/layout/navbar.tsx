"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Building2,
  BookOpen,
  Menu,
  X,
  Search,
  ClipboardList,
  FileText,
  GraduationCap,
} from "lucide-react";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
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

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const navLinks = allNavLinks.filter(
    (link) => !user?.role || link.roles.includes(user.role)
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white no-print">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-xl font-bold text-transparent">
            PA-Set
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <NotificationBell />
          <UserMenu />

          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-orange-50 text-orange-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
