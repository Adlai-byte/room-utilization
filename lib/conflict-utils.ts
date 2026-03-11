import { Booking, Room, Building } from "./types";
import { getDayName, formatLocalDate, parseTime } from "./api-helpers";

export function getOccurrenceDates(booking: Booking): string[] {
  const dates: string[] = [];

  if (!booking.recurrence) {
    dates.push(booking.date);
    return dates;
  }

  const startDate = new Date(booking.date + "T00:00:00");
  const untilDate = new Date(booking.recurrence.until + "T00:00:00");

  if (booking.recurrence.type === "daily") {
    const current = new Date(startDate);
    while (current <= untilDate) {
      dates.push(formatLocalDate(current));
      current.setDate(current.getDate() + 1);
    }
  } else if (booking.recurrence.type === "weekly") {
    const days = booking.recurrence.days || [];
    const current = new Date(startDate);
    while (current <= untilDate) {
      const dayName = getDayName(current);
      if (days.includes(dayName)) {
        dates.push(formatLocalDate(current));
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}

export function hasConflict(
  newBooking: {
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
    recurrence?: Booking["recurrence"];
  },
  existingBookings: Booking[],
  excludeId?: string
): { conflict: boolean; conflictDate?: string; conflictWith?: Booking } {
  const newStart = parseTime(newBooking.startTime);
  const newEnd = parseTime(newBooking.endTime);

  // Get all dates for the new booking
  const newDates = getOccurrenceDates({
    ...newBooking,
    id: "",
    userId: "",
    title: "",
    type: "event",
    instructor: "",
  } as Booking);

  for (const existing of existingBookings) {
    if (excludeId && existing.id === excludeId) continue;
    if (existing.roomId !== newBooking.roomId) continue;
    // Only consider confirmed or undefined-status bookings
    if (existing.status === "rejected" || existing.status === "pending") continue;

    const existingStart = parseTime(existing.startTime);
    const existingEnd = parseTime(existing.endTime);

    // Check if times overlap
    if (!(newStart < existingEnd && existingStart < newEnd)) continue;

    // Get all dates for the existing booking
    const existingDates = getOccurrenceDates(existing);

    // Check if any dates overlap
    for (const newDate of newDates) {
      if (existingDates.includes(newDate)) {
        return { conflict: true, conflictDate: newDate, conflictWith: existing };
      }
    }
  }

  return { conflict: false };
}

export function suggestAlternativeRooms(params: {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  recurrence?: Booking["recurrence"];
  rooms: Room[];
  bookings: Booking[];
  buildings: Building[];
}): Array<{ roomId: string; roomName: string; buildingName: string; capacity: number }> {
  const { roomId, date, startTime, endTime, recurrence, rooms, bookings, buildings } = params;

  // Find the original room to get its capacity for sorting
  const originalRoom = rooms.find((r) => r.id === roomId);
  const targetCapacity = originalRoom?.capacity ?? 0;
  const originalBuilding = originalRoom
    ? buildings.find((b) => b.id === originalRoom.buildingId)
    : null;

  const candidates: Array<{
    roomId: string;
    roomName: string;
    buildingName: string;
    capacity: number;
    sameBuilding: boolean;
    capacityDiff: number;
  }> = [];

  for (const room of rooms) {
    if (room.id === roomId) continue;
    if (room.status !== "active") continue;

    const conflictResult = hasConflict(
      { roomId: room.id, date, startTime, endTime, recurrence },
      bookings
    );

    if (!conflictResult.conflict) {
      const building = buildings.find((b) => b.id === room.buildingId);
      candidates.push({
        roomId: room.id,
        roomName: room.name,
        buildingName: building?.name ?? "Unknown",
        capacity: room.capacity,
        sameBuilding: originalBuilding ? room.buildingId === originalRoom!.buildingId : false,
        capacityDiff: Math.abs(room.capacity - targetCapacity),
      });
    }
  }

  // Sort: same building first, then by closest capacity match
  candidates.sort((a, b) => {
    if (a.sameBuilding !== b.sameBuilding) return a.sameBuilding ? -1 : 1;
    return a.capacityDiff - b.capacityDiff;
  });

  return candidates.slice(0, 5).map(({ roomId, roomName, buildingName, capacity }) => ({
    roomId,
    roomName,
    buildingName,
    capacity,
  }));
}

export function suggestAlternativeTimeSlots(params: {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  bookings: Booking[];
}): Array<{ startTime: string; endTime: string }> {
  const { roomId, date, startTime, endTime, bookings } = params;

  const requestedDuration = parseTime(endTime) - parseTime(startTime);
  if (requestedDuration <= 0) return [];

  // Get all confirmed/undefined-status bookings for this room on this date
  const roomBookings = bookings
    .filter((b) => {
      if (b.roomId !== roomId) return false;
      if (b.status === "rejected" || b.status === "pending") return false;

      // Check if booking occurs on this date
      const dates = getOccurrenceDates(b);
      return dates.includes(date);
    })
    .map((b) => ({
      start: parseTime(b.startTime),
      end: parseTime(b.endTime),
    }))
    .sort((a, b) => a.start - b.start);

  // Find free slots within 07:00-17:00
  const dayStart = 7;
  const dayEnd = 17;
  const freeSlots: Array<{ start: number; end: number }> = [];

  let cursor = dayStart;
  for (const booking of roomBookings) {
    if (cursor < booking.start) {
      freeSlots.push({ start: cursor, end: booking.start });
    }
    cursor = Math.max(cursor, booking.end);
  }
  if (cursor < dayEnd) {
    freeSlots.push({ start: cursor, end: dayEnd });
  }

  // Find slots that can fit the requested duration
  const suggestions: Array<{ startTime: string; endTime: string }> = [];
  const requestedStart = parseTime(startTime);

  for (const slot of freeSlots) {
    if (slot.end - slot.start < requestedDuration) continue;

    // Try to place as close to the requested time as possible
    let slotStart = Math.max(slot.start, Math.min(requestedStart, slot.end - requestedDuration));
    // Ensure it fits within the free slot
    if (slotStart < slot.start) slotStart = slot.start;
    if (slotStart + requestedDuration > slot.end) continue;

    const slotEnd = slotStart + requestedDuration;

    // Skip if this is the exact same slot as requested
    if (slotStart === parseTime(startTime) && slotEnd === parseTime(endTime)) continue;

    const formatHour = (h: number) => {
      const hours = Math.floor(h);
      const minutes = Math.round((h - hours) * 60);
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    };

    suggestions.push({
      startTime: formatHour(slotStart),
      endTime: formatHour(slotEnd),
    });
  }

  // Sort by proximity to requested start time
  suggestions.sort((a, b) => {
    const diffA = Math.abs(parseTime(a.startTime) - requestedStart);
    const diffB = Math.abs(parseTime(b.startTime) - requestedStart);
    return diffA - diffB;
  });

  return suggestions.slice(0, 3);
}
