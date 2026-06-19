import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ReportPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [parseError, setParseError] = useState("");

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

      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.6)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Final assessment
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Final Report
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  A professional hiring summary with recommendations, scoring,
                  strengths, risks, and follow-up guidance.
                </p>
              </div>
            </div>

            <button
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

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Recommendation</p>
                  <p className="mt-3 text-lg font-semibold text-white">{report.overall_recommendation}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Readiness</p>
                  <p className="mt-3 text-lg font-semibold text-white">{report.readiness_level}</p>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Overall Score</p>
                  <p className="mt-3 text-4xl font-semibold text-white">
                    {report.overall_score} / 100
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white">Score Breakdown</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                    Structured summary
                  </span>
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-6 text-slate-200">
                  {JSON.stringify(report.score_breakdown, null, 2)}
                </pre>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:p-6">
                  <h2 className="text-xl font-semibold text-white">Strengths</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    {report.strengths?.map((item: string, index: number) => (
                      <li key={index} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 sm:p-6">
                  <h2 className="text-xl font-semibold text-white">Weaknesses</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    {report.weaknesses?.map((item: string, index: number) => (
                      <li key={index} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <aside className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
                <h2 className="text-xl font-semibold text-white">Evidence Summary</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {report.evidence_summary}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
                <h2 className="text-xl font-semibold text-white">Improvement Roadmap</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  {report.improvement_roadmap?.map((item: string, index: number) => (
                    <li key={index} className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-6">
                <h2 className="text-xl font-semibold text-white">Suggested Follow-up Areas</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  {report.suggested_followup_areas?.map((item: string, index: number) => (
                    <li key={index} className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
