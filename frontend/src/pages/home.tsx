import {
  SignedIn,
  SignedOut,
  UserButton,
} from '@neondatabase/neon-js/auth/react/ui';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { getAuthToken } from '../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type Report = {
  id: number;
  title: string | null;
  planText: string;
  reportText: string;
  createdAt: string;
};

function DashboardView() {
  const [planText, setPlanText] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedReport = useMemo(() => {
    if (!reports.length) {
      return null;
    }
    if (selectedReportId) {
      return reports.find((report) => report.id === selectedReportId) || reports[0];
    }
    return reports[0];
  }, [reports, selectedReportId]);

  const handleDownloadReport = async () => {
    if (!selectedReport) {
      return;
    }

    setIsDownloading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('You need to sign in to download reports.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/${selectedReport.id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to download report.');
      }

      const title = String(selectedReport.title || `report-${selectedReport.id}`);
      const safeTitle =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || `report-${selectedReport.id}`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to download report.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const loadReports = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('You need to sign in to view reports.');
        }

        const response = await fetch(`${API_BASE_URL}/api/reports`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Unable to load report history.');
        }
        const data = await response.json();
        setReports(data.reports || []);
        if (data.reports?.length) {
          setSelectedReportId(data.reports[0].id);
        }
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : 'Unable to load report history.');
      }
    };

    loadReports();
  }, []);

  const handleCreateReport = async () => {
    if (!planText.trim()) {
      setStatusMessage('Add a business plan to generate a report.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('You need to sign in to create reports.');
      }

      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to generate report.');
      }

      const data = await response.json();
      const newReport = data.report as Report;
      setReports((prev) => [newReport, ...prev]);
      setSelectedReportId(newReport.id);
      setPlanText('');
      setStatusMessage('Report generated.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo-text">Cruxlens</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/" className="nav-item active">
            Dashboard
          </Link>
          <Link to="/account/profile" className="nav-item">
            Account
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <UserButton />
            <div className="user-info">
              <span className="user-label"></span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="dashboard-grid">
          <div className="dashboard-intro">
            <h2>Dashboard</h2>
            <p>Generate analysis reports from your business plans.</p>
          </div>
          <div className="dashboard-primary">
            <section className="report-compose">
              <h2>Create a new report</h2>
              <p>Paste a business plan and generate a strategy report.</p>
              <textarea
                className="report-textarea"
                placeholder="Paste your business plan here..."
                value={planText}
                onChange={(event) => setPlanText(event.target.value)}
              />
              <div className="report-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleCreateReport}
                  disabled={isLoading}
                >
                  {isLoading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
              {statusMessage && (
                <p className="report-status">{statusMessage}</p>
              )}
            </section>

            <section className="report-viewer">
              <div className="report-viewer-header">
                <h2>Report output</h2>
                <div className="report-viewer-actions">
                  {selectedReport ? (
                    <span className="report-meta">
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </span>
                  ) : (
                    <span className="report-meta">No reports yet</span>
                  )}
                  <button
                    className="btn btn-secondary report-download"
                    type="button"
                    onClick={handleDownloadReport}
                    disabled={!selectedReport || isDownloading}
                  >
                    {isDownloading ? 'Downloading…' : 'Download PDF'}
                  </button>
                </div>
              </div>
              {selectedReport ? (
                <>
                  <h3 className="report-title">
                    {selectedReport.title || 'Untitled report'}
                  </h3>
                  <div
                    className="report-output"
                    dangerouslySetInnerHTML={{ __html: selectedReport.reportText }}
                  />
                </>
              ) : (
                <p className="report-empty">
                  Your generated reports will appear here.
                </p>
              )}
            </section>
          </div>
          <aside className="history-panel" id="reports">
            <h3>Report history</h3>
            <div className="history-list">
              {reports.length ? (
                reports.map((report) => (
                  <button
                    key={report.id}
                    className={`history-item${
                      report.id === selectedReport?.id ? ' active' : ''
                    }`}
                    onClick={() => setSelectedReportId(report.id)}
                  >
                    <span className="history-title">
                      {report.title || 'Untitled report'}
                    </span>
                    <span className="history-time">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))
              ) : (
                <p className="history-empty">No reports yet.</p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export function Home() {
  return (
    <>
      <SignedIn>
        <DashboardView />
      </SignedIn>

      <SignedOut>
        <div className="landing">
          <header className="landing-header">
            <span className="landing-brand">Cruxlens</span>
            <Link to="/auth/sign-in" className="btn btn-primary">
              Join early access
            </Link>
          </header>

          <main className="landing-main">
            <section className="landing-hero">
              <p className="landing-eyebrow">Early Access — Limited Spots</p>
              <h1>Great strategies are not invented. They are recognized.</h1>
              <p className="landing-lead">
                Like chess, business success is a series of patterns. Our Pattern Recognition
                Engine™ maps your idea against proven strategic patterns — consultant-level
                thinking, at startup speed and price.
              </p>
              <div className="landing-hero-actions">
                <Link to="/auth/sign-in" className="btn btn-primary">
                  Join early access
                </Link>
                <div className="landing-hero-meta">
                  <span>No credit card required</span>
                  <span>Join 200+ strategists</span>
                </div>
              </div>
            </section>

            <section className="landing-section">
              <p className="landing-kicker">Strategy Patterns</p>
              <h2>The Three Questions That Matter</h2>
              <p className="landing-section-lead">
                We help founders answer the only questions that matter in strategy.
              </p>
              <div className="landing-grid">
                <article className="landing-card">
                  <h3>How will you create advantage?</h3>
                  <p>
                    Like a chess grandmaster sees the board, experienced strategists recognize
                    patterns. We give you that vision.
                  </p>
                </article>
                <article className="landing-card">
                  <h3>How will you be unique in the market?</h3>
                  <p>
                    Differentiation isn't about being different — it's about being meaningfully
                    different. Pattern recognition reveals what truly sets winners apart.
                  </p>
                </article>
                <article className="landing-card">
                  <h3>How will you sustain that advantage?</h3>
                  <p>
                    If the advantage cannot survive contact with reality, it is not strategy. We
                    stress-test your ideas against proven patterns.
                  </p>
                </article>
              </div>
            </section>

            <section className="landing-section">
              <p className="landing-kicker">Early Access Benefits</p>
              <div className="landing-grid">
                <article className="landing-card">
                  <h3>See the board like a grandmaster</h3>
                  <p>
                    Join founders and strategists who are learning to recognize the patterns that
                    drive success.
                  </p>
                </article>
                <article className="landing-card">
                  <h3>Startup speed, consultant depth</h3>
                  <p>
                    Strategic thinking at consultant level, delivered at startup speed. No more
                    waiting months for insights that should take hours.
                  </p>
                </article>
                <article className="landing-card">
                  <h3>Shape the Pattern Engine</h3>
                  <p>
                    Your feedback directly influences how patterns are recognized and applied. Early
                    users become co-creators of the engine.
                  </p>
                </article>
                <article className="landing-card">
                  <h3>Weekly pattern insights</h3>
                  <p>
                    Receive curated breakdowns of strategic patterns from real cases — the same
                    patterns that separate good strategies from great ones.
                  </p>
                </article>
              </div>
            </section>

            <section className="landing-section landing-emphasis">
              <p className="landing-kicker">Built by ex-consultants & founders</p>
              <h2>Pattern Recognition Engine™</h2>
              <p className="landing-section-lead">MVP launching Q1 2025</p>
            </section>

            <section className="landing-cta">
              <div>
                <h2>Ready to see the board like a grandmaster?</h2>
                <p>
                  Strategic thinking at consultant level, at startup speed and price. Join founders
                  who recognize the patterns others miss.
                </p>
              </div>
              <Link to="/auth/sign-in" className="btn btn-primary">
                Join early access
              </Link>
            </section>
          </main>

          <footer className="landing-footer">
            <div className="landing-footer-brand">
              <span className="landing-footer-mark">C</span>
              <span>Cruxlens</span>
            </div>
            <div className="landing-footer-meta">
              <span>© 2025 Cruxlens. All rights reserved.</span>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </footer>
        </div>
      </SignedOut>
    </>
  );
}
