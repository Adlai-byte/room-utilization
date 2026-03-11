"use client";

import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-700">
          {getInitials(user.name)}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1 p-2">
          <span className="text-sm font-medium text-foreground">
            {user.name}
          </span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
          <Badge
            className={
              user.role === "super_admin"
                ? "mt-1 w-fit bg-orange-100 text-orange-700 hover:bg-orange-100"
                : user.role === "instructor"
                ? "mt-1 w-fit bg-blue-100 text-blue-700 hover:bg-blue-100"
                : "mt-1 w-fit bg-slate-100 text-slate-700 hover:bg-slate-100"
            }
          >
            {user.role === "super_admin" ? "Super Admin" : user.role === "instructor" ? "Instructor" : "Admin"}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
