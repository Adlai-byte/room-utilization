"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, Users } from "lucide-react";
import { Room, Booking } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ScheduleView = "daily" | "weekly" | "monthly";

const typeStyles: Record<string, { bg: string; border: string; text: string; label: string }> = {
  class: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", label: "Class" },
  event: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", label: "Event" },
  recurring: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", label: "Recurring" },
};

interface RoomScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  buildingColor: string;
  /** Fetch bookings for room within a date range. Returns bookings keyed by date. */
  fetchRoomBookings: (
    roomId: string,
    dates: string[]
  ) => Promise<Record<string, Booking[]>>;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RoomScheduleModal({
  open,
  onOpenChange,
  room,
  buildingColor,
  fetchRoomBookings,
}: RoomScheduleModalProps) {
  const [view, setView] = useState<ScheduleView>("daily");
  const [refDate, setRefDate] = useState(new Date());
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, Booking[]>>({});
  const [loading, setLoading] = useState(false);

  // Compute date range based on view
  const dateRange = useMemo(() => {
    if (view === "daily") {
      return [formatLocalDate(refDate)];
    }
    if (view === "weekly") {
      const start = startOfWeek(refDate, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(refDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end }).map(formatLocalDate);
    }
    // monthly
    const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const last = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    return eachDayOfInterval({ start: first, end: last }).map(formatLocalDate);
  }, [view, refDate]);

  const fetchData = useCallback(async () => {
    if (!room || !open) return;
    setLoading(true);
    try {
      const data = await fetchRoomBookings(room.id, dateRange);
      setBookingsByDate(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [room, open, dateRange, fetchRoomBookings]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset view when modal opens
  useEffect(() => {
    if (open) {
      setRefDate(new Date());
      setView("daily");
    }
  }, [open]);

  const navigate = (direction: -1 | 1) => {
    if (view === "daily") setRefDate(addDays(refDate, direction));
    else if (view === "weekly") setRefDate(direction === 1 ? addWeeks(refDate, 1) : subWeeks(refDate, 1));
    else setRefDate(direction === 1 ? addMonths(refDate, 1) : subMonths(refDate, 1));
  };

  const goToToday = () => setRefDate(new Date());

  const headerLabel = useMemo(() => {
    if (view === "daily") return format(refDate, "EEEE, MMMM d, yyyy");
    if (view === "weekly") {
      const start = startOfWeek(refDate, { weekStartsOn: 1 });
      const end = endOfWeek(refDate, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    }
    return format(refDate, "MMMM yyyy");
  }, [view, refDate]);

  // Total bookings in range
  const totalBookings = Object.values(bookingsByDate).reduce((sum, arr) => sum + arr.length, 0);

  // Filter to dates that actually have bookings (for weekly/monthly)
  const datesWithBookings = dateRange.filter(
    (d) => bookingsByDate[d] && bookingsByDate[d].length > 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: buildingColor }}
            />
            {room?.name || "Room Schedule"}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Capacity: {room?.capacity}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {room?.amenities.join(", ") || "No amenities"}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* View toggle + navigation */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(["daily", "weekly", "monthly"] as ScheduleView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                  view === v
                    ? "bg-white text-orange-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium text-slate-700 min-w-0 truncate">
              {headerLabel}
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => navigate(1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-xs text-orange-600"
            >
              Today
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="text-xs text-slate-400">
          {totalBookings} booking{totalBookings !== 1 ? "s" : ""} in this period
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">
              Loading...
            </div>
          ) : totalBookings === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">
              No bookings scheduled for this period
            </div>
          ) : view === "daily" ? (
            // Daily: simple list
            <div className="space-y-2">
              {(bookingsByDate[dateRange[0]] || [])
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((booking, i) => (
                  <BookingRow key={i} booking={booking} />
                ))}
            </div>
          ) : (
            // Weekly/Monthly: grouped by date
            <div className="space-y-4">
              {datesWithBookings.map((dateStr) => {
                const dateObj = new Date(dateStr + "T00:00:00");
                const dayBookings = (bookingsByDate[dateStr] || []).sort((a, b) =>
                  a.startTime.localeCompare(b.startTime)
                );
                return (
                  <div key={dateStr}>
                    <div className="sticky top-0 z-10 mb-1.5 flex items-center gap-2 bg-white py-1">
                      <span className="text-xs font-semibold text-slate-700">
                        {format(dateObj, "EEE, MMM d")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1.5 pl-2 border-l-2 border-slate-100">
                      {dayBookings.map((booking, i) => (
                        <BookingRow key={i} booking={booking} compact />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookingRow({ booking, compact }: { booking: Booking; compact?: boolean }) {
  const style = typeStyles[booking.type] || typeStyles.class;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        style.bg,
        style.border,
        compact && "p-2"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("font-medium text-slate-900", compact ? "text-xs" : "text-sm")}>
            {booking.title}
          </p>
          <div className={cn("mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-500", compact ? "text-[10px]" : "text-xs")}>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {booking.startTime} - {booking.endTime}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {booking.instructor}
            </span>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[10px]", style.text, style.border)}>
          {style.label}
        </Badge>
      </div>
    </div>
  );
}
