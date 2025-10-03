import { useEffect, useMemo, useState } from "react";
import { fetchUsers } from "../lib/api";
import Navigation from "../components/Navigation";

export default function Users() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(9); // Cambiado a 9 para grid de 3x3
  const [sort, setSort] = useState("id,desc");

  // data puede ser Page<UserListItem> o un array plano
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const rows = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data?.content && Array.isArray(data.content)) return data.content;
    return [];
  }, [data]);

  const totalPages = useMemo(() => {
    if (Array.isArray(data)) return 1;
    return Number.isFinite(data?.totalPages) ? data.totalPages : 1;
  }, [data]);

  async function load() {
    setLoading(true); setErr("");
    try {
      const resp = await fetchUsers({ query, page, size, sort });
      setData(resp);
    } catch (e) {
      setErr(String(e?.response?.data?.message || e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }



  function getUserStatus(user) {
    // Simulando diferentes estados
    const statuses = ['online', 'away', 'busy', 'offline'];
    return statuses[user.id % statuses.length];
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'online': return '🟢';
      case 'away': return '🟡';
      case 'busy': return '🔴';
      default: return '⚫';
    }
  }

  function getStatusText(status) {
    switch (status) {
      case 'online': return 'En línea';
      case 'away': return 'Ausente';
      case 'busy': return 'Ocupado';
      default: return 'Desconectado';
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [query, page, size, sort]);

  return (
    <div style={containerStyle}>
      {/* Navigation */}
      <Navigation />

      {/* Main content */}
      <main style={mainStyle}>
        <div style={welcomeSectionStyle}>
          <h2 style={welcomeTextStyle}>¡Encuentra a alguien para conversar!</h2>
          <p style={subtitleTextStyle}>
            Selecciona a una persona disponible para iniciar una videollamada
          </p>
        </div>

        {/* Search section */}
        <div style={searchSectionStyle}>
          <div style={searchInputContainerStyle}>
            <span style={searchIconStyle}>🔍</span>
            <input
              placeholder="Buscar por nombre..."
              value={query}
              onChange={(e) => { setPage(0); setQuery(e.target.value); }}
              style={searchInputStyle}
            />
          </div>
        </div>

        {/* Error message */}
        {err && (
          <div style={errorStyle}>
            <span>⚠️</span>
            {err}
          </div>
        )}

        {/* Users grid */}
        <div style={usersGridStyle}>
          {loading ? (
            <div style={loadingStyle}>
              <div style={spinnerStyle}>⏳</div>
              <p>Cargando contactos...</p>
            </div>
          ) : rows.length === 0 ? (
            <div style={emptyStateStyle}>
              <span style={emptyIconStyle}>👥</span>
              <p>No se encontraron contactos</p>
            </div>
          ) : (
            rows.map((user) => {
              const status = getUserStatus(user);
              return (
                <UserCard
                  key={user.id}
                  user={user}
                  status={status}
                  onCall={() => alert(`Iniciando videollamada con ${user.username}`)}
                />
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={paginationStyle}>
            <button 
              disabled={page <= 0} 
              onClick={() => setPage(page - 1)}
              style={{
                ...paginationButtonStyle,
                ...(page <= 0 ? disabledButtonStyle : {})
              }}
            >
              ← Anterior
            </button>
            <span style={pageInfoStyle}>
              Página {page + 1} de {Math.max(totalPages, 1)}
            </span>
            <button 
              disabled={page + 1 >= totalPages} 
              onClick={() => setPage(page + 1)}
              style={{
                ...paginationButtonStyle,
                ...(page + 1 >= totalPages ? disabledButtonStyle : {})
              }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Componente UserCard
function UserCard({ user, status, onCall }) {
  const isAvailable = status === 'online' || status === 'away';
  
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={avatarStyle}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div style={statusBadgeStyle}>
          <span style={statusIconStyle}>{getStatusIcon(status)}</span>
          <span style={statusTextStyle}>{getStatusText(status)}</span>
        </div>
      </div>
      
      <div style={cardBodyStyle}>
        <h3 style={userNameStyle}>{user.username}</h3>
        <p style={userEmailStyle}>{user.email}</p>
      </div>
      
      <div style={cardFooterStyle}>
        <button
          onClick={onCall}
          disabled={!isAvailable}
          style={{
            ...callButtonStyle,
            ...(isAvailable ? availableButtonStyle : unavailableButtonStyle)
          }}
        >
          {isAvailable ? '📞 Llamar' : '⏰ No disponible'}
        </button>
      </div>
    </div>
  );
}

// Función auxiliar para obtener el icono de estado
function getStatusIcon(status) {
  switch (status) {
    case 'online': return '🟢';
    case 'away': return '🟡';
    case 'busy': return '🔴';
    default: return '⚫';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'online': return 'En línea';
    case 'away': return 'Ausente';
    case 'busy': return 'Ocupado';
    default: return 'Desconectado';
  }
}

// Estilos
const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};



const mainStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '32px 24px'
};

const welcomeSectionStyle = {
  textAlign: 'center',
  marginBottom: '32px'
};

const welcomeTextStyle = {
  fontSize: '28px',
  fontWeight: '600',
  color: '#2d3748',
  margin: '0 0 8px 0'
};

const subtitleTextStyle = {
  fontSize: '18px',
  color: '#718096',
  margin: 0
};

const searchSectionStyle = {
  marginBottom: '32px',
  display: 'flex',
  justifyContent: 'center'
};

const searchInputContainerStyle = {
  position: 'relative',
  maxWidth: '400px',
  width: '100%'
};

const searchIconStyle = {
  position: 'absolute',
  left: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '18px',
  zIndex: 1
};

const searchInputStyle = {
  width: '100%',
  padding: '16px 16px 16px 48px',
  fontSize: '18px',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box'
};

const errorStyle = {
  background: '#fed7d7',
  color: '#c53030',
  padding: '16px',
  borderRadius: '12px',
  fontSize: '16px',
  textAlign: 'center',
  marginBottom: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

const usersGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '24px',
  marginBottom: '32px'
};

const loadingStyle = {
  gridColumn: '1 / -1',
  textAlign: 'center',
  padding: '48px',
  color: '#718096'
};

const spinnerStyle = {
  fontSize: '32px',
  marginBottom: '16px'
};

const emptyStateStyle = {
  gridColumn: '1 / -1',
  textAlign: 'center',
  padding: '48px',
  color: '#718096'
};

const emptyIconStyle = {
  fontSize: '48px',
  display: 'block',
  marginBottom: '16px'
};

const cardStyle = {
  background: 'white',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  padding: '24px',
  transition: 'transform 0.2s, box-shadow 0.2s',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
  }
};

const cardHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px'
};

const avatarStyle = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  fontWeight: '600'
};

const statusBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 8px',
  background: '#f7fafc',
  borderRadius: '20px',
  fontSize: '12px'
};

const statusIconStyle = {
  fontSize: '12px'
};

const statusTextStyle = {
  fontWeight: '500',
  color: '#4a5568'
};

const cardBodyStyle = {
  marginBottom: '20px'
};

const userNameStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#2d3748',
  margin: '0 0 4px 0'
};

const userEmailStyle = {
  fontSize: '14px',
  color: '#718096',
  margin: 0
};

const cardFooterStyle = {
  display: 'flex',
  justifyContent: 'center'
};

const callButtonStyle = {
  width: '100%',
  padding: '16px',
  fontSize: '16px',
  fontWeight: '600',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const availableButtonStyle = {
  background: '#48bb78',
  color: 'white'
};

const unavailableButtonStyle = {
  background: '#e2e8f0',
  color: '#a0aec0',
  cursor: 'not-allowed'
};

const paginationStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '16px',
  marginTop: '32px'
};

const paginationButtonStyle = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: '500',
  background: 'white',
  color: '#4a5568',
  border: '2px solid #e2e8f0',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const disabledButtonStyle = {
  background: '#f7fafc',
  color: '#a0aec0',
  cursor: 'not-allowed'
};

const pageInfoStyle = {
  fontSize: '16px',
  color: '#4a5568',
  fontWeight: '500'
};
