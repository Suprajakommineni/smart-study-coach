import { API_URL } from "./config";

//register_api
export async function registerUser(email: string, password: string) {
      const response = await fetch(`${API_URL}/auth/signup`,{
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
        },
        body: JSON.stringify({ email, password})
      })
       const data = await response.json()
      if(!response.ok) {
       
        throw new Error(data.message)

    
      }
      return data;
}

//login_api
export async function loginUser(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password})
    })
     const data = await response.json()
    if(!response.ok) {
       
        throw new Error(data.message);
    }
    return data;
}