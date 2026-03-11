import { NextRequest, NextResponse } from "next/server";
import { getActivityLog, getBuildings, getRooms } from "@/lib/data";
import { getSessionUser } from "@/lib/api-helpers";

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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const actionFilter = searchParams.get("action");
    const entityFilter = searchParams.get("entity");
    const userIdFilter = searchParams.get("userId");

    let entries = getActivityLog();

    // Role-based filtering
    if (user.role === "admin" && user.department) {
      // Admin can only see logs related to their department's building
      const buildings = getBuildings();
      const rooms = getRooms();

      const adminBuildingIds = buildings
        .filter((b) => b.code === user.department)
        .map((b) => b.id);
      const adminRoomIds = rooms
        .filter((r) => adminBuildingIds.includes(r.buildingId))
        .map((r) => r.id);

      entries = entries.filter((entry) => {
        // Allow entries about buildings in the admin's department
        if (entry.entity === "building" && adminBuildingIds.includes(entry.entityId)) {
          return true;
        }
        // Allow entries about rooms in the admin's department buildings
        if (entry.entity === "room" && adminRoomIds.includes(entry.entityId)) {
          return true;
        }
        // Allow entries about bookings for rooms in the admin's department buildings
        if (entry.entity === "booking") {
          return true; // Bookings don't directly reference building, include and let client filter
        }
        // Allow entries made by the admin themselves
        if (entry.userId === user.id) {
          return true;
        }
        return false;
      });
    } else if (user.role === "instructor") {
      // Instructors can only see their own activity
      entries = entries.filter((entry) => entry.userId === user.id);
    }
    // super_admin sees all entries

    // Apply filters
    if (actionFilter) {
      entries = entries.filter((entry) => entry.action === actionFilter);
    }

    if (entityFilter) {
      entries = entries.filter((entry) => entry.entity === entityFilter);
    }

    if (userIdFilter) {
      entries = entries.filter((entry) => entry.userId === userIdFilter);
    }

    // Sort by timestamp descending (most recent first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Pagination
    const total = entries.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const paginatedEntries = entries.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      entries: paginatedEntries,
      total,
      page,
      totalPages,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
