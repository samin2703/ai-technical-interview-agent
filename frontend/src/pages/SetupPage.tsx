import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SignedInBanner from "../components/SignedInBanner";
import { getElevenLabsVoices, getVoiceStatus, startInterview } from "../services/api";
import {
  type ElevenLabsVoice,
  getAvailableVoices,
  getVoicePreferences,
  listAudioInputDevices,
  requestMicrophoneAccess,
  saveVoicePreferences,
  waitForVoices,
} from "../services/voice";

export default function SetupPage() {
  const [role, setRole] = useState("AI Engineer");
  const [level, setLevel] = useState("Junior");
  const [techStack, setTechStack] = useState("");
  const [interviewType, setInterviewType] = useState("Technical");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [voicePreferences, setVoicePreferences] = useState(() => getVoicePreferences());
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceCatalogError, setVoiceCatalogError] = useState("");
  const [elevenLabsConfigured, setElevenLabsConfigured] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function loadVoiceOptions() {
      const availableBrowserVoices = await waitForVoices();

      if (!cancelled) {
        setVoices(availableBrowserVoices.length > 0 ? availableBrowserVoices : getAvailableVoices());
      }

      try {
        const status = await getVoiceStatus();

        if (cancelled) {
          return;
        }

        setElevenLabsConfigured(status.configured);

        if (!status.configured) {
          if (voicePreferences.provider === "elevenlabs") {
            updateVoicePreferences({
              ...voicePreferences,
              provider: "browser",
              elevenLabsVoiceId: "",
            });
          }

          return;
        }

        const voiceResponse = await getElevenLabsVoices();

        if (cancelled) {
          return;
        }

        setElevenLabsVoices(voiceResponse.voices);

        const resolvedVoiceId =
          voicePreferences.elevenLabsVoiceId ||
          voiceResponse.default_voice_id ||
          voiceResponse.voices[0]?.voice_id ||
          "";

        const nextProvider =
          voicePreferences.provider === "browser" && voicePreferences.voiceName
            ? "browser"
            : "elevenlabs";

        if (
          nextProvider !== voicePreferences.provider ||
          resolvedVoiceId !== voicePreferences.elevenLabsVoiceId
        ) {
          updateVoicePreferences({
            ...voicePreferences,
            provider: nextProvider,
            elevenLabsVoiceId: resolvedVoiceId,
          });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setVoiceCatalogError(error instanceof Error ? error.message : "Unable to load ElevenLabs voices.");
        setElevenLabsConfigured(false);

        if (voicePreferences.provider === "elevenlabs") {
          updateVoicePreferences({
            ...voicePreferences,
            provider: "browser",
            elevenLabsVoiceId: "",
          });
        }
      }
    }

    void loadVoiceOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleMicrophoneSetup() {
    setVoiceLoading(true);
    setVoiceMessage("");

    try {
      const stream = await requestMicrophoneAccess(voicePreferences.inputDeviceId || undefined);
      stream.getTracks().forEach((track) => track.stop());

      const devices = await listAudioInputDevices();
      const availableVoices = await waitForVoices();
      setAudioDevices(devices);
      setVoices(availableVoices.length > 0 ? availableVoices : getAvailableVoices());

      if (!voicePreferences.inputDeviceId && devices[0]?.deviceId) {
        const updatedPreferences = {
          ...voicePreferences,
          inputDeviceId: devices[0].deviceId,
        };

        setVoicePreferences(updatedPreferences);
        saveVoicePreferences(updatedPreferences);
      } else {
        saveVoicePreferences(voicePreferences);
      }

      if (!voicePreferences.voiceName && availableVoices[0]?.name) {
        const updatedPreferences = {
          ...voicePreferences,
          voiceName: availableVoices[0].name,
        };

        setVoicePreferences(updatedPreferences);
        saveVoicePreferences(updatedPreferences);
      }

      setVoiceMessage("Microphone ready. Voice mode can be used during the interview.");
    } catch (error) {
      console.error("Microphone setup failed:", error);
      setVoiceMessage(error instanceof Error ? error.message : "Microphone access was blocked or is unavailable in this browser.");
    } finally {
      setVoiceLoading(false);
    }
  }

  function updateVoicePreferences(nextPreferences: typeof voicePreferences) {
    setVoicePreferences(nextPreferences);
    saveVoicePreferences(nextPreferences);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]" />
      <div className="absolute left-10 top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="absolute right-6 top-6 z-20 w-[min(92vw,22rem)]">
        <SignedInBanner compact />
      </div>

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

                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-100">Voice Interview Controls</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Enable microphone access, pick an input device, and auto-play spoken questions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleMicrophoneSetup}
                      disabled={voiceLoading}
                      className="inline-flex items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {voiceLoading ? "Checking..." : "Enable Mic"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-medium text-slate-200">Voice Provider</span>
                      <select
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                        value={voicePreferences.provider}
                        onChange={(e) => {
                          const provider = e.target.value === "elevenlabs" ? "elevenlabs" : "browser";
                          const nextVoiceId =
                            provider === "elevenlabs"
                              ? voicePreferences.elevenLabsVoiceId || elevenLabsVoices[0]?.voice_id || ""
                              : voicePreferences.elevenLabsVoiceId;

                          updateVoicePreferences({
                            ...voicePreferences,
                            provider,
                            elevenLabsVoiceId: nextVoiceId,
                          });
                        }}
                      >
                        <option value="browser">Browser Voice</option>
                        {elevenLabsConfigured ? (
                          <option value="elevenlabs">ElevenLabs Voice</option>
                        ) : null}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-200">Input Device</span>
                      <select
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                        value={voicePreferences.inputDeviceId}
                        onChange={(e) => {
                          updateVoicePreferences({
                            ...voicePreferences,
                            inputDeviceId: e.target.value,
                          });
                        }}
                      >
                        <option value="">Default microphone</option>
                        {audioDevices.map((device, index) => (
                          <option key={device.deviceId || `${device.kind}-${index}`} value={device.deviceId}>
                            {device.label || `Microphone ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-200">Question Voice</span>
                      {voicePreferences.provider === "elevenlabs" ? (
                        <select
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                          value={voicePreferences.elevenLabsVoiceId}
                          onChange={(e) => {
                            updateVoicePreferences({
                              ...voicePreferences,
                              elevenLabsVoiceId: e.target.value,
                            });
                          }}
                        >
                          <option value="">Select an ElevenLabs voice</option>
                          {elevenLabsVoices.map((voice) => (
                            <option key={voice.voice_id} value={voice.voice_id}>
                              {voice.name}{voice.category ? ` - ${voice.category}` : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                          value={voicePreferences.voiceName}
                          onChange={(e) => {
                            updateVoicePreferences({
                              ...voicePreferences,
                              voiceName: e.target.value,
                            });
                          }}
                        >
                          <option value="">Default voice</option>
                          {voices.map((voice) => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-medium text-slate-200">Speech Rate</span>
                      <input
                        className="w-full accent-cyan-400"
                        type="range"
                        min="0.8"
                        max="1.2"
                        step="0.05"
                        value={voicePreferences.speechRate}
                        onChange={(e) => {
                          updateVoicePreferences({
                            ...voicePreferences,
                            speechRate: Number(e.target.value),
                          });
                        }}
                      />
                      <p className="text-xs text-slate-400">{voicePreferences.speechRate.toFixed(2)}x playback</p>
                    </label>
                  </div>

                  <label className="mt-4 flex items-center gap-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={voicePreferences.autoSpeakQuestions}
                      onChange={(e) => {
                        updateVoicePreferences({
                          ...voicePreferences,
                          autoSpeakQuestions: e.target.checked,
                        });
                      }}
                    />
                    Automatically speak each question out loud
                  </label>

                  {voiceMessage ? (
                    <p className="mt-3 text-sm text-cyan-100">{voiceMessage}</p>
                  ) : null}

                  <p className="mt-3 text-sm text-slate-400">
                    {voicePreferences.provider === "elevenlabs"
                      ? "ElevenLabs will handle realistic speech playback and answer transcription through the backend proxy."
                      : "Browser speech APIs will handle playback and live transcription when supported."}
                  </p>

                  {voiceCatalogError ? (
                    <p className="mt-2 text-sm text-amber-100">{voiceCatalogError}</p>
                  ) : null}
                </div>

                <button
                  disabled={startLoading}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(37,99,235,0.45)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                  onClick={async () => {
                    setStartError("");
                    setStartLoading(true);

                    try {
                      if (voicePreferences.provider === "elevenlabs" && !voicePreferences.elevenLabsVoiceId) {
                        throw new Error("Select an ElevenLabs voice before starting the interview.");
                      }

                      const data = await startInterview(role, level);

                      if (!data?.session_id) {
                        throw new Error("The interview session could not be created.");
                      }

                      const questionText = data.question || data.message;

                      if (!questionText) {
                        throw new Error("The interview question was not returned by the server.");
                      }

                      localStorage.setItem("session_id", data.session_id);
                      localStorage.setItem("current_question", questionText);
                      localStorage.setItem("interview_stage", data.stage || "warmup");
                      if (data.opening_message) {
                        localStorage.setItem("opening_message", data.opening_message);
                      }
                      localStorage.removeItem("closing_message");
                      navigate("/interview");
                    } catch (error) {
                      console.error("Unable to start interview:", error);
                      setStartError(error instanceof Error ? error.message : "Unable to start interview.");
                    } finally {
                      setStartLoading(false);
                    }
                  }}
                >
                  {startLoading ? "Starting..." : "Start Interview"}
                </button>

                {startError ? (
                  <p className="text-sm text-red-200">{startError}</p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
