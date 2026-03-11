import fs from "fs";
import path from "path";
import crypto from "crypto";
import { User, Building, Room, Booking, ActivityLogEntry, Semester, Notification } from "./types";

const sourceDataDir = path.join(process.cwd(), "data");
const isVercel = !!process.env.VERCEL;
const dataDir = isVercel ? "/tmp/data" : sourceDataDir;

// On Vercel, copy bundled data files to writable /tmp on first access
function ensureWritableData() {
  if (!isVercel) return;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const files = [
    "users.json", "buildings.json", "rooms.json", "bookings.json",
    "activity-log.json", "notifications.json", "semesters.json",
  ];
  for (const file of files) {
    const dest = path.join(dataDir, file);
    if (!fs.existsSync(dest)) {
      const src = path.join(sourceDataDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      } else {
        fs.writeFileSync(dest, "[]", "utf-8");
      }
    }
  }
}

// Simple mutex for file operations
const locks = new Map<string, Promise<void>>();

async function withLock<T>(filename: string, fn: () => T): Promise<T> {
  while (locks.has(filename)) {
    await locks.get(filename);
  }
  let resolve: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  locks.set(filename, promise);
  try {
    return fn();
  } finally {
    locks.delete(filename);
    resolve!();
  }
}

function readJSON<T>(filename: string): T[] {
  ensureWritableData();
  const filePath = path.join(dataDir, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

async function writeJSONLocked<T>(filename: string, data: T[]): Promise<void> {
  ensureWritableData();
  await withLock(filename, () => {
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  });
}

export function getUsers(): User[] {
  return readJSON<User>("users.json");
}

export function getBuildings(): Building[] {
  return readJSON<Building>("buildings.json");
}

export async function writeBuildings(buildings: Building[]): Promise<void> {
  await writeJSONLocked("buildings.json", buildings);
}

export function getRooms(): Room[] {
  return readJSON<Room>("rooms.json");
}

export async function writeRooms(rooms: Room[]): Promise<void> {
  await writeJSONLocked("rooms.json", rooms);
}

export function getBookings(): Booking[] {
  return readJSON<Booking>("bookings.json");
}

export async function writeBookings(bookings: Booking[]): Promise<void> {
  await writeJSONLocked("bookings.json", bookings);
}

export function getActivityLog(): ActivityLogEntry[] {
  return readJSON<ActivityLogEntry>("activity-log.json");
}

export async function writeActivityLog(log: ActivityLogEntry[]): Promise<void> {
  await writeJSONLocked("activity-log.json", log);
}

export function getSemesters(): Semester[] {
  return readJSON<Semester>("semesters.json");
}

export async function writeSemesters(semesters: Semester[]): Promise<void> {
  await writeJSONLocked("semesters.json", semesters);
}

export function getNotifications(): Notification[] {
  return readJSON<Notification>("notifications.json");
}

export async function writeNotifications(notifications: Notification[]): Promise<void> {
  await writeJSONLocked("notifications.json", notifications);
}

// --- Session store (signed cookie approach — no server-side state) ---

const SESSION_SECRET = process.env.SESSION_SECRET || "room-util-demo-secret-key-2024";

function signValue(value: string): string {
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(value);
  return hmac.digest("hex");
}

export function createSession(userId: string): string {
  const signature = signValue(userId);
  return `${userId}.${signature}`;
}

export function getSessionUserId(token: string): string | null {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;
  const userId = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);
  const expected = signValue(userId);
  if (signature !== expected) return null;
  return userId;
}

export function destroySession(_token: string): void {
  // No server-side state to clean up — cookie deletion handled by caller
}
