/**
 * components/AuthModal.tsx
 *
 * Modal de autenticación con dos pestañas: Iniciar sesión / Registrarse.
 * Cierra con clic en el backdrop o la tecla Escape.
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { login as apiLogin, register as apiRegister } from "@/services/authApi";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onClose: () => void;
}

type Tab = "login" | "register";

export default function AuthModal({ onClose }: Props) {
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
  };

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        const res = await apiLogin({ email: loginEmail, password: loginPassword });
        login(res.token, res.user);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
      } finally {
        setLoading(false);
      }
    },
    [loginEmail, loginPassword, login, onClose]
  );

  const handleRegister = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      if (regPassword.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      setLoading(true);
      try {
        const res = await apiRegister({
          email:     regEmail,
          password:  regPassword,
          full_name: regName,
          company:   regCompany || undefined,
        });
        login(res.token, res.user);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrarse.");
      } finally {
        setLoading(false);
      }
    },
    [regEmail, regPassword, regName, regCompany, login, onClose]
  );

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Tabs */}
        <div className="auth-tabs">
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
            <button type="submit" disabled={loading}>
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
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
