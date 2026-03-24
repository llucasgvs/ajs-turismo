const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface StoredUser {
  id: number;
  full_name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ajs_token");
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("ajs_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveSession(accessToken: string, refreshToken: string, user: StoredUser) {
  localStorage.setItem("ajs_token", accessToken);
  localStorage.setItem("ajs_refresh_token", refreshToken);
  localStorage.setItem("ajs_user", JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem("ajs_token");
  localStorage.removeItem("ajs_refresh_token");
  localStorage.removeItem("ajs_user");
  window.location.href = "/login";
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("ajs_refresh_token");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("ajs_token", data.access_token);
    localStorage.setItem("ajs_refresh_token", data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    } else {
      logout();
    }
  }

  return res;
}
