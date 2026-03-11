import { NextRequest, NextResponse } from "next/server";
import { getNotifications, writeNotifications } from "@/lib/data";
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
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    let notifications = getNotifications().filter(
      (n) => n.userId === user.id
    );

    if (unreadOnly) {
      notifications = notifications.filter((n) => !n.read);
    }

    // Sort by createdAt descending (newest first)
    notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(notifications);
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
    const { id, markAllRead } = body;

    const notifications = getNotifications();

    if (markAllRead) {
      let count = 0;
      for (const n of notifications) {
        if (n.userId === user.id && !n.read) {
          n.read = true;
          count++;
        }
      }
      await writeNotifications(notifications);
      return NextResponse.json({ success: true, markedRead: count });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Either id or markAllRead is required" },
        { status: 400 }
      );
    }

    const index = notifications.findIndex(
      (n) => n.id === id && n.userId === user.id
    );

    if (index === -1) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    notifications[index].read = true;
    await writeNotifications(notifications);

    return NextResponse.json(notifications[index]);
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
        { error: "Notification id is required as query parameter" },
        { status: 400 }
      );
    }

    const notifications = getNotifications();
    const index = notifications.findIndex(
      (n) => n.id === id && n.userId === user.id
    );

    if (index === -1) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const deleted = notifications.splice(index, 1)[0];
    await writeNotifications(notifications);

    return NextResponse.json(deleted);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
