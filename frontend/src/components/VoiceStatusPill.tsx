import type { VoiceStatus } from "../services/voice";

const statusConfig: Record<
  VoiceStatus,
  {
    label: string;
    className: string;
  }
> = {
  idle: {
    label: "Ready",
    className: "border-white/10 bg-white/5 text-slate-200",
  },
  listening: {
    label: "Listening",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  },
  thinking: {
    label: "Thinking",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  },
  speaking: {
    label: "Speaking",
    className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  },
};

type VoiceStatusPillProps = {
  status: VoiceStatus;
};

export default function VoiceStatusPill({ status }: VoiceStatusPillProps) {
  const config = statusConfig[status];

  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </div>
  );
}
