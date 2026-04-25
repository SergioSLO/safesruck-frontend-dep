/**
 * SearchPanel.tsx
 *
 * Port de frontend/scripts/app.js + geocodingService.js.
 * Panel flotante izquierdo con formulario de búsqueda, autocompletado
 * y GPS para el origen.
 */

import { useState, useRef, useEffect } from "react";
import { searchLocations, geocodeLocation, type GeoSuggestion } from "@/services/geocoding";
import { useAuth } from "@/contexts/AuthContext";
import type { RouteRequest } from "@/types/route";

interface LocationField {
  value:          string;
  selected:       GeoSuggestion | null;
  status:         string;
  suggestions:    GeoSuggestion[];
  showSuggestions: boolean;
}

const INITIAL_STATUS = "Escribi una direccion o lugar y elegi una sugerencia.";

function initField(defaultValue: string): LocationField {
  return {
    value: defaultValue,
    selected: null,
    status: INITIAL_STATUS,
    suggestions: [],
    showSuggestions: false,
  };
}

interface Props {
  onSearch:    (payload: RouteRequest) => void;
  isLoading:   boolean;
  statusLabel: string;
}

export default function SearchPanel({ onSearch, isLoading, statusLabel }: Props) {
  const { user } = useAuth();
  const trucks = user?.trucks ?? [];

  const [origin,      setOrigin]      = useState<LocationField>(initField("Villa Devoto, Buenos Aires"));
  const [destination, setDestination] = useState<LocationField>(initField("Chacarita, Buenos Aires"));
  const [weight,    setWeight]    = useState(trucks[0]?.max_weight_kg ?? 12000);
  const [height,    setHeight]    = useState(trucks[0]?.max_height_m  ?? 4.1);
  const [width,     setWidth]     = useState(trucks[0]?.max_width_m   ?? 2.5);
  const [length,    setLength]    = useState(trucks[0]?.max_length_m  ?? 12);
  const [avoidTolls,     setAvoidTolls]     = useState(true);
  const [preferHighways, setPreferHighways] = useState(true);
  const [selectedTruckId, setSelectedTruckId] = useState<number | "custom">(
    trucks[0]?.id ?? "custom"
  );

  function selectTruck(id: number | "custom") {
    setSelectedTruckId(id);
    if (id === "custom") return;
    const t = trucks.find((t) => t.id === id);
    if (!t) return;
    setWeight(t.max_weight_kg);
    setHeight(t.max_height_m);
    setWidth(t.max_width_m);
    setLength(t.max_length_m);
  }

  const originTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GPS — completa el origen con la ubicación actual si no hay nada elegido
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setOrigin((prev) => {
        if (prev.selected) return prev;
        const { latitude: lat, longitude: lon } = pos.coords;
        return {
          value:    "Mi ubicacion",
          selected: { label: "Mi ubicacion", lat, lon, score: 1, source: "backend" },
          status:   `Ubicacion actual: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          suggestions: [],
          showSuggestions: false,
        };
      });
    });
  }, []);

  // ── Input handler con debounce ───────────────────────────────

  function handleInput(
    setField: React.Dispatch<React.SetStateAction<LocationField>>,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    value: string
  ) {
    setField((f) => ({
      ...f,
      value,
      selected: null,
      status: "Buscando sugerencias...",
      showSuggestions: false,
    }));

    if (timerRef.current) clearTimeout(timerRef.current);

    if (value.trim().length < 3) {
      setField((f) => ({ ...f, status: "Escribi al menos 3 caracteres para buscar." }));
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const suggestions = await searchLocations(value.trim());
        if (!suggestions.length) {
          setField((f) => ({
            ...f,
            status: "No encontramos sugerencias para ese texto.",
            suggestions: [],
            showSuggestions: false,
          }));
          return;
        }
        setField((f) => ({
          ...f,
          suggestions,
          showSuggestions: true,
          status: "Elegi una sugerencia para fijar coordenadas reales.",
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al buscar.";
        setField((f) => ({ ...f, status: msg, suggestions: [], showSuggestions: false }));
      }
    }, 350);
  }

  function handleSelect(
    setField: React.Dispatch<React.SetStateAction<LocationField>>,
    suggestion: GeoSuggestion
  ) {
    setField({
      value:    suggestion.label,
      selected: suggestion,
      status:   `Ubicacion confirmada: ${suggestion.lat.toFixed(4)}, ${suggestion.lon.toFixed(4)}`,
      suggestions: [],
      showSuggestions: false,
    });
  }

  function handleBlur(setField: React.Dispatch<React.SetStateAction<LocationField>>) {
    setTimeout(() => setField((f) => ({ ...f, showSuggestions: false })), 150);
  }

  async function resolveField(
    field: LocationField,
    setField: React.Dispatch<React.SetStateAction<LocationField>>
  ): Promise<GeoSuggestion> {
    if (field.selected) return field.selected;
    setField((f) => ({ ...f, status: "Resolviendo coordenadas..." }));
    const resolved = await geocodeLocation(field.value.trim());
    setField({
      value:    resolved.label,
      selected: resolved,
      status:   `Ubicacion confirmada: ${resolved.lat.toFixed(4)}, ${resolved.lon.toFixed(4)}`,
      suggestions: [],
      showSuggestions: false,
    });
    return resolved;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const [o, d] = await Promise.all([
        resolveField(origin, setOrigin),
        resolveField(destination, setDestination),
      ]);
      onSearch({
        originLabel:      o.label,
        destinationLabel: d.label,
        origin:      { lat: o.lat, lon: o.lon },
        destination: { lat: d.lat, lon: d.lon },
        vehicle:     { maxWeightKg: weight, maxHeightM: height, maxWidthM: width, maxLengthM: length },
        routingOptions: { avoidTolls, preferHighways },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al resolver ubicaciones.";
      setOrigin((f) => ({ ...f, status: msg }));
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <section className="search-panel">
      <div className="brand-row">
        <div>
          <p className="eyebrow">SafeTruck</p>
          <h1>Rutas para camiones</h1>
          <p className="hero-copy">
            Planeá trayectos urbanos con foco en tránsito pesado y validación sobre la red vial
            cargada en tiempo real.
          </p>
        </div>
        <p className="status-pill">{statusLabel}</p>
      </div>

      <form id="route-form" className="route-form" onSubmit={handleSubmit}>

        {/* ── Origen ── */}
        <div className="location-field">
          <label className="field">
            <span>Origen</span>
            <input
              id="origin-input"
              type="text"
              value={origin.value}
              autoComplete="off"
              required
              onChange={(e) => handleInput(setOrigin, originTimerRef, e.target.value)}
              onBlur={() => handleBlur(setOrigin)}
            />
          </label>
          <p id="origin-status" className="field-status">{origin.status}</p>
          {origin.showSuggestions && origin.suggestions.length > 0 && (
            <ul id="origin-suggestions" className="suggestions-list">
              {origin.suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(setOrigin, s); }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Destino ── */}
        <div className="location-field">
          <label className="field">
            <span>Destino</span>
            <input
              id="destination-input"
              type="text"
              value={destination.value}
              autoComplete="off"
              required
              onChange={(e) => handleInput(setDestination, destTimerRef, e.target.value)}
              onBlur={() => handleBlur(setDestination)}
            />
          </label>
          <p id="destination-status" className="field-status">{destination.status}</p>
          {destination.showSuggestions && destination.suggestions.length > 0 && (
            <ul id="destination-suggestions" className="suggestions-list">
              {destination.suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(setDestination, s); }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Perfil del camion ── */}
        <details className="truck-details">
          <summary>Perfil del camión y preferencias</summary>

          {/* Truck selector cards */}
          {trucks.length > 0 && (
            <div className="truck-selector">
              {trucks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`truck-card${selectedTruckId === t.id ? " active" : ""}`}
                  onClick={() => selectTruck(t.id)}
                >
                  <span className="truck-card-name">{t.name}</span>
                  <span className="truck-card-spec">
                    {t.max_weight_kg / 1000} t · {t.max_height_m} m alt
                  </span>
                  <span className="truck-card-spec">
                    {t.max_width_m} m ancho · {t.max_length_m} m largo
                  </span>
                </button>
              ))}
              <button
                type="button"
                className={`truck-card truck-card-new${selectedTruckId === "custom" ? " active" : ""}`}
                onClick={() => selectTruck("custom")}
              >
                <span className="truck-card-name">+ Nuevo</span>
                <span className="truck-card-spec">Ingresar dimensiones manualmente</span>
              </button>
            </div>
          )}

          <div className="grid-2">
            <label className="field">
              <span>Peso (kg)</span>
              <input type="number" value={weight} min={1}
                onChange={(e) => { setSelectedTruckId("custom"); setWeight(Number(e.target.value)); }} required />
            </label>
            <label className="field">
              <span>Altura (m)</span>
              <input type="number" value={height} min={0.1} step={0.1}
                onChange={(e) => { setSelectedTruckId("custom"); setHeight(Number(e.target.value)); }} required />
            </label>
            <label className="field">
              <span>Ancho (m)</span>
              <input type="number" value={width} min={0.1} step={0.1}
                onChange={(e) => { setSelectedTruckId("custom"); setWidth(Number(e.target.value)); }} required />
            </label>
            <label className="field">
              <span>Largo (m)</span>
              <input type="number" value={length} min={0.1} step={0.1}
                onChange={(e) => { setSelectedTruckId("custom"); setLength(Number(e.target.value)); }} required />
            </label>
          </div>
          <div className="options">
            <label className="toggle">
              <input type="checkbox" checked={avoidTolls}
                onChange={(e) => setAvoidTolls(e.target.checked)} />
              <span>Evitar peajes</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={preferHighways}
                onChange={(e) => setPreferHighways(e.target.checked)} />
              <span>Preferir corredores</span>
            </label>
          </div>
        </details>

        <button id="submit-button" type="submit" disabled={isLoading}>
          {isLoading ? "Calculando…" : "Calcular ruta"}
        </button>
      </form>
    </section>
  );
}
