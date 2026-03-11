import { NextRequest, NextResponse } from "next/server";
import { getBuildings, getRooms, getBookings } from "@/lib/data";
import { bookingOccursOnDate } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get("buildingId");
    const date = searchParams.get("date");

    const buildings = getBuildings();
    let rooms = getRooms();
    let bookings = getBookings();

    if (buildingId) {
      rooms = rooms.filter((r) => r.buildingId === buildingId);
    }

    const roomIds = new Set(rooms.map((r) => r.id));
    bookings = bookings.filter((b) => roomIds.has(b.roomId));

    if (date) {
      bookings = bookings.filter((b) => bookingOccursOnDate(b, date));
    }

    // Strip sensitive fields — only return what instructors need
    const safeBookings = bookings.map((b) => ({
      id: b.id,
      roomId: b.roomId,
      title: b.title,
      type: b.type,
      instructor: b.instructor,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
    }));

    return NextResponse.json({
      buildings,
      rooms,
      bookings: safeBookings,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
