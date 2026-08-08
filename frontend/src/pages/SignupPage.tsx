import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../services/api";
import { hasAuthSession, setAuthSession } from "../services/auth";

export default function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasAuthSession()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  async function handleSignup() {
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await register(fullName, email, password);

      if (!data.access_token) {
        setError("Account created. Check your email to confirm it, then sign in.");
        navigate("/login", { replace: true });
        return;
      }

      setAuthSession({
        provider: "supabase",
        accessToken: data.access_token,
        user: data.user,
      });
      localStorage.removeItem("session_id");
      localStorage.removeItem("current_question");
      localStorage.removeItem("final_report");

      navigate("/", { replace: true });
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,1))]" />
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_0.92fr] lg:gap-14">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-cyan-100 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
              Create your account
            </div>

            <div className="max-w-3xl space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                Sign up for the AI interviewing workspace.
              </h1>

              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Create a new account to access the protected interview workflow, evaluation screens, and reports.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Immediate access", "Your account is signed in as soon as it is created."],
                ["Persistent storage", "New users are stored in your Supabase auth project."],
                ["Protected workspace", "Signup unlocks the full interview flow."],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                >
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
                  <p className="text-sm font-medium text-cyan-100/90">Registration</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Create account</h2>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  New user
                </div>
              </div>

              <div className="space-y-4">
                {error ? (
                  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Full name</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your name"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Email</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Password</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Confirm password</span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                  />
                </label>

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(37,99,235,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>

                <p className="text-sm leading-6 text-slate-300">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-cyan-200 underline decoration-cyan-400/40 underline-offset-4">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}