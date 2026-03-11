"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DayBooking {
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  instructor: string;
  roomId: string;
}

interface CalendarDay {
  count: number;
  bookings: DayBooking[];
}

interface MonthCalendarProps {
  year: number;
  month: number; // 0-indexed
  days: Record<string, CalendarDay>;
  roomNames: Record<string, string>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const typeColors: Record<string, string> = {
  class: "bg-blue-400",
  event: "bg-purple-400",
  recurring: "bg-green-400",
};

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MonthCalendar({
  year,
  month,
  days,
  roomNames,
  selectedDate,
  onSelectDate,
}: MonthCalendarProps) {
  const today = useMemo(() => formatLocalDate(new Date()), []);

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun

    const cells: Array<{ date: string | null; day: number }> = [];

    // Leading empty cells
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, day: 0 });
    }

    // Day cells
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      cells.push({ date: formatLocalDate(dateObj), day: d });
    }

    return cells;
  }, [year, month]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="px-1 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {calendarGrid.map((cell, i) => {
          if (!cell.date) {
            return (
              <div
                key={`empty-${i}`}
                className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50"
              />
            );
          }

          const dayData = days[cell.date];
          const count = dayData?.count || 0;
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const isWeekend = i % 7 === 0 || i % 7 === 6;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date!)}
              className={cn(
                "min-h-[100px] border-b border-r border-slate-100 p-1.5 text-left transition-colors hover:bg-orange-50/50",
                isSelected && "bg-orange-50 ring-2 ring-inset ring-orange-400",
                isWeekend && !isSelected && "bg-slate-50/30"
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday
                      ? "bg-orange-500 text-white"
                      : "text-slate-700"
                  )}
                >
                  {cell.day}
                </span>
                {count > 0 && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {count}
                  </span>
                )}
              </div>

              {/* Booking indicators */}
              {dayData && dayData.bookings.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayData.bookings.slice(0, 3).map((booking, bi) => (
                    <div
                      key={bi}
                      className={cn(
                        "flex items-center gap-1 rounded px-1 py-0.5",
                        booking.type === "class"
                          ? "bg-blue-50"
                          : booking.type === "event"
                          ? "bg-purple-50"
                          : "bg-green-50"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          typeColors[booking.type] || "bg-slate-400"
                        )}
                      />
                      <span className="truncate text-[10px] leading-tight text-slate-600">
                        {booking.title}
                      </span>
                    </div>
                  ))}
                  {dayData.bookings.length > 3 && (
                    <div className="px-1 text-[10px] font-medium text-slate-400">
                      +{dayData.bookings.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
