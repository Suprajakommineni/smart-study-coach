import { apiRequest } from "./clientapi";

export async function getSources(moduleId: number) {
  return apiRequest(`modules/${moduleId}/sources`);
}

export async function createSources(moduleId: number, text: string) {
  return apiRequest(`modules/${moduleId}/sources`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function updateSource(
  sourceId: number,
  moduleId: number,
  text: string,
) {
  return apiRequest(`modules/${moduleId}/sources/${sourceId}`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });
}

export async function sourceProcess(
  sourceId: number,
  moduleId: number,
) {
  return apiRequest(
    `modules/${moduleId}/sources/${sourceId}/process`,
    {
      method: "POST",
    },
  );
}