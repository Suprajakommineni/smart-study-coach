import { apiRequest } from "./clientapi";

export async function getSubjects(workspaceId: number) {
    return apiRequest(`workspaces/${workspaceId}/subjects`)
}

export async function createSubject( workspaceId: number, name: string, description?: string, tags?: string) {
    return apiRequest(`workspaces/${workspaceId}/subjects`,{
        method: 'POST',
        body: JSON.stringify({name, description, tags})
    })
}