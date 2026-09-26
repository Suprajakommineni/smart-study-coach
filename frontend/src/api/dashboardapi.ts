import { apiRequest } from "./clientapi";

export async function getDashboard() {
  return apiRequest("dashboard");
}