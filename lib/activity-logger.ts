import crypto from "crypto";
import { ActivityLogEntry } from "./types";
import { getActivityLog, writeActivityLog } from "./data";

export async function logActivity(params: {
  userId: string;
  userName: string;
  action: ActivityLogEntry["action"];
  entity: ActivityLogEntry["entity"];
  entityId: string;
  description: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const log = getActivityLog();
  const entry: ActivityLogEntry = {
    id: `log_${crypto.randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    ...params,
  };
  log.push(entry);
  await writeActivityLog(log);
}
