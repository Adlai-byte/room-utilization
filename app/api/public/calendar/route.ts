import { NextRequest, NextResponse } from "next/server";
import { getBuildings, getRooms, getBookings } from "@/lib/data";
import { bookingOccursOnDate, formatLocalDate } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get("buildingId");
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || ""); // 0-indexed

    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      return NextResponse.json(
        { error: "Valid year and month (0-11) are required" },
        { status: 400 }
      );
    }

    const buildings = getBuildings();
    let rooms = getRooms();
    const allBookings = getBookings();

    if (buildingId) {
      rooms = rooms.filter((r) => r.buildingId === buildingId);
    }

    const roomIds = new Set(rooms.map((r) => r.id));
    const bookings = allBookings.filter((b) => roomIds.has(b.roomId));

    // Build a map of date -> booking details for the entire month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Record<
      string,
      { count: number; bookings: Array<{ title: string; type: string; startTime: string; endTime: string; instructor: string; roomId: string }> }
    > = {};

    const current = new Date(firstDay);
    while (current <= lastDay) {
      const dateStr = formatLocalDate(current);
      const dayBookings = bookings.filter((b) => bookingOccursOnDate(b, dateStr));

      days[dateStr] = {
        count: dayBookings.length,
        bookings: dayBookings.map((b) => ({
          title: b.title,
          type: b.type,
          startTime: b.startTime,
          endTime: b.endTime,
          instructor: b.instructor,
          roomId: b.roomId,
        })),
      };

      current.setDate(current.getDate() + 1);
    }

    // Include room names for display
    const roomMap: Record<string, string> = {};
    for (const room of rooms) {
      roomMap[room.id] = room.name;
    }

    return NextResponse.json({
      buildings,
      rooms: roomMap,
      days,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
