import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SignedInBanner from "../components/SignedInBanner";
import VoiceStatusPill from "../components/VoiceStatusPill";
import {
  sendConversationMessage,
  submitAnswer,
  synthesizeSpeech,
  transcribeSpeech,
} from "../services/api";
import {
  browserSupportsMediaRecorder,
  browserSupportsSpeechRecognition,
  browserSupportsSpeechSynthesis,
  createSpeechRecognition,
  getAvailableVoices,
  getVoicePreferences,
  requestMicrophoneAccess,
  waitForVoices,
  type VoiceStatus,
} from "../services/voice";

type Stage = "warmup" | "technical";

export default function InterviewPage() {
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [stage, setStage] = useState<Stage>("warmup");

  const voicePreferences = getVoicePreferences();
  const usingElevenLabs = voicePreferences.provider === "elevenlabs";

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef("audio/webm");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const isListeningRef = useRef(false);
  const answerRef = useRef("");
  const questionRef = useRef("");
  const queuedNarrationTimerRef = useRef<number | null>(null);
  const narrationRunIdRef = useRef(0);

  const detachAudioHandlers = useEffectEvent((audio: HTMLAudioElement | null) => {
    if (!audio) {
      return;
    }

    audio.onplay = null;
    audio.onended = null;
    audio.onerror = null;
  });

  const releaseGeneratedAudio = useEffectEvent(() => {
    const currentAudio = audioRef.current;

    if (currentAudio) {
      detachAudioHandlers(currentAudio);
      currentAudio.pause();
      currentAudio.removeAttribute("src");
      currentAudio.load();
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  });

  const stopMediaStream = useEffectEvent(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  });

  const speakTextWithBrowser = useEffectEvent((text: string, onEnd?: () => void) => {
    if (!text || !browserSupportsSpeechSynthesis()) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = getAvailableVoices();
    const preferredVoice =
      voices.find((voice) => voice.name === voicePreferences.voiceName) ??
      voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ??
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || "en-US";
    }

    utterance.rate = voicePreferences.speechRate;
    utterance.onstart = () => setVoiceStatus("speaking");
    utterance.onend = () => {
      setVoiceStatus((current) => (current === "speaking" ? "idle" : current));
      onEnd?.();
    };
    utterance.onerror = () => {
      console.warn("Speech synthesis reported an error. Playback may still have succeeded.");
      setVoiceStatus((current) => (current === "speaking" ? "idle" : current));
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  });

  const playElevenLabsAudio = useEffectEvent(async (text: string, onEnd?: () => void) => {
    if (!text) {
      onEnd?.();
      return;
    }

    if (!voicePreferences.elevenLabsVoiceId) {
      setVoiceError("Choose an ElevenLabs voice in setup before starting the interview.");
      onEnd?.();
      return;
    }

    releaseGeneratedAudio();
    setVoiceStatus("speaking");
    setVoiceError("");

    try {
      const audioBlob = await synthesizeSpeech(
        text,
        voicePreferences.elevenLabsVoiceId,
      );

      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);

      audioRef.current = audio;
      audioUrlRef.current = objectUrl;

      audio.onplay = () => {
        setVoiceStatus("speaking");
      };

      audio.onended = () => {
        detachAudioHandlers(audio);
        releaseGeneratedAudio();
        setVoiceStatus((current) => (current === "speaking" ? "idle" : current));
        onEnd?.();
      };

      audio.onerror = () => {
        detachAudioHandlers(audio);
        releaseGeneratedAudio();
        setVoiceError("ElevenLabs audio playback failed.");
        setVoiceStatus((current) => (current === "speaking" ? "idle" : current));
        onEnd?.();
      };

      await audio.play();
    } catch (playbackError) {
      releaseGeneratedAudio();
      setVoiceStatus((current) => (current === "speaking" ? "idle" : current));

      if (browserSupportsSpeechSynthesis()) {
        const message = playbackError instanceof Error
          ? `${playbackError.message} Falling back to browser voice.`
          : "ElevenLabs playback failed. Falling back to browser voice.";
        setVoiceError(message);
        speakTextWithBrowser(text, onEnd);
        return;
      }

      setVoiceError(playbackError instanceof Error ? playbackError.message : "Unable to play ElevenLabs audio.");
      onEnd?.();
    }
  });

  const speakText = useEffectEvent((text: string, onEnd?: () => void) => {
    if (!text) {
      onEnd?.();
      return;
    }

    if (usingElevenLabs) {
      void playElevenLabsAudio(text, onEnd);
      return;
    }

    speakTextWithBrowser(text, onEnd);
  });

  const clearQueuedNarration = useEffectEvent(() => {
    if (queuedNarrationTimerRef.current !== null) {
      window.clearTimeout(queuedNarrationTimerRef.current);
      queuedNarrationTimerRef.current = null;
    }
  });

  const speakQuestion = useEffectEvent((text: string) => {
    speakText(text);
  });

  const playNarration = useEffectEvent((
    {
      assistantText,
      questionText,
      forceQuestion = false,
      assistantFirstDelayMs = 350,
    }: {
      assistantText?: string;
      questionText?: string;
      forceQuestion?: boolean;
      assistantFirstDelayMs?: number;
    }
  ) => {
    const shouldSpeakQuestion = Boolean(questionText && (forceQuestion || voicePreferences.autoSpeakQuestions));
    const runId = ++narrationRunIdRef.current;

    clearQueuedNarration();
    stopSpeaking();

    if (assistantText) {
      speakText(assistantText, () => {
        if (runId !== narrationRunIdRef.current || !shouldSpeakQuestion || !questionText) {
          return;
        }

        queuedNarrationTimerRef.current = window.setTimeout(() => {
          if (runId !== narrationRunIdRef.current) {
            return;
          }

          speakQuestion(questionText);
        }, assistantFirstDelayMs);
      });

      return;
    }

    if (shouldSpeakQuestion && questionText) {
      speakQuestion(questionText);
    }
  });

  const applyPromptUpdate = useEffectEvent((
    {
      assistantText,
      questionText,
      stageOverride,
      forceQuestion = false,
      persistQuestion = true,
    }: {
      assistantText?: string;
      questionText?: string;
      stageOverride?: Stage;
      forceQuestion?: boolean;
      persistQuestion?: boolean;
    }
  ) => {
    if (typeof stageOverride !== "undefined") {
      setStage(stageOverride);
      localStorage.setItem("interview_stage", stageOverride);
    }

    if (typeof assistantText === "string") {
      setAssistantMessage(assistantText);
    }

    if (typeof questionText === "string") {
      setQuestion(questionText);
      questionRef.current = questionText;

      if (persistQuestion) {
        localStorage.setItem("current_question", questionText);
      }
    }

    playNarration({
      assistantText,
      questionText,
      forceQuestion,
    });
  });

  const stopSpeaking = useEffectEvent(() => {
    if (browserSupportsSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }

    clearQueuedNarration();

    releaseGeneratedAudio();
    setVoiceStatus((current) => (current === "speaking" ? "idle" : current));
  });

  const flushRecordedAudio = useEffectEvent(async () => {
    const recordedChunks = [...recordedChunksRef.current];
    recordedChunksRef.current = [];

    if (recordedChunks.length === 0) {
      setVoiceStatus("idle");
      return;
    }

    const mimeType = recordingMimeTypeRef.current || recordedChunks[0]?.type || "audio/webm";
    const audioBlob = new Blob(recordedChunks, { type: mimeType });
    const filename = mimeType.includes("mp4") ? "interview.m4a" : "interview.webm";

    setVoiceStatus("thinking");
    setVoiceError("");

    try {
      const transcript = await transcribeSpeech(audioBlob, filename);
      const transcriptText = transcript.text.trim();

      if (!transcriptText) {
        setVoiceError("No speech was detected in the recording. Please try again.");
        setVoiceStatus("idle");
        return;
      }

      const mergedAnswer = [answerRef.current, transcriptText].filter(Boolean).join(" ").trim();
      answerRef.current = mergedAnswer;
      setAnswer(mergedAnswer);
      setInterimTranscript(transcriptText);
      setVoiceStatus("idle");
    } catch (transcriptionError) {
      console.error("ElevenLabs transcription failed:", transcriptionError);
      setVoiceError(transcriptionError instanceof Error ? transcriptionError.message : "Unable to transcribe the recording.");
      setVoiceStatus("idle");
    }
  });

  const stopListening = useEffectEvent(() => {
    if (usingElevenLabs) {
      const activeRecorder = mediaRecorderRef.current;

      if (activeRecorder && activeRecorder.state !== "inactive") {
        setVoiceStatus("thinking");
        activeRecorder.stop();
        return;
      }

      setVoiceStatus((current) => (current === "listening" ? "idle" : current));
      return;
    }

    isListeningRef.current = false;
    recognitionRef.current?.stop();
    setInterimTranscript("");
    setVoiceStatus((current) => (current === "listening" ? "idle" : current));
  });

  const startListening = useEffectEvent(async () => {
    setVoiceError("");

    if (usingElevenLabs) {
      if (!browserSupportsMediaRecorder()) {
        setVoiceError("Audio recording is not supported in this browser.");
        return;
      }

      const activeRecorder = mediaRecorderRef.current;

      if (activeRecorder && activeRecorder.state !== "inactive") {
        setVoiceStatus("thinking");
        activeRecorder.stop();
        return;
      }

      try {
        const stream = await requestMicrophoneAccess(voicePreferences.inputDeviceId || undefined);
        stopSpeaking();
        setInterimTranscript("");

        const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

        const recorder = preferredMimeType
          ? new MediaRecorder(stream, { mimeType: preferredMimeType })
          : new MediaRecorder(stream);

        recordingMimeTypeRef.current = recorder.mimeType || preferredMimeType || "audio/webm";
        recordedChunksRef.current = [];
        mediaStreamRef.current = stream;
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onerror = () => {
          setVoiceError("Microphone recording failed.");
          setVoiceStatus("idle");
          mediaRecorderRef.current = null;
          recordedChunksRef.current = [];
          stopMediaStream();
        };

        recorder.onstop = () => {
          mediaRecorderRef.current = null;
          stopMediaStream();
          void flushRecordedAudio();
        };

        recorder.start();
        setVoiceStatus("listening");
        return;
      } catch (microphoneError) {
        console.error("Microphone access failed:", microphoneError);
        setVoiceError(microphoneError instanceof Error ? microphoneError.message : "Microphone access is required before recording can start.");
        return;
      }
    }

    if (!browserSupportsSpeechRecognition()) {
      setVoiceError("Live transcription is not supported in this browser.");
      return;
    }

    try {
      await requestMicrophoneAccess(voicePreferences.inputDeviceId || undefined);
      stopSpeaking();

      if (!recognitionRef.current) {
        const recognition = createSpeechRecognition();

        if (!recognition) {
          setVoiceError("Live transcription is not supported in this browser.");
          return;
        }

        recognition.onresult = (event) => {
          let finalChunk = "";
          let interimChunk = "";

          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const transcript = event.results[index][0]?.transcript ?? "";

            if (event.results[index].isFinal) {
              finalChunk += transcript;
            } else {
              interimChunk += transcript;
            }
          }

          if (finalChunk) {
            const mergedAnswer = [answerRef.current, finalChunk.trim()].filter(Boolean).join(" ").trim();
            answerRef.current = mergedAnswer;
            setAnswer(mergedAnswer);
          }

          setInterimTranscript(interimChunk.trim());
        };

        recognition.onerror = (event) => {
          if (event.error !== "aborted") {
            setVoiceError(`Microphone error: ${event.error}`);
          }

          isListeningRef.current = false;
          setVoiceStatus("idle");
        };

        recognition.onend = () => {
          isListeningRef.current = false;
          setInterimTranscript("");
          setVoiceStatus((current) => (current === "listening" ? "idle" : current));
        };

        recognitionRef.current = recognition;
      }

      if (isListeningRef.current) {
        stopListening();
        return;
      }

      recognitionRef.current.start();
      isListeningRef.current = true;
      setVoiceStatus("listening");
    } catch (microphoneError) {
      console.error("Microphone access failed:", microphoneError);
      setVoiceError("Microphone access is required before live transcription can start.");
    }
  });

  useEffect(() => {
    const savedQuestion = localStorage.getItem("current_question");
    const openingMessage = localStorage.getItem("opening_message");
    const savedStage = localStorage.getItem("interview_stage");
    const fallbackOpening = "Hi, I'm ready when you are. We'll start with a short warm-up before the scored round begins.";

    if (savedQuestion) {
      setQuestion(savedQuestion);
      questionRef.current = savedQuestion;
    }

    const initialStage: Stage = savedStage === "technical" ? "technical" : "warmup";
    setStage(initialStage);

    const introMessage = openingMessage || fallbackOpening;
    setAssistantMessage(introMessage);

    if (openingMessage) {
      localStorage.removeItem("opening_message");
    }

    if (usingElevenLabs) {
      if (browserSupportsMediaRecorder()) {
        setVoiceReady(true);
      } else {
        setVoiceError("Audio recording is not supported in this browser.");
      }
    } else if (browserSupportsSpeechRecognition() || browserSupportsSpeechSynthesis()) {
      setVoiceReady(true);
    }

    void waitForVoices();

    if (savedQuestion) {
      queuedNarrationTimerRef.current = window.setTimeout(() => {
        applyPromptUpdate({
          assistantText: introMessage,
          questionText: savedQuestion,
          stageOverride: initialStage,
          persistQuestion: false,
        });
      }, 0);
    }

    return () => {
      narrationRunIdRef.current += 1;
      clearQueuedNarration();
      recognitionRef.current?.abort();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      stopMediaStream();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  async function handleConversationMessage(message: string) {
    const sessionId = localStorage.getItem("session_id");

    if (!sessionId) {
      return;
    }

    try {
      const data = await sendConversationMessage(sessionId, message);

      if (data.reply) {
        applyPromptUpdate({
          assistantText: data.reply,
          questionText: data.repeat_question,
          forceQuestion: Boolean(data.repeat_question),
          persistQuestion: Boolean(data.repeat_question),
        });
      }
    } catch (conversationError) {
      console.error("Conversation request failed:", conversationError);
      applyPromptUpdate({
        assistantText: "Sure. Focus on your approach, tradeoffs, and any edge cases you want to mention.",
      });
    }
  }

  async function handleSubmit() {
    const sessionId = localStorage.getItem("session_id");

    if (!sessionId) {
      setError("No active interview session found. Please start over.");
      return;
    }

    if (voiceStatus === "listening") {
      setError(usingElevenLabs
        ? "Stop the recording and wait for transcription before submitting."
        : "Stop listening before submitting the answer.");
      return;
    }

    if (usingElevenLabs && voiceStatus === "thinking" && !loading) {
      setError("Transcription is still running. Please wait a moment before submitting.");
      return;
    }

    if (!answer.trim()) {
      setError("Please enter or record an answer before submitting.");
      return;
    }

    setLoading(true);
    setError("");
    setVoiceStatus("thinking");
    stopSpeaking();

    if (!usingElevenLabs) {
      stopListening();
    }

    try {
      const data = await submitAnswer(sessionId, answer.trim());

      if (data.stage) {
        setStage(data.stage);
        localStorage.setItem("interview_stage", data.stage);
      }

      if (data.warmup_question) {
        applyPromptUpdate({
          assistantText: data.transition_message || "Thanks. Let's continue.",
          questionText: data.warmup_question,
          stageOverride: "warmup",
        });
        setAnswer("");
        answerRef.current = "";
        setInterimTranscript("");
        setVoiceStatus("idle");
        return;
      }

      if (data.followup_question) {
        applyPromptUpdate({
          assistantText: data.transition_message || "Thanks. I'd like to explore that a bit more.",
          questionText: data.followup_question,
        });
        setAnswer("");
        answerRef.current = "";
        setInterimTranscript("");
        setVoiceStatus("idle");
        return;
      }

      if (data.next_question) {
        applyPromptUpdate({
          assistantText: data.transition_message || "Alright, here's the next one.",
          questionText: data.next_question,
          stageOverride: data.stage === "technical" ? "technical" : undefined,
        });
        setAnswer("");
        answerRef.current = "";
        setInterimTranscript("");
        setVoiceStatus("idle");
        return;
      }

      if (data.report) {
        localStorage.setItem("final_report", JSON.stringify(data.report));

        if (data.closing_message) {
          localStorage.setItem("closing_message", data.closing_message);
          setAssistantMessage(data.closing_message);
        }

        setVoiceStatus("idle");
        navigate("/report");
      }
    } catch (submissionError) {
      setError("Unable to submit answer. Please try again.");
      console.error("Interview submission failed:", submissionError);
      setVoiceStatus("idle");
    } finally {
      setLoading(false);
    }
  }

  const voiceButtonLabel = usingElevenLabs
    ? voiceStatus === "listening"
      ? "Stop Recording"
      : voiceStatus === "thinking" && !loading
        ? "Transcribing..."
        : "Record Answer"
    : voiceStatus === "listening"
      ? "Stop Listening"
      : "Start Listening";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_right,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]" />
      <div className="absolute left-0 top-1/4 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="absolute right-6 top-6 z-20 w-[min(92vw,22rem)]">
        <SignedInBanner compact />
      </div>

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
                We start with a short warm-up, then move into the scored technical round.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Stage</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {stage === "warmup" ? "Warm-up, not scored" : "Technical round, scored"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Voice</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {voiceReady
                      ? usingElevenLabs
                        ? "ElevenLabs playback + transcription"
                        : "Browser voice enabled"
                      : "Voice unavailable in this browser"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ["Warm-up", "A few casual questions first."],
                ["Clarity", "Repeat or clarify without affecting scoring."],
                ["Flow", "The technical round starts after warm-up."],
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
                      Assistant prompt
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                      {stage === "warmup" ? "Warm-up" : "Question"}
                    </h2>
                  </div>
                  <VoiceStatusPill status={loading ? "thinking" : voiceStatus} />
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm leading-6 text-slate-200">
                  {assistantMessage || "The interview assistant will guide the next step."}
                </div>

                <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
                    Current question
                  </p>
                  <p className="mt-2 text-base leading-7 text-white">
                    {question || "The next question will appear here."}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => speakQuestion(questionRef.current)}
                    disabled={!voiceReady || !question}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Replay Question
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleConversationMessage("Could you clarify what you're asking?");
                    }}
                    disabled={!question}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clarify
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    disabled={voiceStatus !== "speaking"}
                    className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Interrupt Voice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void startListening();
                    }}
                    disabled={!voiceReady || (voiceStatus === "thinking" && !loading)}
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {voiceButtonLabel}
                  </button>
                </div>
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

                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-sm font-medium text-slate-100">Voice Assistant</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {usingElevenLabs
                      ? "Record an answer clip and the backend will transcribe it with ElevenLabs before you submit."
                      : "Warm-up answers are not scored. Once the technical round begins, the same flow continues with evaluation."}
                  </p>

                  {interimTranscript ? (
                    <p className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                      {usingElevenLabs ? `Last transcript: ${interimTranscript}` : `Live transcript: ${interimTranscript}`}
                    </p>
                  ) : null}

                  {voiceError ? (
                    <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      {voiceError}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">
                    {usingElevenLabs
                      ? "Speech playback uses your selected ElevenLabs voice and recording stays behind the authenticated backend proxy."
                      : "The technical prompt appears after the warm-up, and only that round is evaluated."}
                  </p>

                  <button
                    onClick={handleSubmit}
                    disabled={loading || !question}
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
