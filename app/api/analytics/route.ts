import { NextRequest, NextResponse } from "next/server";
import {
  getBuildings,
  getRooms,
  getBookings,
} from "@/lib/data";
import { Booking, Room } from "@/lib/types";
import {
  getSessionUser,
  formatLocalDate,
  bookingOccursOnDate,
  parseTime,
} from "@/lib/api-helpers";

function getWeekDates(referenceDate: Date): string[] {
  const dates: string[] = [];
  const day = referenceDate.getDay();
  // Monday = 1, so offset to get to Monday
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - (day === 0 ? 6 : day - 1));

  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatLocalDate(d));
  }

  return dates;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const allBuildings = getBuildings();
    const allRooms = getRooms();
    const allBookings = getBookings();

    // Scope data by department for admin users
    let scopedRooms: Room[];
    let scopedBookings: Booking[];

    if (user.role === "admin" && user.department) {
      // Find buildings matching this admin's department code
      const deptBuildings = allBuildings.filter(
        (b) => b.code === user.department
      );
      const deptBuildingIds = deptBuildings.map((b) => b.id);
      scopedRooms = allRooms.filter((r) => deptBuildingIds.includes(r.buildingId));
      const scopedRoomIds = scopedRooms.map((r) => r.id);
      scopedBookings = allBookings.filter((b) =>
        scopedRoomIds.includes(b.roomId)
      );
    } else {
      // super_admin sees everything
      scopedRooms = allRooms;
      scopedBookings = allBookings;
    }

    // Basic room counts
    const totalRooms = scopedRooms.length;
    const activeRooms = scopedRooms.filter((r) => r.status === "active").length;

    // Current week dates (Mon-Fri)
    const now = new Date();
    const weekDates = getWeekDates(now);
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

    // Count bookings occurring in current week
    let totalBookings = 0;
    const bookingsPerDay: Record<string, number> = {};
    const peakHourCounts: Record<number, number> = {};
    const roomBookingCounts: Record<string, number> = {};
    const roomHoursUsed: Record<string, number> = {};

    // Initialize peak hours (7-17)
    for (let h = 7; h <= 17; h++) {
      peakHourCounts[h] = 0;
    }

    // Initialize per-day counts
    for (const date of weekDates) {
      bookingsPerDay[date] = 0;
    }

    for (const booking of scopedBookings) {
      for (const date of weekDates) {
        if (bookingOccursOnDate(booking, date)) {
          totalBookings++;
          bookingsPerDay[date] = (bookingsPerDay[date] || 0) + 1;

          // Count room bookings
          roomBookingCounts[booking.roomId] =
            (roomBookingCounts[booking.roomId] || 0) + 1;

          // Calculate hours
          const startH = parseTime(booking.startTime);
          const endH = parseTime(booking.endTime);
          const hours = endH - startH;
          roomHoursUsed[booking.roomId] =
            (roomHoursUsed[booking.roomId] || 0) + hours;

          // Peak hours counting: for each hour the booking spans
          for (let h = 7; h <= 17; h++) {
            if (h >= startH && h < endH) {
              peakHourCounts[h]++;
            }
          }
        }
      }
    }

    // Available hours per room per week: 10 hours/day (7-17) * 5 days = 50 hours
    const hoursPerDay = 10;
    const weekDays = 5;
    const totalAvailableHours = activeRooms * hoursPerDay * weekDays;
    const totalUsedHours = Object.values(roomHoursUsed).reduce(
      (sum, h) => sum + h,
      0
    );
    const averageUtilization =
      totalAvailableHours > 0
        ? Math.round((totalUsedHours / totalAvailableHours) * 100)
        : 0;

    // Peak hours array
    const peakHours = Object.entries(peakHourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
    }));

    // Room rankings
    const roomRankings = scopedRooms.map((room) => {
      const building = allBuildings.find((b) => b.id === room.buildingId);
      const bookingCount = roomBookingCounts[room.id] || 0;
      const hoursUsed = roomHoursUsed[room.id] || 0;
      const roomAvailableHours =
        room.status === "active" ? hoursPerDay * weekDays : 0;
      const utilizationPercent =
        roomAvailableHours > 0
          ? Math.round((hoursUsed / roomAvailableHours) * 100)
          : 0;

      return {
        roomId: room.id,
        roomName: room.name,
        buildingCode: building?.code || "",
        bookingCount,
        utilizationPercent,
      };
    });

    // Sort by utilization descending
    roomRankings.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    // Weekly utilization per day
    const weeklyUtilization = weekDates.map((date, i) => {
      let dayHoursUsed = 0;
      for (const booking of scopedBookings) {
        if (bookingOccursOnDate(booking, date)) {
          const startH = parseTime(booking.startTime);
          const endH = parseTime(booking.endTime);
          dayHoursUsed += endH - startH;
        }
      }
      const dayAvailable = activeRooms * hoursPerDay;
      const utilization =
        dayAvailable > 0
          ? Math.round((dayHoursUsed / dayAvailable) * 100)
          : 0;

      return {
        day: dayLabels[i],
        utilization,
      };
    });

    // Available now: rooms that are active and not booked at the current time
    const currentDate = formatLocalDate(now);
    const currentHour = now.getHours() + now.getMinutes() / 60;

    const busyRoomIds = new Set<string>();
    for (const booking of scopedBookings) {
      if (bookingOccursOnDate(booking, currentDate)) {
        const startH = parseTime(booking.startTime);
        const endH = parseTime(booking.endTime);
        if (currentHour >= startH && currentHour < endH) {
          busyRoomIds.add(booking.roomId);
        }
      }
    }

    const availableNow = scopedRooms.filter(
      (r) => r.status === "active" && !busyRoomIds.has(r.id)
    ).length;

    return NextResponse.json({
      totalRooms,
      activeRooms,
      totalBookings,
      averageUtilization,
      peakHours,
      roomRankings,
      weeklyUtilization,
      availableNow,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
