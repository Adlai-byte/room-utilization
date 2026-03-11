import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUsers, createSession, getSessionUserId, destroySession } from "@/lib/data";
import { SessionUser } from "@/lib/types";

// SECURITY NOTE: This is a demo application. Passwords are stored in plaintext
// and compared directly. In production, use bcrypt or argon2 for password hashing.

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const users = getUsers();
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    const token = createSession(user.id);

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ user: sessionUser });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session?.value) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = getSessionUserId(session.value);
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const users = getUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    return NextResponse.json({ user: sessionUser });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (session?.value) {
      destroySession(session.value);
    }

    cookieStore.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ message: "Logged out successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
