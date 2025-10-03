// Componente para mostrar el estado de conexión del usuario
export function StatusIndicator({ status, size = 'md' }) {
  const statusConfig = {
    online: { color: '#48bb78', text: 'En línea', icon: '🟢' },
    away: { color: '#ed8936', text: 'Ausente', icon: '🟡' },
    busy: { color: '#e53e3e', text: 'Ocupado', icon: '🔴' },
    offline: { color: '#a0aec0', text: 'Desconectado', icon: '⚫' }
  };

  const config = statusConfig[status] || statusConfig.offline;
  const sizeConfig = {
    sm: { fontSize: '12px', padding: '4px 8px' },
    md: { fontSize: '14px', padding: '6px 12px' },
    lg: { fontSize: '16px', padding: '8px 16px' }
  };

  return (
    <div style={{
      ...baseStyle,
      ...sizeConfig[size],
      backgroundColor: `${config.color}20`,
      color: config.color,
      border: `1px solid ${config.color}40`
    }}>
      <span style={{ marginRight: '6px' }}>{config.icon}</span>
      {config.text}
    </div>
  );
}

// Componente Card reutilizable
export function Card({ children, onClick, className = '', style = {} }) {
  return (
    <div 
      style={{
        ...cardStyle,
        ...style,
        ...(onClick ? { cursor: 'pointer' } : {})
      }}
      onClick={onClick}
      className={className}
    >
      {children}
    </div>
  );
}

// Componente Avatar
export function Avatar({ name, size = 'md', image = null }) {
  const sizeConfig = {
    sm: { width: '32px', height: '32px', fontSize: '14px' },
    md: { width: '48px', height: '48px', fontSize: '18px' },
    lg: { width: '64px', height: '64px', fontSize: '24px' },
    xl: { width: '80px', height: '80px', fontSize: '32px' }
  };

  const initials = name
    ? name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2)
    : '?';

  if (image) {
    return (
      <img 
        src={image} 
        alt={name}
        style={{
          ...avatarBaseStyle,
          ...sizeConfig[size]
        }}
      />
    );
  }

  return (
    <div style={{
      ...avatarBaseStyle,
      ...sizeConfig[size],
      backgroundColor: getColorFromName(name),
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600'
    }}>
      {initials}
    </div>
  );
}

// Componente LoadingSpinner
export function LoadingSpinner({ size = 'md', color = '#667eea' }) {
  const sizeConfig = {
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px'
  };

  return (
    <div style={{
      width: sizeConfig[size],
      height: sizeConfig[size],
      border: `3px solid ${color}20`,
      borderTop: `3px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  );
}

// Componente Button mejorado
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  onClick,
  ...props 
}) {
  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none'
    },
    secondary: {
      background: 'transparent',
      color: '#4a5568',
      border: '2px solid #e2e8f0'
    },
    danger: {
      background: '#e53e3e',
      color: 'white',
      border: 'none'
    },
    success: {
      background: '#48bb78',
      color: 'white',
      border: 'none'
    }
  };

  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '14px' },
    md: { padding: '12px 24px', fontSize: '16px' },
    lg: { padding: '16px 32px', fontSize: '18px' }
  };

  return (
    <button
      style={{
        ...buttonBaseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...(disabled || loading ? disabledStyle : {}),
        ...(loading ? { position: 'relative' } : {})
      }}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <LoadingSpinner size="sm" color="currentColor" />
      )}
      <span style={{ 
        opacity: loading ? 0 : 1,
        marginLeft: loading ? '8px' : 0
      }}>
        {children}
      </span>
    </button>
  );
}

// Componente AlertMessage
export function AlertMessage({ type = 'info', message, onClose }) {
  const typeConfig = {
    success: { color: '#48bb78', bg: '#f0fff4', icon: '✅' },
    error: { color: '#e53e3e', bg: '#fed7d7', icon: '❌' },
    warning: { color: '#ed8936', bg: '#fffbf0', icon: '⚠️' },
    info: { color: '#3182ce', bg: '#ebf8ff', icon: 'ℹ️' }
  };

  const config = typeConfig[type];

  return (
    <div style={{
      ...alertStyle,
      backgroundColor: config.bg,
      borderColor: config.color,
      color: config.color
    }}>
      <span style={{ marginRight: '8px', fontSize: '16px' }}>
        {config.icon}
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: config.color,
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            marginLeft: '8px'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Funciones auxiliares
function getColorFromName(name) {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
  ];
  
  if (!name) return colors[0];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Estilos base
const baseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '20px',
  fontWeight: '500',
  fontSize: '14px',
  whiteSpace: 'nowrap'
};

const cardStyle = {
  background: 'white',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  padding: '24px',
  transition: 'all 0.2s ease',
  border: '1px solid #f0f0f0'
};

const avatarBaseStyle = {
  borderRadius: '50%',
  objectFit: 'cover',
  border: '2px solid #e2e8f0'
};

const buttonBaseStyle = {
  borderRadius: '12px',
  fontWeight: '600',
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  border: 'none',
  outline: 'none'
};

const disabledStyle = {
  opacity: 0.6,
  cursor: 'not-allowed',
  transform: 'none'
};

const alertStyle = {
  padding: '16px',
  borderRadius: '12px',
  border: '1px solid',
  display: 'flex',
  alignItems: 'center',
  fontSize: '16px',
  fontWeight: '500',
  margin: '16px 0'
};