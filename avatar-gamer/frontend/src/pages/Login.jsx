import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../auth";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2?.response?.data?.error ||
        e2?.message ||
        "Error al iniciar sesión";
      setErr(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header con logo y bienvenida */}
        <div style={headerStyle}>
          <div style={logoStyle}>📹</div>
          <h1 style={titleStyle}>ConectaMayor</h1>
          <p style={subtitleStyle}>
            Conecta con familiares y amigos a través de videollamadas
          </p>
        </div>

        <form onSubmit={onSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Usuario</label>
            <input
              type="text"
              placeholder="Ingresa tu nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !username.trim() || !password.trim()}
            style={{
              ...buttonStyle,
              ...(loading ? loadingButtonStyle : {}),
              ...((!username.trim() || !password.trim()) ? disabledButtonStyle : {})
            }}
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>

          {err && (
            <div style={errorStyle}>
              <span style={errorIconStyle}>⚠️</span>
              {err}
            </div>
          )}
        </form>

        <div style={helpStyle}>
          <p>¿Necesitas ayuda? Contacta a soporte técnico</p>
        </div>
      </div>
    </div>
  );
}

// Estilos optimizados para adultos mayores
const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

const cardStyle = {
  background: 'white',
  borderRadius: '16px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  padding: '40px',
  maxWidth: '450px',
  width: '100%',
  textAlign: 'center'
};

const headerStyle = {
  marginBottom: '32px'
};

const logoStyle = {
  fontSize: '48px',
  marginBottom: '16px'
};

const titleStyle = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#2d3748',
  margin: '0 0 12px 0'
};

const subtitleStyle = {
  fontSize: '16px',
  color: '#718096',
  margin: 0,
  lineHeight: '1.5'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
};

const inputGroupStyle = {
  textAlign: 'left'
};

const labelStyle = {
  display: 'block',
  fontSize: '16px',
  fontWeight: '600',
  color: '#2d3748',
  marginBottom: '8px'
};

const inputStyle = {
  width: '100%',
  padding: '16px',
  fontSize: '18px',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box'
};

const buttonStyle = {
  width: '100%',
  padding: '18px',
  fontSize: '18px',
  fontWeight: '600',
  color: 'white',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  marginTop: '8px'
};

const loadingButtonStyle = {
  background: '#a0aec0',
  cursor: 'not-allowed'
};

const disabledButtonStyle = {
  background: '#e2e8f0',
  color: '#a0aec0',
  cursor: 'not-allowed'
};

const errorStyle = {
  background: '#fed7d7',
  color: '#c53030',
  padding: '16px',
  borderRadius: '12px',
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const errorIconStyle = {
  fontSize: '18px'
};

const helpStyle = {
  marginTop: '32px',
  padding: '16px',
  background: '#f7fafc',
  borderRadius: '12px',
  fontSize: '14px',
  color: '#718096'
};
