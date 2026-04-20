import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Get current session token from Supabase client
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getCapsules: () => fetchWithAuth('/capsules'),
  getCapsuleById: (id: string) => fetchWithAuth(`/capsules/${id}`),
  createCapsule: (data: any) => fetchWithAuth('/capsules', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteCapsule: (id: string) => fetchWithAuth(`/capsules/${id}`, {
    method: 'DELETE'
  })
};
