import { Booking } from "./types";

function getDayName(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

export function bookingOccursOnDate(booking: Booking, date: string): boolean {
  if (!booking.recurrence) {
    return booking.date === date;
  }

  const checkDate = new Date(date + "T00:00:00");
  const startDate = new Date(booking.date + "T00:00:00");
  const untilDate = new Date(booking.recurrence.until + "T00:00:00");

  if (checkDate < startDate || checkDate > untilDate) return false;

  if (booking.recurrence.type === "daily") return true;

  if (booking.recurrence.type === "weekly") {
    const dayName = getDayName(checkDate);
    return (booking.recurrence.days || []).includes(dayName);
  }

  return false;
}
