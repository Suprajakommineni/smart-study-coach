import { apiRequest } from "./clientapi";

//workspace_api
export async function getWorkspaces() {
    return apiRequest('workspaces');
}

export async function createWorkSpace(name: string, description?: string, tags?: string) {
    return apiRequest('workspaces', {
        method: 'POST',
        body: JSON.stringify({name, description, tags})
    })
}
