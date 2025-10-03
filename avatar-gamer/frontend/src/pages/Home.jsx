import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={containerStyle}>
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <main style={mainStyle}>
        <section style={heroSectionStyle}>
          <div style={heroContentStyle}>
            <h2 style={heroTitleStyle}>
              ¡Bienvenido a ConectaMayor!
            </h2>
            <p style={heroSubtitleStyle}>
              La forma más fácil de mantenerte conectado con familia y amigos a través de videollamadas
            </p>
            <div style={heroButtonsStyle}>
              <button 
                onClick={() => navigate("/users")} 
                style={primaryButtonStyle}
              >
                📞 Ver Contactos
              </button>
            </div>
          </div>
          <div style={heroImageStyle}>
            <div style={videoCallIllustrationStyle}>
              <div style={screenStyle}>
                <div style={participantStyle}>👵</div>
                <div style={participantStyle}>👴</div>
                <div style={participantStyle}>👨‍👩‍👧‍👦</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={featuresSectionStyle}>
          <h3 style={sectionTitleStyle}>¿Cómo funciona?</h3>
          <div style={featuresGridStyle}>
            <FeatureCard
              icon="👥"
              title="Encuentra contactos"
              description="Ve quién está disponible para conversar en tiempo real"
            />
            <FeatureCard
              icon="📞"
              title="Inicia una llamada"
              description="Con solo un clic, conecta con familia y amigos"
            />
            <FeatureCard
              icon="💬"
              title="Conversación fácil"
              description="Interfaz simple y botones grandes para mayor comodidad"
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section style={quickActionsSectionStyle}>
          <h3 style={sectionTitleStyle}>Acciones rápidas</h3>
          <div style={quickActionsGridStyle}>
            <QuickActionCard
              icon="📋"
              title="Ver mis contactos"
              description="Lista de personas disponibles"
              onClick={() => navigate("/users")}
              primary
            />
            <QuickActionCard
              icon="❓"
              title="¿Necesitas ayuda?"
              description="Contacta con soporte técnico"
              onClick={() => alert("Contacta con soporte: support@conectamayor.com")}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

// Componente FeatureCard
function FeatureCard({ icon, title, description }) {
  return (
    <div style={featureCardStyle}>
      <div style={featureIconStyle}>{icon}</div>
      <h4 style={featureTitleStyle}>{title}</h4>
      <p style={featureDescriptionStyle}>{description}</p>
    </div>
  );
}

// Componente QuickActionCard
function QuickActionCard({ icon, title, description, onClick, primary = false }) {
  return (
    <div 
      style={{
        ...quickActionCardStyle,
        ...(primary ? primaryCardStyle : {})
      }}
      onClick={onClick}
    >
      <div style={quickActionIconStyle}>{icon}</div>
      <div>
        <h4 style={quickActionTitleStyle}>{title}</h4>
        <p style={quickActionDescriptionStyle}>{description}</p>
      </div>
      <span style={arrowStyle}>→</span>
    </div>
  );
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

const heroSectionStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '48px',
  alignItems: 'center',
  marginBottom: '64px'
};

const heroContentStyle = {
  textAlign: 'left'
};

const heroTitleStyle = {
  fontSize: '48px',
  fontWeight: '700',
  color: '#2d3748',
  margin: '0 0 16px 0',
  lineHeight: '1.2'
};

const heroSubtitleStyle = {
  fontSize: '20px',
  color: '#718096',
  margin: '0 0 32px 0',
  lineHeight: '1.6'
};

const heroButtonsStyle = {
  display: 'flex',
  gap: '16px'
};

const primaryButtonStyle = {
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: '600',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'transform 0.2s'
};

const heroImageStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

const videoCallIllustrationStyle = {
  background: 'white',
  borderRadius: '16px',
  padding: '32px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
};

const screenStyle = {
  width: '280px',
  height: '200px',
  background: '#1a202c',
  borderRadius: '12px',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gridTemplateRows: '1fr 1fr',
  gap: '8px',
  padding: '16px'
};

const participantStyle = {
  background: '#4a5568',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '32px'
};

const featuresSectionStyle = {
  marginBottom: '64px'
};

const sectionTitleStyle = {
  fontSize: '32px',
  fontWeight: '600',
  color: '#2d3748',
  textAlign: 'center',
  margin: '0 0 32px 0'
};

const featuresGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '32px'
};

const featureCardStyle = {
  background: 'white',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  transition: 'transform 0.2s'
};

const featureIconStyle = {
  fontSize: '48px',
  marginBottom: '16px'
};

const featureTitleStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#2d3748',
  margin: '0 0 8px 0'
};

const featureDescriptionStyle = {
  fontSize: '16px',
  color: '#718096',
  margin: 0,
  lineHeight: '1.6'
};

const quickActionsSectionStyle = {
  marginBottom: '64px'
};

const quickActionsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '24px'
};

const quickActionCardStyle = {
  background: 'white',
  borderRadius: '16px',
  padding: '24px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s'
};

const primaryCardStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white'
};

const quickActionIconStyle = {
  fontSize: '32px',
  minWidth: '48px'
};

const quickActionTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 4px 0'
};

const quickActionDescriptionStyle = {
  fontSize: '14px',
  opacity: 0.8,
  margin: 0
};

const arrowStyle = {
  fontSize: '20px',
  marginLeft: 'auto'
};
