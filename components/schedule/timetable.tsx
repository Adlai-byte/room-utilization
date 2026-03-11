"use client";

import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { Room, Booking } from "@/lib/types";
import { BookingCell } from "./booking-cell";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const FIRST_HOUR = TIME_SLOTS[0];
const LAST_HOUR = TIME_SLOTS[TIME_SLOTS.length - 1] + 1; // 17

function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

function parseTimeToHour(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours + (minutes || 0) / 60;
}

function getCurrentTimePosition(): number | null {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  if (currentHour < FIRST_HOUR || currentHour > LAST_HOUR) return null;
  return ((currentHour - FIRST_HOUR) / (LAST_HOUR - FIRST_HOUR)) * 100;
}

interface TimetableProps {
  rooms: Room[];
  bookings: Booking[];
  buildingColor: string;
  selectedDate?: Date;
  onCellClick?: (roomId: string, hour: number) => void;
  onBookingClick?: (booking: Booking) => void;
  onRoomClick?: (room: Room) => void;
}

export function Timetable({
  rooms,
  bookings,
  buildingColor,
  selectedDate,
  onCellClick,
  onBookingClick,
  onRoomClick,
}: TimetableProps) {
  const [timePosition, setTimePosition] = useState<number | null>(null);

  // Check if selected date is today
  const isToday = useMemo(() => {
    if (!selectedDate) return true;
    return format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  }, [selectedDate]);

  // Update current time indicator every minute
  useEffect(() => {
    if (!isToday) {
      setTimePosition(null);
      return;
    }
    setTimePosition(getCurrentTimePosition());
    const interval = setInterval(() => {
      setTimePosition(getCurrentTimePosition());
    }, 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const activeRooms = useMemo(
    () => rooms.filter((r) => r.status === "active"),
    [rooms]
  );

  const bookingsByRoom = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const booking of bookings) {
      if (!map[booking.roomId]) {
        map[booking.roomId] = [];
      }
      map[booking.roomId].push(booking);
    }
    return map;
  }, [bookings]);

  const renderRow = (room: Room) => {
    const roomBookings = bookingsByRoom[room.id] || [];
    const cells: React.ReactNode[] = [];
    const coveredHours = new Set<number>();

    for (const hour of TIME_SLOTS) {
      if (coveredHours.has(hour)) continue;

      const booking = roomBookings.find((b) => {
        const start = parseTimeToHour(b.startTime);
        const end = parseTimeToHour(b.endTime);
        return start <= hour && end > hour;
      });

      if (booking) {
        const startHour = parseTimeToHour(booking.startTime);
        const endHour = parseTimeToHour(booking.endTime);

        if (startHour === hour) {
          const clampedStart = Math.max(startHour, FIRST_HOUR);
          const clampedEnd = Math.min(endHour, LAST_HOUR);
          const span = clampedEnd - clampedStart;

          for (let h = clampedStart; h < clampedEnd; h++) {
            coveredHours.add(h);
          }

          cells.push(
            <BookingCell
              key={`${room.id}-${hour}`}
              booking={booking}
              colSpan={span}
              onClick={() => onBookingClick?.(booking)}
            />
          );
        } else if (startHour < hour && hour === FIRST_HOUR) {
          const clampedEnd = Math.min(endHour, LAST_HOUR);
          const span = clampedEnd - hour;

          for (let h = hour; h < clampedEnd; h++) {
            coveredHours.add(h);
          }

          cells.push(
            <BookingCell
              key={`${room.id}-${hour}`}
              booking={booking}
              colSpan={span}
              onClick={() => onBookingClick?.(booking)}
            />
          );
        }
      } else {
        cells.push(
          <td
            key={`${room.id}-${hour}`}
            className={cn(
              "border border-slate-100 p-0.5 transition-colors",
              onCellClick && "cursor-pointer hover:bg-orange-50/50"
            )}
            onClick={() => onCellClick?.(room.id, hour)}
          >
            <div className="h-full min-h-[48px]" />
          </td>
        );
      }
    }

    return (
      <tr key={room.id} className="border-b border-slate-100">
        <td
          className={cn(
            "sticky left-0 z-10 min-w-[120px] border-r border-slate-200 bg-white px-3 py-2",
            onRoomClick && "cursor-pointer hover:bg-orange-50/50 transition-colors"
          )}
          onClick={() => onRoomClick?.(room)}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: buildingColor }}
            />
            <span className={cn(
              "text-sm font-medium",
              onRoomClick ? "text-orange-700 hover:underline" : "text-slate-700"
            )}>
              {room.name}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Cap: {room.capacity}
          </span>
        </td>
        {cells}
      </tr>
    );
  };

  if (activeRooms.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <p className="text-sm text-slate-500">
          No active rooms found for this building.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative">
        <table className="w-full min-w-[900px] table-fixed border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 min-w-[120px] border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Room
              </th>
              {TIME_SLOTS.map((hour) => (
                <th
                  key={hour}
                  className={cn(
                    "px-2 py-2.5 text-center text-xs font-semibold text-slate-500",
                    hour === 12 && "border-l-2 border-l-slate-300"
                  )}
                >
                  {formatHour(hour)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{activeRooms.map(renderRow)}</tbody>
        </table>

        {/* Current time indicator */}
        {timePosition !== null && (
          <div
            className="pointer-events-none absolute top-0 z-20 h-full"
            style={{
              left: `calc(120px + (100% - 120px) * ${timePosition / 100})`,
            }}
          >
            <div className="relative h-full">
              <div className="absolute -left-1.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 shadow-sm" />
              <div className="absolute left-0 top-0 h-full w-[2px] bg-red-500/70" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
