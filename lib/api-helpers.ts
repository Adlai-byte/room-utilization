import { cookies } from "next/headers";
import { getUsers, getSessionUserId } from "./data";
import { Booking, User } from "./types";

/**
 * Reads the session cookie, resolves the user ID via the session store,
 * and returns the matching user (without the password field).
 * Returns null if no valid session exists.
 */
export async function getSessionUser(): Promise<Omit<User, "password"> | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) return null;

  const userId = getSessionUserId(session.value);
  if (!userId) return null;

  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function getDayName(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours + minutes / 60;
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
