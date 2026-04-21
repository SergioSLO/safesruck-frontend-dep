/**
 * services/api.ts
 *
 * Centraliza todas las llamadas HTTP al backend SafeTruck.
 * El proxy de Vite redirige /api → http://localhost:3000 en desarrollo.
 * En producción se usa la misma URL base (mismo origen o variable de entorno).
 */

import type {
  RouteRequest,
  RouteResponse,
  HealthResponse,
  SearchResult,
} from "@/types/route";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const TOKEN_KEY = "safetruck_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── POST /api/routes ──────────────────────────────────────────
// Calcula la ruta óptima para un camión entre dos puntos.
export async function calculateRoute(payload: RouteRequest): Promise<RouteResponse> {
  const res = await fetch(`${BASE_URL}/api/routes`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body:    JSON.stringify(payload),
  });
  return handleResponse<RouteResponse>(res);
}

// ── GET /api/health ───────────────────────────────────────────
// Verifica que el backend y la base de datos estén operativos.
export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/api/health`);
  return handleResponse<HealthResponse>(res);
}

// ── GET /api/search?q=<query> ─────────────────────────────────
// Busca calles en red_vial por similitud de trigramas.
// Devuelve hasta 10 resultados ordenados por score.
export async function searchStreets(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(
    `${BASE_URL}/api/search?q=${encodeURIComponent(query.trim())}`,
    { headers: authHeaders() }
  );
  const data = await handleResponse<{ results: SearchResult[] }>(res);
  return data.results ?? [];
}
