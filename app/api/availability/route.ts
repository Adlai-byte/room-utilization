import { NextRequest, NextResponse } from "next/server";
import { getBuildings, getRooms, getBookings } from "@/lib/data";
import { getSessionUser, parseTime, bookingOccursOnDate } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const buildingId = searchParams.get("buildingId");
    const capacity = searchParams.get("capacity");
    const amenitiesParam = searchParams.get("amenities");

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Required query params: date, startTime, endTime" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Expected HH:mm" },
        { status: 400 }
      );
    }

    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);

    if (newStart >= newEnd) {
      return NextResponse.json(
        { error: "startTime must be before endTime" },
        { status: 400 }
      );
    }

    const buildings = getBuildings();
    let rooms = getRooms();
    const bookings = getBookings();

    // Admin users: filter to their department's buildings
    if (user.role === "admin" && user.department) {
      const deptBuildingIds = new Set(
        buildings
          .filter((b) => b.code === user.department)
          .map((b) => b.id)
      );
      rooms = rooms.filter((r) => deptBuildingIds.has(r.buildingId));
    }

    // Only active rooms
    rooms = rooms.filter((r) => r.status === "active");

    // Filter by building if specified
    if (buildingId) {
      rooms = rooms.filter((r) => r.buildingId === buildingId);
    }

    // Filter by minimum capacity
    if (capacity) {
      const minCapacity = parseInt(capacity, 10);
      if (!isNaN(minCapacity) && minCapacity > 0) {
        rooms = rooms.filter((r) => r.capacity >= minCapacity);
      }
    }

    // Filter by amenities
    if (amenitiesParam) {
      const requiredAmenities = amenitiesParam.split(",").filter(Boolean);
      if (requiredAmenities.length > 0) {
        rooms = rooms.filter((r) =>
          requiredAmenities.every((a) => r.amenities.includes(a))
        );
      }
    }

    // Check each room for conflicts on the given date/time
    const availableRooms = rooms.filter((room) => {
      // Get all bookings for this room
      const roomBookings = bookings.filter((b) => b.roomId === room.id);

      // Check if any booking conflicts
      for (const booking of roomBookings) {
        // Skip rejected/pending bookings
        if (booking.status === "rejected" || booking.status === "pending") continue;

        // Check if the booking occurs on the requested date
        if (!bookingOccursOnDate(booking, date)) continue;

        // Check for time overlap
        const existingStart = parseTime(booking.startTime);
        const existingEnd = parseTime(booking.endTime);

        if (newStart < existingEnd && existingStart < newEnd) {
          return false; // Conflict found
        }
      }

      return true; // No conflicts
    });

    // Build response with building info
    const result = availableRooms.map((room) => {
      const building = buildings.find((b) => b.id === room.buildingId);
      return {
        id: room.id,
        name: room.name,
        buildingId: room.buildingId,
        buildingName: building?.name ?? "Unknown",
        capacity: room.capacity,
        amenities: room.amenities,
        status: room.status,
      };
    });

    return NextResponse.json({ rooms: result });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
