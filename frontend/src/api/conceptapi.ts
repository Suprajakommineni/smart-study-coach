import { apiRequest } from "./clientapi";

export async function getConcepts(sourceId: number) {
    return apiRequest(`sources/${sourceId}/concepts`)
}
export async function acceptConcept(id: number) {
    return apiRequest(`concepts/${id}/accept`, {
        method: 'POST',
        
    })
}

export async function rejectConcept(id: number) {
    return apiRequest(`concepts/${id}/reject`, {
        method: 'POST',
       
    })
}
export async function editConcept(id: number, title: string, definition: string, facts: string[]) {
    return apiRequest(`concepts/${id}/edit`, {
        method: 'PATCH',
        body: JSON.stringify({ title, definition, facts})
    })
}
export async function mergeConcepts( keepId: number, mergeId: number) {
    return apiRequest(`concepts/merge`, {
        method: 'POST',
        body: JSON.stringify({keepId, mergeId})
    })
}