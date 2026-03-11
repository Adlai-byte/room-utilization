"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // Silently fail on polling errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch {
      // Silently fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      // Silently fail
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center rounded-lg p-2 text-slate-600 outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              className="text-orange-600 hover:text-orange-700"
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Bell className="mb-2 h-8 w-8" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                  !notification.read && "bg-orange-50/50"
                )}
              >
                {/* Unread indicator */}
                <div className="mt-1.5 flex-shrink-0">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      notification.read
                        ? "bg-transparent"
                        : "bg-orange-500"
                    )}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm",
                      notification.read
                        ? "font-normal text-slate-600"
                        : "font-medium text-slate-900"
                    )}
                  >
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
