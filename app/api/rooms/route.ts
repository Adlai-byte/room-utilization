import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRooms, writeRooms, getBuildings, getBookings, writeBookings } from "@/lib/data";
import { Room } from "@/lib/types";
import { getSessionUser } from "@/lib/api-helpers";
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

    let rooms = getRooms();

    if (buildingId) {
      rooms = rooms.filter((r) => r.buildingId === buildingId);
    }

    return NextResponse.json(rooms);
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

    if (user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: super_admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, buildingId, capacity, amenities, status } = body;

    if (!name || !buildingId || capacity === undefined || !status) {
      return NextResponse.json(
        { error: "Required fields: name, buildingId, capacity, status" },
        { status: 400 }
      );
    }

    // Validate capacity is a positive number
    if (typeof capacity !== "number" || capacity <= 0) {
      return NextResponse.json(
        { error: "Capacity must be a positive number" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["active", "inactive", "maintenance"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: active, inactive, maintenance" },
        { status: 400 }
      );
    }

    // Validate buildingId refers to an existing building
    const buildings = getBuildings();
    const buildingExists = buildings.find(b => b.id === buildingId);
    if (!buildingExists) {
      return NextResponse.json(
        { error: "Building not found" },
        { status: 404 }
      );
    }

    const rooms = getRooms();

    const newRoom: Room = {
      id: `r_${crypto.randomUUID().slice(0, 8)}`,
      name,
      buildingId,
      capacity,
      amenities: amenities || [],
      status,
    };

    rooms.push(newRoom);
    writeRooms(rooms);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "create",
      entity: "room",
      entityId: newRoom.id,
      description: `Created room "${name}" in building ${buildingExists.name}`,
    });

    return NextResponse.json(newRoom, { status: 201 });
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

    if (user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: super_admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, buildingId, capacity, amenities, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Room id is required" },
        { status: 400 }
      );
    }

    const rooms = getRooms();
    const index = rooms.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const body_maintenance = body.maintenance;

    rooms[index] = {
      ...rooms[index],
      ...(name !== undefined && { name }),
      ...(buildingId !== undefined && { buildingId }),
      ...(capacity !== undefined && { capacity }),
      ...(amenities !== undefined && { amenities }),
      ...(status !== undefined && { status }),
      ...(body_maintenance !== undefined && { maintenance: body_maintenance || undefined }),
    };

    // If maintenance is cleared (null), remove the key
    if (body_maintenance === null) {
      delete rooms[index].maintenance;
    }

    writeRooms(rooms);

    const action = body_maintenance ? "maintenance" : "update";
    await logActivity({
      userId: user.id,
      userName: user.name,
      action,
      entity: "room",
      entityId: id,
      description: body_maintenance
        ? `Scheduled maintenance for room "${rooms[index].name}"`
        : `Updated room "${rooms[index].name}"`,
    });

    return NextResponse.json(rooms[index]);
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

    if (user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: super_admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Room id is required as query parameter" },
        { status: 400 }
      );
    }

    const rooms = getRooms();
    const index = rooms.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const deleted = rooms.splice(index, 1)[0];
    writeRooms(rooms);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "delete",
      entity: "room",
      entityId: deleted.id,
      description: `Deleted room "${deleted.name}"`,
    });

    // Cascade delete: remove all bookings referencing the deleted room
    const bookings = getBookings();
    const filteredBookings = bookings.filter(b => b.roomId !== id);
    if (filteredBookings.length !== bookings.length) {
      writeBookings(filteredBookings);
    }

    return NextResponse.json(deleted);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
