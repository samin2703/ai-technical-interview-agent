export type VoiceStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking";

export type VoiceProvider =
  | "browser"
  | "elevenlabs";

export type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  preview_url?: string | null;
  labels?: Record<string, string>;
};

export type VoicePreferences = {
  provider: VoiceProvider;
  inputDeviceId: string;
  voiceName: string;
  elevenLabsVoiceId: string;
  speechRate: number;
  autoSpeakQuestions: boolean;
};

const DEFAULT_PREFERENCES: VoicePreferences = {
  provider: "browser",
  inputDeviceId: "",
  voiceName: "",
  elevenLabsVoiceId: "",
  speechRate: 1,
  autoSpeakQuestions: true,
};

const STORAGE_KEY = "voice_preferences";

export function getVoicePreferences(): VoicePreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      provider: parsed.provider === "elevenlabs" ? "elevenlabs" : "browser",
      inputDeviceId: typeof parsed.inputDeviceId === "string" ? parsed.inputDeviceId : "",
      voiceName: typeof parsed.voiceName === "string" ? parsed.voiceName : "",
      elevenLabsVoiceId: typeof parsed.elevenLabsVoiceId === "string" ? parsed.elevenLabsVoiceId : "",
      speechRate: typeof parsed.speechRate === "number" ? parsed.speechRate : 1,
      autoSpeakQuestions: typeof parsed.autoSpeakQuestions === "boolean" ? parsed.autoSpeakQuestions : true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveVoicePreferences(preferences: VoicePreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function browserSupportsSpeechRecognition() {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function browserSupportsSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function browserSupportsMediaRecorder() {
  return typeof window !== "undefined" && "MediaRecorder" in window;
}

export function getAvailableVoices() {
  if (!browserSupportsSpeechSynthesis()) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

export async function waitForVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (!browserSupportsSpeechSynthesis()) {
    return [];
  }

  const existingVoices = getAvailableVoices();

  if (existingVoices.length > 0) {
    return existingVoices;
  }

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const cleanup = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      window.clearTimeout(timerId);
    };

    const onVoicesChanged = () => {
      cleanup();
      resolve(getAvailableVoices());
    };

    const timerId = window.setTimeout(() => {
      cleanup();
      resolve(getAvailableVoices());
    }, timeoutMs);

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
  });
}

export function createSpeechRecognition() {
  if (!browserSupportsSpeechRecognition()) {
    return null;
  }

  const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

  if (!Constructor) {
    return null;
  }

  const recognition = new Constructor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  return recognition;
}

export async function requestMicrophoneAccess(deviceId?: string) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported in this browser.");
  }

  const requestStream = (constraints: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(constraints);

  const buildErrorMessage = (error: unknown) => {
    const browserError = error as { name?: string; message?: string };
    const name = browserError?.name ?? "UnknownError";
    const message = browserError?.message ?? "Unable to access the microphone.";

    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Chrome blocked microphone access. Click the lock icon in the address bar and allow microphone permission.";
    }

    if (name === "SecurityError") {
      return "Microphone access requires a secure context. Open the app on localhost or HTTPS.";
    }

    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No microphone was detected on this device.";
    }

    if (name === "NotReadableError" || name === "TrackStartError") {
      return "The microphone is already in use or unavailable right now.";
    }

    if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
      return "The selected microphone could not be opened. Try the default microphone instead.";
    }

    return `${name}: ${message}`;
  };

  if (deviceId) {
    try {
      return await requestStream({
        audio: {
          deviceId: {
            exact: deviceId,
          },
        },
      });
    } catch (error) {
      try {
        return await requestStream({ audio: true });
      } catch (fallbackError) {
        throw new Error(buildErrorMessage(fallbackError ?? error));
      }
    }
  }

  try {
    return await requestStream({ audio: true });
  } catch (error) {
    throw new Error(buildErrorMessage(error));
  }
}

export async function listAudioInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices.filter((device) => device.kind === "audioinput");
}
