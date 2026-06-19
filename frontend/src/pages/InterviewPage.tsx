import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitAnswer } from "../services/api";

export default function InterviewPage() {
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedQuestion = localStorage.getItem("current_question");

    if (savedQuestion) {
      setQuestion(savedQuestion);
    }
  }, []);

  async function handleSubmit() {
    const sessionId = localStorage.getItem("session_id");

    if (!sessionId) {
      setError("No active interview session found. Please start over.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await submitAnswer(sessionId, answer);

      if (data.followup_question) {
        setQuestion(data.followup_question);
        localStorage.setItem("current_question", data.followup_question);
        setAnswer("");

        return;
      }

      if (data.next_question) {
        setQuestion(data.next_question);
        localStorage.setItem("current_question", data.next_question);
        setAnswer("");

        return;
      }

      if (data.report) {
        localStorage.setItem("final_report", JSON.stringify(data.report));
        navigate("/report");
      }
    } catch (submissionError) {
      setError("Unable to submit answer. Please try again.");
      console.error("Interview submission failed:", submissionError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_right,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]" />
      <div className="absolute left-0 top-1/4 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:gap-10">
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Live interview
              </div>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Technical Interview
              </h1>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                Answer the question below and the evaluator will continue the
                interview with the same flow and scoring behavior.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Session</p>
                  <p className="mt-2 text-sm font-medium text-white">Active interview in progress</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">State</p>
                  <p className="mt-2 text-sm font-medium text-white">Adaptive follow-up enabled</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ["Review", "Read the prompt carefully before answering."],
                ["Depth", "Use specifics, tradeoffs, and examples."],
                ["Flow", "The next question updates automatically."],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                >
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-500/15 via-transparent to-indigo-500/15 blur-2xl" />
            <div className="relative flex min-h-full flex-col rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.6)] backdrop-blur-2xl sm:p-8 lg:p-10">
              {error ? (
                <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                      Interview prompt
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                      Question
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                    {loading ? "Evaluating" : "Ready"}
                  </div>
                </div>

                <p className="text-lg leading-8 text-slate-200 sm:text-xl">
                  {question || "Your interview question will appear here."}
                </p>
              </div>

              <div className="mt-6 grid flex-1 gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-200">Your answer</span>
                  <textarea
                    rows={10}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-56 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">
                    The next prompt updates automatically after submission.
                  </p>

                  <button
                    onClick={handleSubmit}
                    disabled={loading || !answer.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(37,99,235,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    {loading ? "Evaluating..." : "Submit Answer"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
