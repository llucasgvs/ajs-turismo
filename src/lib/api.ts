const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * fetch com timeout. Sem isso, um backend lento/travado deixa a tela girando
 * para sempre — o fetch padrão nunca desiste. No timeout, rejeita (AbortError),
 * o que faz o `finally` das páginas desligar o spinner em vez de pendurar.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface StoredUser {
  id: number;
  full_name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  cpf?: string;
  phone?: string;
  birth_date?: string;
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
  if (user.is_admin) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `ajs_admin=1; path=/; SameSite=Lax; max-age=86400${secure}`;
    // Token real em cookie: o middleware exige sua presença, não só o flag
    document.cookie = `ajs_token=${accessToken}; path=/; SameSite=Lax; max-age=86400${secure}`;
  }
}

export function logout() {
  localStorage.removeItem("ajs_token");
  localStorage.removeItem("ajs_refresh_token");
  localStorage.removeItem("ajs_user");
  document.cookie = "ajs_admin=; path=/; max-age=0";
  document.cookie = "ajs_token=; path=/; max-age=0";
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
    // Mantém o cookie do token sincronizado (se admin) para o middleware
    if (document.cookie.includes("ajs_admin=1")) {
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `ajs_token=${data.access_token}; path=/; SameSite=Lax; max-age=86400${secure}`;
    }
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

  let res = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      res = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers });
    } else {
      logout();
    }
  }

  return res;
}
