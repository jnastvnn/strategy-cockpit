import { AuthView } from '@neondatabase/neon-js/auth/react/ui';
import { useParams } from 'react-router-dom';
import { Compass, Sparkles, BrainCircuit, ShieldCheck } from 'lucide-react';

export function Auth() {
  const { pathname } = useParams();
  
  return (
    <div className="auth-page">
      <div className="auth-brand-side">
        <div className="brand-content">
          <div className="brand-header">
            <Compass size={32} className="logo-icon" />
            <span className="logo-text">Strategy Cockpit</span>
          </div>
          
          <div className="brand-hero">
            <h1>Next-Gen Strategic Intelligence</h1>
            <p>Empower your business decisions with AI-driven insights and real-time market analysis.</p>
          </div>

          <div className="brand-features">
            <div className="brand-feature-item">
              <div className="feature-icon-wrapper">
                <Sparkles size={20} />
              </div>
              <div>
                <h3>AI-Powered Analysis</h3>
                <p>Automated deep-dives into market trends and strategy performance.</p>
              </div>
            </div>
            <div className="brand-feature-item">
              <div className="feature-icon-wrapper">
                <BrainCircuit size={20} />
              </div>
              <div>
                <h3>Predictive Modeling</h3>
                <p>Forecast outcomes and identify strategic blind spots instantly.</p>
              </div>
            </div>
            <div className="brand-feature-item">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3>Enterprise Security</h3>
                <p>Built on top of Neon's secure infrastructure with state-of-the-art protection.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="brand-bg-pattern"></div>
      </div>
      
      <div className="auth-form-side">
        <div className="auth-container-box">
          <AuthView pathname={pathname} />
        </div>
      </div>
    </div>
  );
}