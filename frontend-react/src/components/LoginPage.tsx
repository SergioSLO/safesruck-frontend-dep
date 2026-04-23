import { useState, useCallback, type FormEvent } from "react";
import { login as apiLogin, register as apiRegister } from "@/services/authApi";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "login" | "register";

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab]         = useState<Tab>("login");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regEmail, setRegEmail]       = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName]         = useState("");
  const [regCompany, setRegCompany]   = useState("");

  // Truck fields
  const [addTruck, setAddTruck]         = useState(false);
  const [truckName, setTruckName]       = useState("");
  const [truckWeight, setTruckWeight]   = useState("");
  const [truckHeight, setTruckHeight]   = useState("");
  const [truckWidth, setTruckWidth]     = useState("");
  const [truckLength, setTruckLength]   = useState("");

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
    setAddTruck(false);
  };

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        const res = await apiLogin({ email: loginEmail, password: loginPassword });
        login(res.token, res.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
      } finally {
        setLoading(false);
      }
    },
    [loginEmail, loginPassword, login]
  );

  const handleRegister = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      if (regPassword.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (addTruck) {
        if (!truckName.trim()) {
          setError("Ingresá el nombre del camión.");
          return;
        }
        const w = parseFloat(truckWeight);
        const h = parseFloat(truckHeight);
        const wd = parseFloat(truckWidth);
        const l = parseFloat(truckLength);
        if ([w, h, wd, l].some((v) => isNaN(v) || v <= 0)) {
          setError("Completá todas las dimensiones del camión con valores válidos.");
          return;
        }
      }
      setLoading(true);
      try {
        const trucks = addTruck
          ? [{
              name:           truckName.trim(),
              max_weight_kg:  parseFloat(truckWeight),
              max_height_m:   parseFloat(truckHeight),
              max_width_m:    parseFloat(truckWidth),
              max_length_m:   parseFloat(truckLength),
            }]
          : undefined;

        const res = await apiRegister({
          email:     regEmail,
          password:  regPassword,
          full_name: regName,
          company:   regCompany || undefined,
          trucks,
        });
        login(res.token, res.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrarse.");
      } finally {
        setLoading(false);
      }
    },
    [regEmail, regPassword, regName, regCompany, addTruck, truckName, truckWeight, truckHeight, truckWidth, truckLength, login]
  );

  return (
    <div className="login-page">
      <div className="login-bg-decoration" aria-hidden="true" />

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <span className="login-logo">🚛</span>
          <div>
            <p className="login-eyebrow">Plataforma de rutas</p>
            <h1 className="login-title">SafeTruck</h1>
          </div>
        </div>

        <p className="login-subtitle">
          Calculá rutas seguras para tu flota de camiones.
        </p>

        {/* Tabs */}
        <div className="auth-tabs login-tabs">
          <button
            type="button"
            className={`auth-tab${tab === "login" ? " active" : ""}`}
            onClick={() => switchTab("login")}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`auth-tab${tab === "register" ? " active" : ""}`}
            onClick={() => switchTab("register")}
          >
            Registrarse
          </button>
        </div>

        {/* Login form */}
        {tab === "login" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="juan@empresa.com"
              />
            </div>
            <div className="field">
              <span>Contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === "register" && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="field">
              <span>Nombre completo</span>
              <input
                type="text"
                autoComplete="name"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="juan@empresa.com"
              />
            </div>
            <div className="field">
              <span>Contraseña</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="field">
              <span>Empresa <em className="auth-optional">(opcional)</em></span>
              <input
                type="text"
                value={regCompany}
                onChange={(e) => setRegCompany(e.target.value)}
                placeholder="Transportes SA"
              />
            </div>

            {/* Truck toggle */}
            <div className="truck-toggle-row">
              <label className="truck-toggle-label">
                <input
                  type="checkbox"
                  className="truck-checkbox"
                  checked={addTruck}
                  onChange={(e) => setAddTruck(e.target.checked)}
                />
                <span className="truck-toggle-text">
                  Agregar un camión
                  <em className="auth-optional"> (opcional)</em>
                </span>
                {addTruck && <span className="truck-toggle-badge">1</span>}
              </label>

              {/* Popup */}
              {addTruck && (
                <div className="truck-popup">
                  <p className="truck-popup-title">Datos del camión</p>

                  <div className="field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      value={truckName}
                      onChange={(e) => setTruckName(e.target.value)}
                      placeholder="Volvo FH #1"
                    />
                  </div>

                  <div className="truck-popup-grid">
                    <div className="field">
                      <span>Peso máx. (kg)</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={truckWeight}
                        onChange={(e) => setTruckWeight(e.target.value)}
                        placeholder="12000"
                      />
                    </div>
                    <div className="field">
                      <span>Alto máx. (m)</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.01"
                        value={truckHeight}
                        onChange={(e) => setTruckHeight(e.target.value)}
                        placeholder="4.1"
                      />
                    </div>
                    <div className="field">
                      <span>Ancho máx. (m)</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.01"
                        value={truckWidth}
                        onChange={(e) => setTruckWidth(e.target.value)}
                        placeholder="2.5"
                      />
                    </div>
                    <div className="field">
                      <span>Largo máx. (m)</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.01"
                        value={truckLength}
                        onChange={(e) => setTruckLength(e.target.value)}
                        placeholder="12"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
