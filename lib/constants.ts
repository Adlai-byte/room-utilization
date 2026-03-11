export const AMENITY_OPTIONS = [
  "projector", "whiteboard", "aircon", "computers",
  "speakers", "microphone", "drafting tables", "equipment",
];

export const START_TIMES = Array.from({ length: 10 }, (_, i) => {
  const hour = 7 + i;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export const END_TIMES = Array.from({ length: 10 }, (_, i) => {
  const hour = 8 + i;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export const BOOKING_TYPES = ["class", "event", "recurring"] as const;

export const DAY_OPTIONS = [
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
];
