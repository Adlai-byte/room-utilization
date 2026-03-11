import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRooms, getBuildings, getBookings, writeBookings } from "@/lib/data";
import { Booking } from "@/lib/types";
import {
  getSessionUser,
  parseTime,
  bookingOccursOnDate,
} from "@/lib/api-helpers";
import { hasConflict, suggestAlternativeRooms, suggestAlternativeTimeSlots } from "@/lib/conflict-utils";
import { logActivity } from "@/lib/activity-logger";

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
    const buildingId = searchParams.get("buildingId");
    const date = searchParams.get("date");
    const roomId = searchParams.get("roomId");

    let bookings = getBookings();

    if (buildingId) {
      const rooms = getRooms();
      const roomIds = rooms
        .filter((r) => r.buildingId === buildingId)
        .map((r) => r.id);
      bookings = bookings.filter((b) => roomIds.includes(b.roomId));
    }

    if (roomId) {
      bookings = bookings.filter((b) => b.roomId === roomId);
    }

    if (date) {
      bookings = bookings.filter((b) => bookingOccursOnDate(b, date));
    }

    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { roomId, title, type, instructor, date, startTime, endTime, recurrence } =
      body;

    if (!roomId || !title || !type || !instructor || !date || !startTime || !endTime) {
      return NextResponse.json(
        {
          error:
            "Required fields: roomId, title, type, instructor, date, startTime, endTime",
        },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["class", "event", "recurring"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be one of: class, event, recurring" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate date is not in the past and not more than 6 months ahead
    const bookingDate = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 6);

    if (bookingDate < today) {
      return NextResponse.json(
        { error: "Cannot create bookings in the past" },
        { status: 400 }
      );
    }
    if (bookingDate > maxDate) {
      return NextResponse.json(
        { error: "Bookings cannot be more than 6 months in advance" },
        { status: 400 }
      );
    }

    // Validate time formats (HH:mm)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Must be HH:mm" },
        { status: 400 }
      );
    }

    // Validate endTime is after startTime
    if (parseTime(endTime) <= parseTime(startTime)) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    // Validate instructor is a non-empty string
    if (typeof instructor !== "string" || instructor.trim().length === 0) {
      return NextResponse.json(
        { error: "Instructor must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate room exists and is active
    const rooms = getRooms();
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (room.status !== "active") {
      return NextResponse.json(
        { error: "Room is not available for booking" },
        { status: 400 }
      );
    }

    // Validate recurrence until date is within 6-month limit
    if (recurrence?.until) {
      const untilDate = new Date(recurrence.until + "T00:00:00");
      if (untilDate > maxDate) {
        return NextResponse.json(
          { error: "Recurrence end date cannot be more than 6 months in advance" },
          { status: 400 }
        );
      }
    }

    const bookings = getBookings();

    const conflictResult = hasConflict(
      { roomId, date, startTime, endTime, recurrence },
      bookings
    );

    if (conflictResult.conflict) {
      const rooms = getRooms();
      const buildings = getBuildings();

      const alternativeRooms = suggestAlternativeRooms({
        roomId, date, startTime, endTime, recurrence,
        rooms, bookings, buildings,
      });

      const alternativeSlots = suggestAlternativeTimeSlots({
        roomId, date, startTime, endTime, bookings,
      });

      return NextResponse.json(
        {
          error: "Booking conflict detected",
          conflicts: [{
            title: conflictResult.conflictWith?.title || "Unknown",
            date: conflictResult.conflictDate || "",
            startTime: conflictResult.conflictWith?.startTime || "",
            endTime: conflictResult.conflictWith?.endTime || "",
          }],
          suggestions: {
            alternativeRooms,
            alternativeSlots,
          },
        },
        { status: 409 }
      );
    }

    const newBooking: Booking = {
      id: `bk_${crypto.randomUUID().slice(0, 8)}`,
      roomId,
      userId: user.id,
      title,
      type,
      instructor,
      date,
      startTime,
      endTime,
      ...(recurrence && { recurrence }),
    };

    bookings.push(newBooking);
    writeBookings(bookings);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "create",
      entity: "booking",
      entityId: newBooking.id,
      description: `Created booking "${title}" on ${date} (${startTime}-${endTime})`,
    });

    return NextResponse.json(newBooking, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, roomId, title, type, instructor, date, startTime, endTime, recurrence } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Booking id is required" },
        { status: 400 }
      );
    }

    const bookings = getBookings();
    const index = bookings.findIndex((b) => b.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Authorization check: admin can only edit bookings in their department's building
    if (user.role === "admin") {
      const rooms = getRooms();
      const buildings = getBuildings();
      const bookingRoom = rooms.find(r => r.id === bookings[index].roomId);
      const building = bookingRoom ? buildings.find(b => b.id === bookingRoom.buildingId) : null;
      if (!building || building.code !== user.department) {
        return NextResponse.json(
          { error: "Forbidden: You can only edit bookings in your department's building" },
          { status: 403 }
        );
      }
    }

    // Build the updated booking to check conflicts
    const updatedFields = {
      roomId: roomId ?? bookings[index].roomId,
      date: date ?? bookings[index].date,
      startTime: startTime ?? bookings[index].startTime,
      endTime: endTime ?? bookings[index].endTime,
      recurrence: recurrence !== undefined ? recurrence : bookings[index].recurrence,
    };

    const conflictResult = hasConflict(updatedFields, bookings, id);

    if (conflictResult.conflict) {
      const allRooms = getRooms();
      const allBuildings = getBuildings();

      const alternativeRooms = suggestAlternativeRooms({
        roomId: updatedFields.roomId,
        date: updatedFields.date,
        startTime: updatedFields.startTime,
        endTime: updatedFields.endTime,
        recurrence: updatedFields.recurrence,
        rooms: allRooms,
        bookings,
        buildings: allBuildings,
      });

      const alternativeSlots = suggestAlternativeTimeSlots({
        roomId: updatedFields.roomId,
        date: updatedFields.date,
        startTime: updatedFields.startTime,
        endTime: updatedFields.endTime,
        bookings,
      });

      return NextResponse.json(
        {
          error: "Booking conflict detected",
          conflicts: [{
            title: conflictResult.conflictWith?.title || "Unknown",
            date: conflictResult.conflictDate || "",
            startTime: conflictResult.conflictWith?.startTime || "",
            endTime: conflictResult.conflictWith?.endTime || "",
          }],
          suggestions: {
            alternativeRooms,
            alternativeSlots,
          },
        },
        { status: 409 }
      );
    }

    bookings[index] = {
      ...bookings[index],
      ...(roomId !== undefined && { roomId }),
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(instructor !== undefined && { instructor }),
      ...(date !== undefined && { date }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(recurrence !== undefined && { recurrence }),
    };

    writeBookings(bookings);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "update",
      entity: "booking",
      entityId: id,
      description: `Updated booking "${bookings[index].title}"`,
    });

    return NextResponse.json(bookings[index]);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Booking id is required as query parameter" },
        { status: 400 }
      );
    }

    const bookings = getBookings();
    const index = bookings.findIndex((b) => b.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Authorization check: admin can only delete bookings in their department's building
    if (user.role === "admin") {
      const rooms = getRooms();
      const buildings = getBuildings();
      const bookingRoom = rooms.find(r => r.id === bookings[index].roomId);
      const building = bookingRoom ? buildings.find(b => b.id === bookingRoom.buildingId) : null;
      if (!building || building.code !== user.department) {
        return NextResponse.json(
          { error: "Forbidden: You can only delete bookings in your department's building" },
          { status: 403 }
        );
      }
    }

    const deleted = bookings.splice(index, 1)[0];
    writeBookings(bookings);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "delete",
      entity: "booking",
      entityId: deleted.id,
      description: `Deleted booking "${deleted.title}"`,
    });

    return NextResponse.json(deleted);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
