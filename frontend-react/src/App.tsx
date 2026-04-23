/**
 * App.tsx
 *
 * Componente raíz de SafeTruck React.
 * Orquesta SearchPanel, RouteMap y RouteSheet.
 * Maneja estado global: isLoading, statusLabel, routeResponse.
 * Inyecta la barra móvil de la misma forma que app.js en /frontend.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { calculateRoute } from "@/services/api";
import type { RouteRequest, RouteResponse } from "@/types/route";
import SearchPanel from "@/components/SearchPanel";
import RouteMap, { type RouteMapHandle } from "@/components/RouteMap";
import RouteSheet from "@/components/RouteSheet";
import UserButton from "@/components/UserButton";
import LoginPage from "@/components/LoginPage";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import "@/styles/main.css";
import "@/styles/mobile.css";

// ── Tipos de estado de búsqueda ──────────────────────────────

type SearchStatus = "idle" | "loading" | "found" | "not-found" | "error";

function statusToLabel(s: SearchStatus): string {
  switch (s) {
    case "idle":      return "API real";
    case "loading":   return "Calculando…";
    case "found":     return "Ruta encontrada";
    case "not-found": return "Sin ruta compatible";
    case "error":     return "Error al calcular";
  }
}

// ── Contenido de la app (necesita estar dentro de AuthProvider) ──

function AppInner() {
  const { user } = useAuth();

  const [routeResponse, setRouteResponse] = useState<RouteResponse | null>(null);
  const [searchStatus, setSearchStatus]   = useState<SearchStatus>("idle");
  const [sheetVisible, setSheetVisible]   = useState(false);
  const mapRef = useRef<RouteMapHandle>(null);

  const isLoading   = searchStatus === "loading";
  const statusLabel = statusToLabel(searchStatus);

  // ── Mobile UI injection ──────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile()) return;

    const bar = document.createElement("div");
    bar.className = "mobile-bar";
    bar.innerHTML = `<button class="reopen-route-btn" aria-label="Ver ruta">Ver ruta</button>`;
    document.body.appendChild(bar);

    const overlay = document.createElement("div");
    overlay.className = "mobile-overlay";
    document.body.appendChild(overlay);

    const sheet = document.querySelector<HTMLElement>(".route-sheet");

    const openSheet = () => {
      sheet?.classList.add("visible");
      overlay.classList.add("visible");
      bar.style.display = "none";
    };

    const closeSheet = () => {
      sheet?.classList.remove("visible");
      overlay.classList.remove("visible");
      bar.style.display = "";
    };

    bar.querySelector(".reopen-route-btn")?.addEventListener("click", openSheet);
    overlay.addEventListener("click", closeSheet);

    return () => {
      bar.remove();
      overlay.remove();
    };
  }, [user]);

  // ── Open sheet on mobile after each search ───────────────────

  useEffect(() => {
    if (!routeResponse) return;
    const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile()) return;

    const sheet   = document.querySelector<HTMLElement>(".route-sheet");
    const overlay = document.querySelector<HTMLElement>(".mobile-overlay");
    const bar     = document.querySelector<HTMLElement>(".mobile-bar");

    sheet?.classList.add("visible");
    overlay?.classList.add("visible");
    if (bar) bar.style.display = "none";
  }, [routeResponse]);

  // ── Search handler ───────────────────────────────────────────

  const handleSearch = useCallback(async (payload: RouteRequest) => {
    setSearchStatus("loading");
    setRouteResponse(null);

    try {
      const response = await calculateRoute(payload);
      setRouteResponse(response);
      setSearchStatus(response.found ? "found" : "not-found");
      setSheetVisible(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido.";
      setRouteResponse({
        found:                false,
        routeId:              null,
        distanceM:            0,
        estimatedDurationMin: 0,
        path:                 [],
        originLabel:          payload.originLabel,
        destinationLabel:     payload.destinationLabel,
        routeSummary:         "Ocurrió un error al calcular la ruta.",
        warnings:             [msg],
      });
      setSearchStatus("error");
      setSheetVisible(true);
    }
  }, []);

  // ── Focus route start ────────────────────────────────────────

  const handleFocusStart = useCallback(() => {
    mapRef.current?.focusRouteStart();
  }, []);

  // ── Render ───────────────────────────────────────────────────

  if (!user) return <LoginPage />;

  return (
    <div className="app-shell">
      <UserButton />

      <SearchPanel
        onSearch={handleSearch}
        isLoading={isLoading}
        statusLabel={statusLabel}
      />

      <RouteMap ref={mapRef} routeResponse={routeResponse} />

      <RouteSheet
        routeResponse={routeResponse}
        onFocusStart={handleFocusStart}
      />
    </div>
  );
}

// ── Componente raíz (provee el contexto de auth) ──────────────

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
