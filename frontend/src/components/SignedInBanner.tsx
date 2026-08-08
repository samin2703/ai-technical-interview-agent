import { useNavigate } from "react-router-dom";

import { logout } from "../services/api";
import { clearAuthSession, getAuthDisplayName, getAuthProvider, getAuthUser } from "../services/auth";

type SignedInBannerProps = {
  compact?: boolean;
};

export default function SignedInBanner({ compact = false }: SignedInBannerProps) {
  const navigate = useNavigate();
  const user = getAuthUser();
  const displayName = getAuthDisplayName();
  const provider = getAuthProvider();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Clear local session even if the server token is already gone.
    } finally {
      clearAuthSession();
      localStorage.removeItem("session_id");
      localStorage.removeItem("current_question");
      localStorage.removeItem("final_report");
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.28)] backdrop-blur-xl ${compact ? "text-xs" : "text-sm"}`}>
      <div className="min-w-0">
        <p className="font-semibold text-white">{displayName}</p>
        <p className="truncate text-slate-300">{user?.email ?? "Signed in"}{provider ? ` · ${provider}` : ""}</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="shrink-0 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 font-medium text-slate-100 transition hover:border-cyan-400/40 hover:bg-slate-950"
      >
        Logout
      </button>
    </div>
  );
}