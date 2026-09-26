import { apiRequest } from "./clientapi";

export async function getAuditLogs() {
  return apiRequest("audit-log");
}