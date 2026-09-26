import { apiRequest } from "./clientapi";

export async function searchAll(query: string) {
  return apiRequest(`search?q=${encodeURIComponent(query)}`);
}