import { useState } from 'react'
import './App.css'

function App() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Email submitted:', email)
    alert('Thank you for your interest! We\'ll be in touch soon.')
    setEmail('')
  }

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-text">Strategy Cockpit</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <h1 className="hero-title">Strategy Cockpit</h1>
          <p className="hero-tagline">AI-powered strategic analysis</p>
        
          <div className="hero-cta">
            <form onSubmit={handleSubmit} className="email-form">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="email-input"
                required
              />
              <button type="submit" className="cta-button">
                Get Started
              </button>
            </form>
          </div>
          <p className="hero-note">Free trial • No credit card required</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-container">
          <h2 className="features-title">Why Strategy Cockpit?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3 className="feature-title">AI-Powered</h3>
              <p className="feature-description">
                Leverage cutting-edge AI to analyze your business strategy and identify opportunities.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="feature-title">Data-Driven</h3>
              <p className="feature-description">
                Make informed decisions with comprehensive data analysis and visualizations.
              </p>
            </div>
            <div className="feature-card">
              <h3 className="feature-title">Fast & Efficient</h3>
              <p className="feature-description">
                Get instant results without lengthy manual analysis. Save time and resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <p>&copy; 2025 Strategy Cockpit. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
