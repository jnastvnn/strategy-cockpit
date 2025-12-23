import {
  SignedIn,
  SignedOut,
  UserButton,
} from '@neondatabase/neon-js/auth/react/ui';
import { Link } from 'react-router-dom';
import './home.css'; // We'll create a dedicated style for this main view

export function Home() {
  const handlePlaceholderAction = (label: string) => {
    alert(`${label} is coming soon.`);
  };

  return (
    <>
      <SignedIn>
        <div className="dashboard">
          <aside className="sidebar">
            <div className="sidebar-header">
              <span className="logo-text">Strategy Cockpit</span>
            </div>
            <nav className="sidebar-nav">
              <Link to="/" className="nav-item active">
                Dashboard
              </Link>
              <button
                className="nav-item nav-button"
                onClick={() => handlePlaceholderAction('Scenario builder')}
              >
                Scenario Builder
              </button>
              <button
                className="nav-item nav-button"
                onClick={() => handlePlaceholderAction('Competitive intel')}
              >
                Competitive Intel
              </button>
              <button
                className="nav-item nav-button"
                onClick={() => handlePlaceholderAction('Reports')}
              >
                Reports
              </button>
              <Link to="/account/profile" className="nav-item">
                Account
              </Link>
            </nav>
            <div className="sidebar-footer">
              <div className="user-profile">
                <UserButton />
                <div className="user-info">
                  <span className="user-label">Signed in</span>
                </div>
              </div>
            </div>
          </aside>

          <main className="main-content">
            <header className="top-header">
              <div>
                <h1>Mission Control</h1>
                <p className="dashboard-subtitle">
                  Your strategic intelligence workspace.
                </p>
              </div>
              <div className="top-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handlePlaceholderAction('Export')}
                >
                  Export Brief
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handlePlaceholderAction('Launch analysis')}
                >
                  Launch Analysis
                </button>
              </div>
            </header>

            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Active Scenarios</span>
                <span className="stat-value">04</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Signals Tracked</span>
                <span className="stat-value">128</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Opportunities</span>
                <span className="stat-value">17</span>
              </div>
            </section>

            <section className="welcome-section">
              <h2>Quick Actions</h2>
              <p>Jump into the workflows you use most. These are placeholders for now.</p>
              <div className="quick-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handlePlaceholderAction('Run new scenario')}
                >
                  Run New Scenario
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handlePlaceholderAction('Invite collaborators')}
                >
                  Invite Collaborators
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handlePlaceholderAction('Review insights')}
                >
                  Review Insights
                </button>
              </div>
            </section>

            <section className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-dot"></span>
                  <div className="activity-details">
                    <span className="activity-text">
                      Placeholder report generated for Q3 market shift.
                    </span>
                    <span className="activity-time">2 hours ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <span className="activity-dot"></span>
                  <div className="activity-details">
                    <span className="activity-text">
                      New signal feed connected to competitor watchlist.
                    </span>
                    <span className="activity-time">Yesterday</span>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </SignedIn>

      <SignedOut>
        <div className="main-app">
          {/* Navigation */}
          <nav className="main-nav">
            <div className="main-nav-container">
              <div className="main-logo">
                <span className="main-logo-text">Strategy Cockpit</span>
              </div>
              <div className="main-nav-actions">
                <Link to="/auth/sign-in" className="main-signin-button">
                  Sign In
                </Link>
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="main-hero">
            <div className="main-hero-container">
              <h1 className="main-hero-title">Strategy Cockpit</h1>
              <p className="main-hero-tagline">AI-powered strategic analysis</p>

              <div className="main-hero-cta">
                <Link to="/auth/sign-in" className="main-cta-button">
                  Launch Analysis
                </Link>
              </div>
              <p className="main-hero-note">System online • Intelligence active</p>
            </div>
          </section>

          {/* Features Section */}
          <section className="main-features">
            <div className="main-features-container">
              <h2 className="main-features-title">Core Capabilities</h2>
              <div className="main-features-grid">
                <div className="main-feature-card">
                  <h3 className="main-feature-title">AI-Powered</h3>
                  <p className="main-feature-description">
                    Leverage cutting-edge AI to analyze your business strategy and identify opportunities.
                  </p>
                </div>
                <div className="main-feature-card">
                  <h3 className="main-feature-title">Data-Driven</h3>
                  <p className="main-feature-description">
                    Make informed decisions with comprehensive data analysis and visualizations.
                  </p>
                </div>
                <div className="main-feature-card">
                  <h3 className="main-feature-title">Fast & Efficient</h3>
                  <p className="main-feature-description">
                    Get instant results without lengthy manual analysis. Save time and resources.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="main-footer">
            <div className="main-footer-container">
              <p>&copy; 2025 Strategy Cockpit. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </SignedOut>
    </>
  );
}
