import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSemesters, writeSemesters, getBookings, writeBookings } from "@/lib/data";
import { getSessionUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-logger";
import { Semester } from "@/lib/types";

function computeStatus(startDate: string, endDate: string): Semester["status"] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  if (today < start) return "upcoming";
  if (today > end) return "ended";
  return "active";
}

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const semesters = getSemesters();

    // Sort by startDate descending
    semesters.sort((a, b) => {
      if (a.startDate > b.startDate) return -1;
      if (a.startDate < b.startDate) return 1;
      return 0;
    });

    return NextResponse.json(semesters);
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
        { error: "Forbidden: Super admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Required fields: name, startDate, endDate" },
        { status: 400 }
      );
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate endDate is after startDate
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 }
      );
    }

    const status = computeStatus(startDate, endDate);

    const newSemester: Semester = {
      id: `sem_${crypto.randomUUID().slice(0, 8)}`,
      name,
      startDate,
      endDate,
      status,
    };

    const semesters = getSemesters();
    semesters.push(newSemester);
    await writeSemesters(semesters);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "create",
      entity: "semester",
      entityId: newSemester.id,
      description: `Created semester "${name}"`,
      details: { startDate, endDate, status },
    });

    return NextResponse.json(newSemester, { status: 201 });
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
        { error: "Forbidden: Super admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, startDate, endDate, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Semester id is required" },
        { status: 400 }
      );
    }

    const semesters = getSemesters();
    const index = semesters.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Semester not found" },
        { status: 404 }
      );
    }

    // Validate date formats if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (startDate && !dateRegex.test(startDate)) {
      return NextResponse.json(
        { error: "Invalid startDate format. Must be YYYY-MM-DD" },
        { status: 400 }
      );
    }
    if (endDate && !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid endDate format. Must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate endDate is after startDate
    const finalStartDate = startDate ?? semesters[index].startDate;
    const finalEndDate = endDate ?? semesters[index].endDate;
    if (finalEndDate <= finalStartDate) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !["active", "upcoming", "ended"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: active, upcoming, ended" },
        { status: 400 }
      );
    }

    semesters[index] = {
      ...semesters[index],
      ...(name !== undefined && { name }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(status !== undefined && { status }),
    };

    await writeSemesters(semesters);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "update",
      entity: "semester",
      entityId: id,
      description: `Updated semester "${semesters[index].name}"`,
      details: { name, startDate, endDate, status },
    });

    return NextResponse.json(semesters[index]);
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
        { error: "Forbidden: Super admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearBookings = searchParams.get("clearBookings");

    if (!id) {
      return NextResponse.json(
        { error: "Semester id is required as query parameter" },
        { status: 400 }
      );
    }

    const semesters = getSemesters();
    const index = semesters.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Semester not found" },
        { status: 404 }
      );
    }

    const deleted = semesters.splice(index, 1)[0];
    await writeSemesters(semesters);

    // Optionally clear associated bookings
    let clearedCount = 0;
    if (clearBookings === "true") {
      const bookings = getBookings();
      const remaining = bookings.filter((b) => b.semesterId !== id);
      clearedCount = bookings.length - remaining.length;
      await writeBookings(remaining);
    }

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "delete",
      entity: "semester",
      entityId: id,
      description: `Deleted semester "${deleted.name}"${clearedCount > 0 ? ` and cleared ${clearedCount} bookings` : ""}`,
      details: { clearedBookings: clearedCount },
    });

    return NextResponse.json({ ...deleted, clearedBookings: clearedCount });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
