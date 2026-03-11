import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBuildings, writeBuildings } from "@/lib/data";
import { Building } from "@/lib/types";
import { getSessionUser } from "@/lib/api-helpers";
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

    const buildings = getBuildings();
    return NextResponse.json(buildings);
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
    const { name, code, department, color } = body;

    if (!name || !code || !department || !color) {
      return NextResponse.json(
        { error: "All fields are required: name, code, department, color" },
        { status: 400 }
      );
    }

    const buildings = getBuildings();

    const newBuilding: Building = {
      id: `b_${crypto.randomUUID().slice(0, 8)}`,
      name,
      code,
      department,
      color,
    };

    buildings.push(newBuilding);
    writeBuildings(buildings);

    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "create",
      entity: "building",
      entityId: newBuilding.id,
      description: `Created building "${name}" (${code})`,
    });

    return NextResponse.json(newBuilding, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
