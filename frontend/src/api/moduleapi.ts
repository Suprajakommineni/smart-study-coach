import { apiRequest } from "./clientapi";

export async function getModules(workspaceId: number, subjectId: number) {
   return apiRequest(`workspaces/${workspaceId}/subjects/${subjectId}/modules`)
}

export async function createModule(workspaceId: number, subjectId: number, name: string, description?: string, tags?:  string) {
    return apiRequest(`workspaces/${workspaceId}/subjects/${subjectId}/modules`,{
        method:'POST',
        body: JSON.stringify({
            name, description, tags
        })
})
}