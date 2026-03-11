"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-700">
          {getInitials(user.name)}
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-56 p-0">
        {/* User info */}
        <div className="flex flex-col gap-1 border-b border-slate-200 p-3">
          <span className="text-sm font-medium text-slate-900">
            {user.name}
          </span>
          <span className="text-xs text-slate-500">{user.email}</span>
          <Badge
            className={
              user.role === "super_admin"
                ? "mt-1 w-fit bg-orange-100 text-orange-700 hover:bg-orange-100"
                : user.role === "instructor"
                ? "mt-1 w-fit bg-blue-100 text-blue-700 hover:bg-blue-100"
                : "mt-1 w-fit bg-slate-100 text-slate-700 hover:bg-slate-100"
            }
          >
            {user.role === "super_admin"
              ? "Super Admin"
              : user.role === "instructor"
              ? "Instructor"
              : "Admin"}
          </Badge>
        </div>
        {/* Logout */}
        <div className="p-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-600 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
