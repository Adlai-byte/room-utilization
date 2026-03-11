"use client";

import { format } from "date-fns";
import { X, Clock, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DayBooking {
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  instructor: string;
  roomId: string;
}

const typeStyles: Record<string, { badge: string; label: string }> = {
  class: { badge: "bg-blue-100 text-blue-700 border-blue-200", label: "Class" },
  event: { badge: "bg-purple-100 text-purple-700 border-purple-200", label: "Event" },
  recurring: { badge: "bg-green-100 text-green-700 border-green-200", label: "Recurring" },
};

interface DayDetailProps {
  date: string;
  bookings: DayBooking[];
  roomNames: Record<string, string>;
  onClose: () => void;
}

export function DayDetail({ date, bookings, roomNames, onClose }: DayDetailProps) {
  const dateObj = new Date(date + "T00:00:00");
  const sorted = [...bookings].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {format(dateObj, "EEEE, MMMM d, yyyy")}
          </h3>
          <p className="text-xs text-slate-500">
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Booking list */}
      <div className="max-h-[400px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-400">
            No bookings for this day
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sorted.map((booking, i) => {
              const style = typeStyles[booking.type] || typeStyles.class;
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {booking.title}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {booking.startTime} - {booking.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {roomNames[booking.roomId] || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {booking.instructor}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 text-[10px]", style.badge)}
                    >
                      {style.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
