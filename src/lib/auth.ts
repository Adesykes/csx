import { VercelRequest } from '@vercel/node';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('authToken');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function isAdmin(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as JWTPayload;
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
