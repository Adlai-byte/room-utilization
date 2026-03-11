export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "instructor";
  department: string | null;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  department: string;
  color: string;
}

export interface Room {
  id: string;
  name: string;
  buildingId: string;
  capacity: number;
  amenities: string[];
  status: "active" | "inactive" | "maintenance";
  maintenance?: {
    scheduledStart: string;
    scheduledEnd: string;
    reason: string;
  };
}

export interface Recurrence {
  type: "daily" | "weekly";
  days?: string[];
  until: string;
}

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  type: "class" | "event" | "recurring";
  instructor: string;
  date: string;
  startTime: string;
  endTime: string;
  recurrence?: Recurrence;
  status?: "confirmed" | "pending" | "rejected";
  requestedBy?: string;
  approvedBy?: string;
  rejectionNote?: string;
  requestedAt?: string;
  resolvedAt?: string;
  semesterId?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "instructor";
  department: string | null;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: "create" | "update" | "delete" | "approve" | "reject" | "import" | "maintenance";
  entity: "booking" | "room" | "building" | "semester" | "user";
  entityId: string;
  description: string;
  details?: Record<string, unknown>;
}

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "upcoming" | "ended";
}

export interface Notification {
  id: string;
  userId: string;
  type: "booking_approved" | "booking_rejected" | "booking_cancelled" | "schedule_changed" | "maintenance_scheduled" | "semester_ended" | "general";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}
