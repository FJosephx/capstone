import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../auth";

export default function Navigation({ user = null }) {
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
  }

  const isActive = (path) => location.pathname === path;

  return (
    <header style={headerStyle}>
      <div style={headerContentStyle}>
        {/* Logo y título */}
        <div style={logoSectionStyle}>
          <button 
            onClick={() => navigate("/")}
            style={logoButtonStyle}
          >
            <span style={logoEmojiStyle}>📹</span>
            <h1 style={titleStyle}>ConectaMayor</h1>
          </button>
        </div>

        {/* Navegación principal */}
        <nav style={navStyle}>
          <NavLink 
            to="/"
            label="Inicio"
            icon="🏠"
            active={isActive("/")}
            onClick={() => navigate("/")}
          />
          <NavLink 
            to="/users"
            label="Contactos"
            icon="👥"
            active={isActive("/users")}
            onClick={() => navigate("/users")}
          />
        </nav>

        {/* Sección del usuario */}
        <div style={userSectionStyle}>
          {user && (
            <div style={userInfoStyle}>
              <div style={avatarStyle}>
                {user.username?.charAt(0).toUpperCase() || "?"}
              </div>
              <span style={usernameStyle}>{user.username}</span>
            </div>
          )}
          
          <div style={actionsStyle}>
            <button 
              onClick={() => alert("Función de ayuda próximamente")}
              style={helpButtonStyle}
              title="Obtener ayuda"
            >
              ❓
            </button>
            <button 
              onClick={handleLogout} 
              style={logoutButtonStyle}
              title="Cerrar sesión"
            >
              🚪 Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Componente NavLink
function NavLink({ to, label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...navLinkStyle,
        ...(active ? activeNavLinkStyle : {})
      }}
      title={label}
    >
      <span style={navIconStyle}>{icon}</span>
      <span style={navLabelStyle}>{label}</span>
    </button>
  );
}

// Estilos
const headerStyle = {
  background: 'white',
  borderBottom: '2px solid #e2e8f0',
  padding: '12px 0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  position: 'sticky',
  top: 0,
  zIndex: 100
};

const headerContentStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '24px'
};

const logoSectionStyle = {
  minWidth: 'fit-content'
};

const logoButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '12px',
  transition: 'background-color 0.2s'
};

const logoEmojiStyle = {
  fontSize: '28px'
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#2d3748',
  margin: 0
};

const navStyle = {
  display: 'flex',
  gap: '8px',
  flex: 1,
  justifyContent: 'center'
};

const navLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 20px',
  background: 'none',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontSize: '16px',
  fontWeight: '500',
  color: '#4a5568',
  textDecoration: 'none'
};

const activeNavLinkStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  transform: 'translateY(-1px)',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
};

const navIconStyle = {
  fontSize: '18px'
};

const navLabelStyle = {
  fontSize: '16px'
};

const userSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  minWidth: 'fit-content'
};

const userInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 16px',
  background: '#f7fafc',
  borderRadius: '20px',
  border: '1px solid #e2e8f0'
};

const avatarStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: '600'
};

const usernameStyle = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#2d3748'
};

const actionsStyle = {
  display: 'flex',
  gap: '8px'
};

const helpButtonStyle = {
  padding: '10px',
  background: '#f7fafc',
  color: '#4a5568',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '16px',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const logoutButtonStyle = {
  padding: '10px 16px',
  fontSize: '14px',
  fontWeight: '500',
  background: '#e53e3e',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};