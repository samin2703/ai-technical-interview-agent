import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { startInterview } from "../services/api";

export default function SetupPage() {
  const [role, setRole] = useState("AI Engineer");
  const [level, setLevel] = useState("Junior");
  const [techStack, setTechStack] = useState("");
  const [interviewType, setInterviewType] = useState("Technical");

  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]" />
      <div className="absolute left-10 top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          <section className="flex items-center">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-100 backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
                Interview setup
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Configure a structured interview in seconds.
                </h1>
                <p className="max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                  Choose a role, seniority, and interview style to launch the
                  same evaluation flow with a cleaner, more premium experience.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                  <p className="text-sm text-slate-400">Assessment mode</p>
                  <p className="mt-2 text-lg font-semibold text-white">Technical, system design, or mixed</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                  <p className="text-sm text-slate-400">Target profile</p>
                  <p className="mt-2 text-lg font-semibold text-white">AI, frontend, backend, or full stack</p>
                </div>
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-500/15 via-transparent to-indigo-500/15 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.6)] backdrop-blur-2xl sm:p-8 lg:p-10">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-100/80">
                    Setup panel
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Interview Setup
                  </h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-xl">
                  4-step configuration
                </div>
              </div>

              <div className="grid gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">Role</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option>AI Engineer</option>
                    <option>Frontend Engineer</option>
                    <option>Backend Engineer</option>
                    <option>Full Stack Engineer</option>
                    <option>Data Analyst</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">Level</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option>Junior</option>
                    <option>Mid</option>
                    <option>Senior</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">Tech Stack</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    type="text"
                    placeholder="React, FastAPI, Python..."
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">Interview Type</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                  >
                    <option>Technical</option>
                    <option>System Design</option>
                    <option>Mixed</option>
                  </select>
                </label>

                <button
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(37,99,235,0.45)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                  onClick={async () => {
                    const data = await startInterview(role, level);

                    console.log(data);

                    localStorage.setItem("session_id", data.session_id);
                    localStorage.setItem("current_question", data.question);

                    navigate("/interview");
                  }}
                >
                  Start Interview
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}