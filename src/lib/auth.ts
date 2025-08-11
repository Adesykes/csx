export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
  // Start session timeout when user logs in
  startSessionTimeout();
}

export function clearAuthToken(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userInfo');
  // Also clear any session storage data
  sessionStorage.clear();
}

// Session timeout functionality
let sessionTimeoutId: NodeJS.Timeout | null = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function startSessionTimeout(): void {
  clearSessionTimeout();
  sessionTimeoutId = setTimeout(() => {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.role === 'client') {
      logout();
      alert('Your session has expired. Please log in again.');
    }
  }, SESSION_TIMEOUT);
}

export function clearSessionTimeout(): void {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
}

export function resetSessionTimeout(): void {
  startSessionTimeout();
}

export function logout(): void {
  clearSessionTimeout();
  clearAuthToken();
  // Redirect to login page
  window.location.href = '/';
}

// Setup automatic logout when browser/tab is closed
export function setupAutoLogout(): (() => void) {
  // Clear auth data when page is unloaded (browser/tab closed)
  const handleBeforeUnload = () => {
    // Only auto-logout clients, not admins (you can customize this)
    const userInfo = getUserInfo();
    if (userInfo && userInfo.role === 'client') {
      clearAuthToken();
    }
  };

  // Also handle page hide (iOS Safari compatibility)
  const handlePageHide = () => {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.role === 'client') {
      clearAuthToken();
    }
  };

  // Add event listeners
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handlePageHide);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('pagehide', handlePageHide);
  };
}

export function getUserInfo(): UserInfo | null {
  const userInfo = localStorage.getItem('userInfo');
  if (!userInfo) return null;
  try {
    return JSON.parse(userInfo) as UserInfo;
  } catch {
    return null;
  }
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

export function isClient(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as JWTPayload;
    return payload.role === 'client' || payload.role === 'user';
  } catch {
    return false;
  }
}

export function getUser(): JWTPayload | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1])) as JWTPayload;
  } catch {
    return null;
  }
}
