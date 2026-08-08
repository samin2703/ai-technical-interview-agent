import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SignedInBanner from "../components/SignedInBanner";

type ScoreKey =
  | "technical_accuracy"
  | "problem_solving"
  | "communication"
  | "edge_cases_reliability"
  | "engineering_quality";

type ReportData = {
  overall_score?: number;
  overall_recommendation?: string;
  readiness_level?: string;
  score_breakdown?: Partial<Record<ScoreKey, number>>;
  strengths?: string[];
  weaknesses?: string[];
  evidence_summary?: string;
  improvement_roadmap?: string[];
  suggested_followup_areas?: string[];
};

const scoreCategories: Array<{ key: ScoreKey; label: string }> = [
  { key: "technical_accuracy", label: "Technical Accuracy" },
  { key: "problem_solving", label: "Problem Solving" },
  { key: "communication", label: "Communication" },
  { key: "edge_cases_reliability", label: "Edge Cases & Reliability" },
  { key: "engineering_quality", label: "Engineering Quality" },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function formatScore(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function buildListMarkup(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return `<p class="muted">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function buildExportDocument({
  report,
  closingMessage,
  scoreBreakdown,
  strengths,
  weaknesses,
  roadmapItems,
  followUpAreas,
}: {
  report: ReportData;
  closingMessage: string | null;
  scoreBreakdown: Array<{ key: ScoreKey; label: string; value: number | undefined }>;
  strengths: string[];
  weaknesses: string[];
  roadmapItems: string[];
  followUpAreas: string[];
}) {
  const generatedAt = new Date().toLocaleString();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Recruiter Interview Report</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        line-height: 1.5;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #f8fafc;
        color: #0f172a;
      }

      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px 24px 48px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        margin-bottom: 24px;
      }

      .eyebrow {
        color: #0f766e;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        margin-top: 8px;
        font-size: 32px;
      }

      h2 {
        font-size: 18px;
        margin-bottom: 12px;
      }

      .subcopy {
        margin-top: 12px;
        color: #475569;
        max-width: 640px;
      }

      .stamp {
        color: #64748b;
        font-size: 13px;
        white-space: nowrap;
      }

      .summary-grid,
      .score-grid,
      .detail-grid {
        display: grid;
        gap: 16px;
      }

      .summary-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-bottom: 24px;
      }

      .score-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .detail-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .card {
        border: 1px solid #dbe4f0;
        border-radius: 8px;
        background: #ffffff;
        padding: 16px;
        break-inside: avoid;
      }

      .label {
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .value {
        margin-top: 8px;
        font-size: 24px;
        font-weight: 700;
      }

      .value.small {
        font-size: 18px;
      }

      section {
        margin-top: 24px;
      }

      ul {
        margin: 0;
        padding-left: 18px;
      }

      li + li {
        margin-top: 8px;
      }

      .muted {
        color: #64748b;
      }

      .pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        border: 1px solid #bae6fd;
        border-radius: 999px;
        padding: 6px 12px;
        background: #ecfeff;
        color: #155e75;
        font-size: 14px;
        font-weight: 600;
      }

      .closing-note {
        margin-top: 24px;
        border-left: 4px solid #38bdf8;
        padding: 12px 16px;
        background: #f8fafc;
        color: #334155;
      }

      @media print {
        body {
          background: #ffffff;
        }

        main {
          max-width: none;
          padding: 0;
        }
      }

      @media (max-width: 720px) {
        .header,
        .summary-grid,
        .score-grid,
        .detail-grid {
          grid-template-columns: 1fr;
        }

        .header {
          display: grid;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header class="header">
        <div>
          <div class="eyebrow">Recruiter-ready export</div>
          <h1>Interview Evaluation Report</h1>
          <p class="subcopy">
            Hiring recommendation, score breakdown, strengths, risks, and focused next steps for recruiter review.
          </p>
        </div>
        <div class="stamp">Generated ${escapeHtml(generatedAt)}</div>
      </header>

      <section class="summary-grid">
        <article class="card">
          <div class="label">Overall Score</div>
          <div class="value">${escapeHtml(
            report.overall_score === undefined ? "--" : `${formatScore(report.overall_score)} / 100`,
          )}</div>
        </article>
        <article class="card">
          <div class="label">Recommendation</div>
          <div class="value small">${escapeHtml(report.overall_recommendation || "Not available")}</div>
        </article>
        <article class="card">
          <div class="label">Readiness</div>
          <div class="value small">${escapeHtml(report.readiness_level || "Not available")}</div>
        </article>
      </section>

      <section>
        <h2>Score Breakdown</h2>
        <div class="score-grid">
          ${scoreBreakdown
            .map(
              ({ key, label, value }) => `
            <article class="card" data-key="${escapeHtml(key)}">
              <div class="label">${escapeHtml(label)}</div>
              <div class="value small">${escapeHtml(formatScore(value))}</div>
            </article>`,
            )
            .join("")}
        </div>
      </section>

      <section class="detail-grid">
        <article class="card">
          <h2>Strengths</h2>
          ${buildListMarkup(strengths, "No strengths were returned for this report.")}
        </article>
        <article class="card">
          <h2>Weaknesses</h2>
          ${buildListMarkup(weaknesses, "No weaknesses were returned for this report.")}
        </article>
      </section>

      <section class="detail-grid">
        <article class="card">
          <h2>Evidence Summary</h2>
          <p>${escapeHtml(report.evidence_summary || "No evidence summary was returned for this report.")}</p>
        </article>
        <article class="card">
          <h2>Improvement Roadmap</h2>
          ${buildListMarkup(roadmapItems, "No improvement roadmap was returned for this report.")}
        </article>
      </section>

      <section>
        <article class="card">
          <h2>Suggested Follow-up Areas</h2>
          ${
            followUpAreas.length > 0
              ? `<div class="pill-row">${followUpAreas
                  .map((item) => `<span class="pill">${escapeHtml(item)}</span>`)
                  .join("")}</div>`
              : '<p class="muted">No follow-up areas were returned for this report.</p>'
          }
        </article>
      </section>

      <p class="closing-note">${escapeHtml(
        closingMessage || "Thanks for the conversation. The interview is complete.",
      )}</p>
    </main>
  </body>
</html>`;
}

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [parseError, setParseError] = useState("");
  const [exportError, setExportError] = useState("");
  const closingMessage = localStorage.getItem("closing_message");

  useEffect(() => {
    const savedReport = localStorage.getItem("final_report");

    if (!savedReport) {
      return;
    }

    try {
      setReport(JSON.parse(savedReport));
    } catch (error) {
      console.error("Failed to parse saved report:", error);
      setParseError("Saved report data is invalid. Please start a new interview.");
    }
  }, []);

  const scoreBreakdown = useMemo(
    () =>
      scoreCategories.map(({ key, label }) => ({
        key,
        label,
        value: report?.score_breakdown?.[key],
      })),
    [report],
  );

  const strengths = normalizeList(report?.strengths);
  const weaknesses = normalizeList(report?.weaknesses);
  const roadmapItems = normalizeList(report?.improvement_roadmap);
  const followUpAreas = normalizeList(report?.suggested_followup_areas);
  const overallScore = typeof report?.overall_score === "number" ? report.overall_score : null;
  const scorePercentage = overallScore === null ? 0 : Math.max(0, Math.min(100, overallScore));
  const scoreAccent =
    scorePercentage >= 80
      ? "from-emerald-400 via-cyan-400 to-sky-400"
      : scorePercentage >= 60
        ? "from-amber-400 via-orange-400 to-rose-400"
        : "from-rose-400 via-pink-400 to-fuchsia-400";
  const exportPayload = report
    ? buildExportDocument({
        report,
        closingMessage,
        scoreBreakdown,
        strengths,
        weaknesses,
        roadmapItems,
        followUpAreas,
      })
    : "";

  function handleExportPdf() {
    setExportError("");
    const frame = document.createElement("iframe");

    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.visibility = "hidden";

    frame.onload = () => {
      const printWindow = frame.contentWindow;

      if (!printWindow) {
        setExportError("Unable to open the print preview for PDF export.");
        frame.remove();
        return;
      }

      printWindow.focus();
      printWindow.print();

      window.setTimeout(() => {
        frame.remove();
      }, 1000);
    };

    document.body.append(frame);
    frame.srcdoc = exportPayload;
  }

  function handleDownloadRecruiterBrief() {
    setExportError("");

    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`recruiter-interview-report-${stamp}.html`, exportPayload, "text/html;charset=utf-8");
  }

  if (parseError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center shadow-[0_30px_90px_rgba(2,6,23,0.55)] backdrop-blur-2xl sm:px-10 sm:py-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">{parseError}</h1>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 shadow-[0_30px_90px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
          <h1 className="text-2xl font-semibold">No Report Found</h1>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]" />
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="absolute right-6 top-6 z-20 w-[min(92vw,22rem)]">
        <SignedInBanner compact />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.6)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                Final assessment
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Final Report
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  A hiring summary with recommendation, score breakdown, strengths, risks, and a focused improvement path.
                </p>
                {closingMessage ? (
                  <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm leading-6 text-slate-200">
                    {closingMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                onClick={handleExportPdf}
              >
                Export PDF
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                onClick={handleDownloadRecruiterBrief}
              >
                Download Recruiter Brief
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(37,99,235,0.45)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                onClick={() => {
                  localStorage.removeItem("session_id");
                  localStorage.removeItem("current_question");
                  localStorage.removeItem("final_report");
                  navigate("/");
                }}
              >
                Start New Interview
              </button>
            </div>
          </div>

          {exportError ? (
            <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {exportError}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <section className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Recommendation</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {report.overall_recommendation || "Not available"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Readiness</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {report.readiness_level || "Not available"}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Overall Score</p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <p className="text-4xl font-semibold text-white">
                      {overallScore === null ? "--" : `${overallScore} / 100`}
                    </p>
                    <div className="h-3 w-28 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${scoreAccent}`}
                        style={{ width: `${scorePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Score Breakdown</h2>
                    <p className="mt-1 text-sm text-slate-400">Normalized across the main evaluation dimensions.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                    Structured summary
                  </span>
                </div>

                <div className="space-y-4">
                  {scoreBreakdown.map(({ key, label, value }) => {
                    const valuePercentage = typeof value === "number" ? Math.max(0, Math.min(10, value)) * 10 : 0;

                    return (
                      <div key={key} className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-medium text-slate-100">{label}</p>
                          <p className="text-sm font-semibold text-white">{formatScore(value)}</p>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400"
                            style={{ width: `${valuePercentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:p-6">
                  <h2 className="text-xl font-semibold text-white">Strengths</h2>
                  {strengths.length > 0 ? (
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                      {strengths.map((item, index) => (
                        <li key={`${item}-${index}`} className="rounded-xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-3 text-slate-100">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-slate-400">No strengths were returned for this report.</p>
                  )}
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:p-6">
                  <h2 className="text-xl font-semibold text-white">Weaknesses</h2>
                  {weaknesses.length > 0 ? (
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                      {weaknesses.map((item, index) => (
                        <li key={`${item}-${index}`} className="rounded-xl border border-amber-400/15 bg-amber-400/8 px-4 py-3 text-slate-100">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-slate-400">No weaknesses were returned for this report.</p>
                  )}
                </div>
              </div>
            </section>

            <aside className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
                <h2 className="text-xl font-semibold text-white">Evidence Summary</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {report.evidence_summary || "No evidence summary was returned for this report."}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
                <h2 className="text-xl font-semibold text-white">Improvement Roadmap</h2>
                {roadmapItems.length > 0 ? (
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    {roadmapItems.map((item, index) => (
                      <li key={`${item}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-100">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-slate-400">No improvement roadmap was returned for this report.</p>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
                <h2 className="text-xl font-semibold text-white">Suggested Follow-up Areas</h2>
                {followUpAreas.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {followUpAreas.map((item, index) => (
                      <span
                        key={`${item}-${index}`}
                        className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-slate-400">No follow-up areas were returned for this report.</p>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
                <h2 className="text-xl font-semibold text-white">Closing Note</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {closingMessage || "Thanks for the conversation. The interview is complete."}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
