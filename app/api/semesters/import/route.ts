import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBookings, writeBookings, getRooms } from "@/lib/data";
import { getSessionUser, parseTime, formatLocalDate, getDayName } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-logger";
import { parseCSV } from "@/lib/csv-parser";
import { hasConflict } from "@/lib/conflict-utils";
import { Booking } from "@/lib/types";

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

    let csvString: string;
    let semesterId: string;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      semesterId = formData.get("semesterId") as string;

      if (!file) {
        return NextResponse.json(
          { error: "CSV file is required" },
          { status: 400 }
        );
      }

      if (!semesterId) {
        return NextResponse.json(
          { error: "semesterId is required" },
          { status: 400 }
        );
      }

      csvString = await file.text();
    } else {
      const body = await request.json();
      csvString = body.csv;
      semesterId = body.semesterId;

      if (!csvString || !semesterId) {
        return NextResponse.json(
          { error: "Both csv and semesterId are required" },
          { status: 400 }
        );
      }
    }

    const rows = parseCSV(csvString);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or has no data rows" },
        { status: 400 }
      );
    }

    const rooms = getRooms();
    const roomIds = new Set(rooms.map((r) => r.id));
    const bookings = getBookings();

    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;
    let skipped = 0;

    const timeRegex = /^\d{2}:\d{2}$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is headers, data starts at 2

      const title = row.title?.trim();
      const roomId = row.roomId?.trim();
      const instructor = row.instructor?.trim();
      const type = row.type?.trim() as Booking["type"];
      const date = row.date?.trim();
      const startTime = row.startTime?.trim();
      const endTime = row.endTime?.trim();
      const daysStr = row.days?.trim();
      const until = row.until?.trim();

      // Validate required fields
      if (!title) {
        errors.push({ row: rowNum, reason: "Missing title" });
        skipped++;
        continue;
      }
      if (!roomId) {
        errors.push({ row: rowNum, reason: "Missing roomId" });
        skipped++;
        continue;
      }
      if (!instructor) {
        errors.push({ row: rowNum, reason: "Missing instructor" });
        skipped++;
        continue;
      }
      if (!type || !["class", "event", "recurring"].includes(type)) {
        errors.push({ row: rowNum, reason: `Invalid type "${type || ""}"` });
        skipped++;
        continue;
      }
      if (!date || !dateRegex.test(date)) {
        errors.push({ row: rowNum, reason: "Invalid or missing date (must be YYYY-MM-DD)" });
        skipped++;
        continue;
      }
      if (!startTime || !timeRegex.test(startTime)) {
        errors.push({ row: rowNum, reason: "Invalid or missing startTime (must be HH:mm)" });
        skipped++;
        continue;
      }
      if (!endTime || !timeRegex.test(endTime)) {
        errors.push({ row: rowNum, reason: "Invalid or missing endTime (must be HH:mm)" });
        skipped++;
        continue;
      }

      // Validate endTime > startTime
      if (parseTime(endTime) <= parseTime(startTime)) {
        errors.push({ row: rowNum, reason: "endTime must be after startTime" });
        skipped++;
        continue;
      }

      // Validate room exists
      if (!roomIds.has(roomId)) {
        errors.push({ row: rowNum, reason: `Room "${roomId}" not found` });
        skipped++;
        continue;
      }

      // Build recurrence if days and until are provided
      let recurrence: Booking["recurrence"] | undefined;
      if (daysStr && until) {
        if (!dateRegex.test(until)) {
          errors.push({ row: rowNum, reason: "Invalid until date format (must be YYYY-MM-DD)" });
          skipped++;
          continue;
        }

        const days = daysStr.split(",").map((d) => d.trim());
        const validDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const invalidDays = days.filter((d) => !validDays.includes(d));
        if (invalidDays.length > 0) {
          errors.push({ row: rowNum, reason: `Invalid days: ${invalidDays.join(", ")}. Valid: ${validDays.join(", ")}` });
          skipped++;
          continue;
        }

        recurrence = {
          type: "weekly",
          days,
          until,
        };
      }

      // Check for conflicts against existing bookings + already imported in this batch
      const conflictResult = hasConflict(
        { roomId, date, startTime, endTime, recurrence },
        bookings
      );

      if (conflictResult.conflict) {
        errors.push({
          row: rowNum,
          reason: `Conflict with existing booking "${conflictResult.conflictWith?.title || "unknown"}" on ${conflictResult.conflictDate || date}`,
        });
        skipped++;
        continue;
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
        semesterId,
        ...(recurrence && { recurrence }),
      };

      bookings.push(newBooking);
      imported++;
    }

    await writeBookings(bookings);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "import",
      entity: "booking",
      entityId: semesterId,
      description: `Imported ${imported} bookings for semester (${skipped} skipped)`,
      details: { imported, skipped, errorCount: errors.length },
    });

    return NextResponse.json({
      imported,
      skipped,
      errors,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
