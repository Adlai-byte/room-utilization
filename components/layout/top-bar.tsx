"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 no-print md:justify-end">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile logo */}
      <span className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-xl font-bold text-transparent md:hidden">
        PA-Set
      </span>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
