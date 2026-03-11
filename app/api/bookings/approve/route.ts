import { NextRequest, NextResponse } from "next/server";
import { getBookings, writeBookings, getRooms, getBuildings } from "@/lib/data";
import { getSessionUser } from "@/lib/api-helpers";
import { createNotification } from "@/lib/notify";
import { logActivity } from "@/lib/activity-logger";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can view booking requests" },
        { status: 403 }
      );
    }

    const bookings = getBookings();
    const rooms = getRooms();
    const buildings = getBuildings();

    // Filter to pending bookings only
    let pendingBookings = bookings.filter((b) => b.status === "pending");

    // Admin: only bookings in their department's building rooms
    if (user.role === "admin" && user.department) {
      const adminBuildingIds = buildings
        .filter((b) => b.code === user.department)
        .map((b) => b.id);
      const adminRoomIds = rooms
        .filter((r) => adminBuildingIds.includes(r.buildingId))
        .map((r) => r.id);
      pendingBookings = pendingBookings.filter((b) =>
        adminRoomIds.includes(b.roomId)
      );
    }

    // Enrich bookings with room and building info
    const enriched = pendingBookings.map((booking) => {
      const room = rooms.find((r) => r.id === booking.roomId);
      const building = room
        ? buildings.find((b) => b.id === room.buildingId)
        : null;
      return {
        ...booking,
        roomName: room?.name || "Unknown",
        buildingName: building?.name || "Unknown",
      };
    });

    return NextResponse.json(enriched);
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

    if (user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can approve/reject bookings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { bookingId, action, rejectionNote } = body;

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: "bookingId and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const bookings = getBookings();
    const index = bookings.findIndex((b) => b.id === bookingId);

    if (index === -1) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookings[index];

    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Booking is not in pending status" },
        { status: 400 }
      );
    }

    // Admin: can only approve/reject bookings in their department's building
    if (user.role === "admin" && user.department) {
      const rooms = getRooms();
      const buildings = getBuildings();
      const bookingRoom = rooms.find((r) => r.id === booking.roomId);
      const building = bookingRoom
        ? buildings.find((b) => b.id === bookingRoom.buildingId)
        : null;
      if (!building || building.code !== user.department) {
        return NextResponse.json(
          {
            error:
              "Forbidden: You can only approve/reject bookings in your department's building",
          },
          { status: 403 }
        );
      }
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      bookings[index] = {
        ...booking,
        status: "confirmed",
        approvedBy: user.name,
        resolvedAt: now,
      };

      // Notify the requestor
      await createNotification({
        userId: booking.userId,
        type: "booking_approved",
        title: "Booking Approved",
        message: `Your booking "${booking.title}" has been approved by ${user.name}.`,
        link: "/bookings",
      });

      // Log activity
      await logActivity({
        userId: user.id,
        userName: user.name,
        action: "approve",
        entity: "booking",
        entityId: booking.id,
        description: `Approved booking "${booking.title}"`,
        details: { bookingTitle: booking.title, roomId: booking.roomId },
      });
    } else {
      bookings[index] = {
        ...booking,
        status: "rejected",
        rejectionNote: rejectionNote || undefined,
        approvedBy: user.name,
        resolvedAt: now,
      };

      // Notify the requestor
      await createNotification({
        userId: booking.userId,
        type: "booking_rejected",
        title: "Booking Rejected",
        message: `Your booking "${booking.title}" has been rejected by ${user.name}.${rejectionNote ? ` Reason: ${rejectionNote}` : ""}`,
        link: "/bookings",
      });

      // Log activity
      await logActivity({
        userId: user.id,
        userName: user.name,
        action: "reject",
        entity: "booking",
        entityId: booking.id,
        description: `Rejected booking "${booking.title}"${rejectionNote ? `: ${rejectionNote}` : ""}`,
        details: {
          bookingTitle: booking.title,
          roomId: booking.roomId,
          rejectionNote,
        },
      });
    }

    await writeBookings(bookings);

    return NextResponse.json(bookings[index]);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
