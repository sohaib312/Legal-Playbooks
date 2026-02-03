"use client";

import { useState } from "react";

// Types
interface RiskItem {
  clause: string;
  issue: string;
  fix: string;
  severity: "high" | "medium" | "low";
}

interface RiskReport {
  risks: RiskItem[];
  summary: string;
}

// API Configuration - remove trailing slash to prevent double-slash URLs
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

// Severity badge colors
const severityColors = {
  high: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  medium: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  low: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
};

export default function Home() {
  const [ndaText, setNdaText] = useState("");
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeNDA = async () => {
    if (!ndaText.trim()) {
      setError("Please paste your NDA text to analyze.");
      return;
    }

    if (ndaText.trim().length < 50) {
      setError("NDA text is too short. Please paste the complete document.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nda_text: ndaText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Analysis failed (${response.status})`);
      }

      const data: RiskReport = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze NDA. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setNdaText("");
    setReport(null);
    setError(null);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🛡️</span>
            <h1 style={styles.logoText}>NDA Guardrail</h1>
          </div>
          <p style={styles.tagline}>AI-Powered Legal Risk Analysis</p>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.grid}>
          {/* Left Column - Input */}
          <section style={styles.inputSection}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>📄 Paste Your NDA</h2>
              <span style={styles.charCount}>{ndaText.length.toLocaleString()} characters</span>
            </div>
            <textarea
              style={styles.textarea}
              placeholder="Paste the full text of your Non-Disclosure Agreement here...

Example clauses to look out for:
• Confidentiality definitions
• Term and termination
• Non-solicitation provisions
• Indemnification clauses
• Governing law and jurisdiction"
              value={ndaText}
              onChange={(e) => setNdaText(e.target.value)}
              disabled={loading}
            />
            <div style={styles.buttonGroup}>
              <button
                style={{
                  ...styles.primaryButton,
                  ...(loading ? styles.buttonDisabled : {}),
                }}
                onClick={analyzeNDA}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span style={styles.spinner} />
                    Analyzing...
                  </>
                ) : (
                  <>🔍 Check Risk</>
                )}
              </button>
              <button
                style={styles.secondaryButton}
                onClick={clearAll}
                disabled={loading}
              >
                Clear
              </button>
            </div>
          </section>

          {/* Right Column - Results */}
          <section style={styles.resultsSection}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>📊 Risk Report</h2>
              {report && (
                <span style={styles.riskCount}>
                  {report.risks.length} {report.risks.length === 1 ? "issue" : "issues"} found
                </span>
              )}
            </div>

            <div style={styles.resultsContent}>
              {/* Error State */}
              {error && (
                <div style={styles.errorBox}>
                  <span style={styles.errorIcon}>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div style={styles.loadingBox}>
                  <div style={styles.loadingSpinner} />
                  <p style={styles.loadingText}>Analyzing your NDA against market standards...</p>
                  <p style={styles.loadingSubtext}>This may take 10-30 seconds</p>
                </div>
              )}

              {/* Empty State */}
              {!loading && !report && !error && (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🔒</span>
                  <p style={styles.emptyTitle}>No analysis yet</p>
                  <p style={styles.emptyText}>
                    Paste your NDA text and click &quot;Check Risk&quot; to identify potential issues
                    and get suggested fixes.
                  </p>
                </div>
              )}

              {/* Results */}
              {report && (
                <>
                  {/* Summary */}
                  <div style={styles.summaryBox}>
                    <h3 style={styles.summaryTitle}>Summary</h3>
                    <p style={styles.summaryText}>{report.summary}</p>
                  </div>

                  {/* Risk List */}
                  {report.risks.length > 0 ? (
                    <div style={styles.riskList}>
                      {report.risks.map((risk, index) => (
                        <div key={index} style={styles.riskCard}>
                          <div style={styles.riskHeader}>
                            <span
                              style={{
                                ...styles.severityBadge,
                                backgroundColor: severityColors[risk.severity].bg,
                                color: severityColors[risk.severity].text,
                                borderColor: severityColors[risk.severity].border,
                              }}
                            >
                              {risk.severity.toUpperCase()}
                            </span>
                            <span style={styles.riskNumber}>Issue #{index + 1}</span>
                          </div>

                          <div style={styles.riskBody}>
                            <div style={styles.riskSection}>
                              <h4 style={styles.riskLabel}>🚩 Problematic Clause</h4>
                              <p style={styles.clauseText}>&quot;{risk.clause}&quot;</p>
                            </div>

                            <div style={styles.riskSection}>
                              <h4 style={styles.riskLabel}>⚠️ Issue</h4>
                              <p style={styles.issueText}>{risk.issue}</p>
                            </div>

                            <div style={styles.riskSection}>
                              <h4 style={styles.riskLabel}>✅ Suggested Fix</h4>
                              <p style={styles.fixText}>{risk.fix}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.noRisksBox}>
                      <span style={styles.noRisksIcon}>✅</span>
                      <p style={styles.noRisksText}>
                        No significant risks identified. This NDA appears to align with market
                        standards.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>
          NDA Guardrail • AI-powered analysis for informational purposes only • Not legal advice
        </p>
      </footer>
    </div>
  );
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
  },
  header: {
    padding: "24px 32px",
    borderBottom: "1px solid #2a2a2a",
    background: "rgba(20, 20, 20, 0.8)",
    backdropFilter: "blur(10px)",
  },
  headerContent: {
    maxWidth: "1400px",
    margin: "0 auto",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIcon: {
    fontSize: "32px",
  },
  logoText: {
    fontSize: "24px",
    fontWeight: 700,
    background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  tagline: {
    color: "#737373",
    marginTop: "4px",
    marginLeft: "44px",
    fontSize: "14px",
  },
  main: {
    flex: 1,
    padding: "32px",
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "32px",
    height: "calc(100vh - 200px)",
    minHeight: "600px",
  },
  inputSection: {
    display: "flex",
    flexDirection: "column",
    background: "#141414",
    borderRadius: "16px",
    border: "1px solid #2a2a2a",
    padding: "24px",
  },
  resultsSection: {
    display: "flex",
    flexDirection: "column",
    background: "#141414",
    borderRadius: "16px",
    border: "1px solid #2a2a2a",
    padding: "24px",
    overflow: "hidden",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 600,
  },
  charCount: {
    fontSize: "13px",
    color: "#737373",
  },
  riskCount: {
    fontSize: "13px",
    color: "#f59e0b",
    fontWeight: 500,
  },
  textarea: {
    flex: 1,
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    background: "#0a0a0a",
    color: "#ededed",
    fontSize: "14px",
    lineHeight: 1.6,
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    marginTop: "16px",
  },
  primaryButton: {
    flex: 1,
    padding: "14px 24px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(90deg, #3b82f6, #6366f1)",
    color: "white",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  secondaryButton: {
    padding: "14px 24px",
    borderRadius: "10px",
    border: "1px solid #2a2a2a",
    background: "transparent",
    color: "#737373",
    fontSize: "15px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "border-color 0.2s, color 0.2s",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  resultsContent: {
    flex: 1,
    overflowY: "auto",
    paddingRight: "8px",
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
  },
  errorIcon: {
    fontSize: "20px",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "16px",
  },
  loadingSpinner: {
    width: "48px",
    height: "48px",
    border: "3px solid #2a2a2a",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    color: "#ededed",
    fontSize: "16px",
  },
  loadingSubtext: {
    color: "#737373",
    fontSize: "14px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    textAlign: "center",
    padding: "32px",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#ededed",
  },
  emptyText: {
    color: "#737373",
    fontSize: "14px",
    lineHeight: 1.6,
    maxWidth: "300px",
  },
  summaryBox: {
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    marginBottom: "20px",
  },
  summaryTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#60a5fa",
    marginBottom: "8px",
  },
  summaryText: {
    color: "#bfdbfe",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  riskList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  riskCard: {
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    background: "#0a0a0a",
    overflow: "hidden",
  },
  riskHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#141414",
    borderBottom: "1px solid #2a2a2a",
  },
  severityBadge: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
    border: "1px solid",
  },
  riskNumber: {
    fontSize: "12px",
    color: "#737373",
  },
  riskBody: {
    padding: "16px",
  },
  riskSection: {
    marginBottom: "16px",
  },
  riskLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#737373",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  clauseText: {
    fontSize: "13px",
    color: "#fca5a5",
    fontStyle: "italic",
    lineHeight: 1.6,
    padding: "10px",
    background: "rgba(239, 68, 68, 0.1)",
    borderRadius: "8px",
    borderLeft: "3px solid #ef4444",
  },
  issueText: {
    fontSize: "14px",
    color: "#fde68a",
    lineHeight: 1.6,
  },
  fixText: {
    fontSize: "14px",
    color: "#86efac",
    lineHeight: 1.6,
    padding: "10px",
    background: "rgba(34, 197, 94, 0.1)",
    borderRadius: "8px",
    borderLeft: "3px solid #22c55e",
  },
  noRisksBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px",
    textAlign: "center",
    background: "rgba(34, 197, 94, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(34, 197, 94, 0.3)",
  },
  noRisksIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  noRisksText: {
    color: "#86efac",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  footer: {
    padding: "16px 32px",
    borderTop: "1px solid #2a2a2a",
    textAlign: "center",
    color: "#525252",
    fontSize: "13px",
  },
};
