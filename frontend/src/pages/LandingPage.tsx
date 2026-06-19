import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (


    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,1))]" />
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-100 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
              AI Hiring Platform
            </div>

            <div className="max-w-3xl space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                Technical interviewing reimagined for modern hiring teams.
              </h1>

              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Conduct structured technical interviews, evaluate candidate
                performance, generate adaptive follow-up questions, and produce
                evidence-based hiring reports.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate("/setup")}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(37,99,235,0.45)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Start Interview
              </button>

              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 backdrop-blur-xl">
                Structured interviews, scorecards, and hiring-ready reports.
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Adaptive prompts", "Follow-up questions based on each answer."],
                ["Evidence-driven", "Capture strengths, risks, and decision notes."],
                ["Hiring dashboard", "Designed for modern assessment workflows."],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                >
                  <div className="mb-3 h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 ring-1 ring-white/10" />
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                    {title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-300">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-transparent to-indigo-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.6)] backdrop-blur-2xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-100/90">Interview Ops</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Hiring platform overview
                  </h2>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Live
                </div>
              </div>

              <div className="space-y-4">
                {[
                  ["Role coverage", "AI Engineer", "98%"],
                  ["Interview depth", "Senior-level prompts", "Adaptive"],
                  ["Decision support", "Scorecards & reports", "Ready"],
                ].map(([label, value, badge]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">{label}</p>
                        <p className="mt-1 text-base font-medium text-white">{value}</p>
                      </div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
                        {badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <p className="text-sm text-cyan-100/80">Assessment quality</p>
                  <p className="mt-2 text-3xl font-semibold text-white">A+</p>
                  <p className="mt-1 text-sm text-slate-300">Consistent, structured evaluation</p>
                </div>
                <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4">
                  <p className="text-sm text-indigo-100/80">Hiring workflow</p>
                  <p className="mt-2 text-3xl font-semibold text-white">Fast</p>
                  <p className="mt-1 text-sm text-slate-300">From setup to report in one flow</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
