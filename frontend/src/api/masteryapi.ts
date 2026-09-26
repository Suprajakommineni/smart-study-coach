import { apiRequest } from "./clientapi";

export async function getMastery() {
  return apiRequest("mastery");
}