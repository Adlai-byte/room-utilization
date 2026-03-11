import fs from "fs";
import path from "path";
import crypto from "crypto";
import { User, Building, Room, Booking, ActivityLogEntry, Semester, Notification } from "./types";

const dataDir = path.join(process.cwd(), "data");

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
  const filePath = path.join(dataDir, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

async function writeJSONLocked<T>(filename: string, data: T[]): Promise<void> {
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

// --- Session store (in-memory, suitable for demo only) ---

const sessions = new Map<string, string>(); // token -> userId

export function createSession(userId: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, userId);
  return token;
}

export function getSessionUserId(token: string): string | null {
  return sessions.get(token) ?? null;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}
