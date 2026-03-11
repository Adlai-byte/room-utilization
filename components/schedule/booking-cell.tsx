"use client";

import { Booking } from "@/lib/types";
import { cn } from "@/lib/utils";

const typeStyles: Record<
  Booking["type"],
  { bg: string; border: string; text: string }
> = {
  class: {
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-800",
  },
  event: {
    bg: "bg-purple-100",
    border: "border-purple-300",
    text: "text-purple-800",
  },
  recurring: {
    bg: "bg-green-100",
    border: "border-green-300",
    text: "text-green-800",
  },
};

interface BookingCellProps {
  booking: Booking;
  colSpan: number;
  onClick: () => void;
}

export function BookingCell({ booking, colSpan, onClick }: BookingCellProps) {
  const styles = typeStyles[booking.type] || typeStyles.class;

  return (
    <td
      colSpan={colSpan}
      className="p-0.5"
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-full w-full flex-col items-start justify-center rounded-md border px-2 py-1.5 text-left transition-colors hover:opacity-80",
          styles.bg,
          styles.border,
          styles.text
        )}
      >
        <span className="w-full truncate text-xs font-semibold leading-tight">
          {booking.title}
        </span>
        <span className="w-full truncate text-[10px] leading-tight opacity-75">
          {booking.instructor}
        </span>
      </button>
    </td>
  );
}
