import { getAuthSession } from "./auth";
import type { ElevenLabsVoice } from "./voice";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const API_BASE_URL = "http://127.0.0.1:8000";

function hasSupabaseAuth() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function requireSupabaseConfig() {
  if (!hasSupabaseAuth()) {
    throw new Error("Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function normalizeName(fullName: string | undefined, email: string) {
  const cleanedName = fullName?.trim();

  if (cleanedName) {
    return cleanedName;
  }

  return email.split("@")[0] || email;
}

function mapSupabaseUser(user: any) {
  const email = typeof user?.email === "string" ? user.email : "";
  const fullName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.user_metadata?.display_name;

  return {
    email,
    name: normalizeName(fullName, email),
  };
}

async function supabaseLogin(email: string, password: string) {
  requireSupabaseConfig();

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      email,
      password
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.message || "Login failed");
  }

  return {
    access_token: data.access_token,
    user: mapSupabaseUser(data.user ?? data),
    provider: "supabase" as const,
  };
}

async function supabaseRegister(fullName: string, email: string, password: string) {
  requireSupabaseConfig();

  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName,
          display_name: fullName,
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.message || "Registration failed");
  }

  if (!data.session?.access_token) {
    throw new Error("Account created. Check your email to confirm it, then sign in.");
  }

  return {
    access_token: data.session.access_token,
    user: mapSupabaseUser(data.user ?? data.session.user),
    provider: "supabase" as const,
  };
}

async function supabaseLogout(accessToken: string) {
  requireSupabaseConfig();

  await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Authorization: `Bearer ${accessToken}`,
    }
  });
}

function authHeaders() {
  const token = getAuthSession()?.accessToken;

  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

async function readResponseError(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    throw new Error(data.detail || data.message || fallbackMessage);
  }

  const message = (await response.text()).trim();

  throw new Error(message || fallbackMessage);
}

export async function login(email: string, password: string) {
  return supabaseLogin(email, password);
}

export async function register(fullName: string, email: string, password: string) {
  return supabaseRegister(fullName, email, password);
}

export async function logout() {
  const token = getAuthSession()?.accessToken;

  if (token) {
    await supabaseLogout(token);
    return { message: "Logged out" };
  }

  throw new Error("No active session found.");
}

export async function startInterview(
  role: string,
  level: string
) {

  const response = await fetch(
    `${API_BASE_URL}/interview/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        role,
        level
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.message || "Unable to start interview");
  }

  return data;
}

export async function submitAnswer(
  sessionId: string,
  answer: string
) {

  const response = await fetch(
    `${API_BASE_URL}/interview/answer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        session_id: sessionId,
        answer: answer
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.message || "Unable to submit answer");
  }

  return data;
}

export async function sendConversationMessage(
  sessionId: string,
  message: string
) {

  const response = await fetch(
    `${API_BASE_URL}/interview/converse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        session_id: sessionId,
        message
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.message || "Unable to send conversation message");
  }

  return data;
}

export type VoiceRuntimeStatus = {
  configured: boolean;
  provider: "browser" | "elevenlabs";
  tts_model_id?: string;
  stt_model_id?: string;
  default_voice_id?: string | null;
};

export async function getVoiceStatus(): Promise<VoiceRuntimeStatus> {
  const response = await fetch(
    `${API_BASE_URL}/interview/voice/status`,
    {
      headers: {
        ...authHeaders()
      }
    }
  );

  if (!response.ok) {
    await readResponseError(response, "Unable to load voice configuration.");
  }

  return response.json();
}

export async function getElevenLabsVoices(): Promise<{
  voices: ElevenLabsVoice[];
  default_voice_id?: string | null;
}> {
  const response = await fetch(
    `${API_BASE_URL}/interview/voice/voices`,
    {
      headers: {
        ...authHeaders()
      }
    }
  );

  if (!response.ok) {
    await readResponseError(response, "Unable to load ElevenLabs voices.");
  }

  return response.json();
}

export async function synthesizeSpeech(
  text: string,
  voiceId: string
) {
  const response = await fetch(
    `${API_BASE_URL}/interview/voice/speak`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId
      })
    }
  );

  if (!response.ok) {
    await readResponseError(response, "Unable to synthesize speech.");
  }

  return response.blob();
}

export async function transcribeSpeech(
  audio: Blob,
  filename = "interview.webm"
) {
  const response = await fetch(
    `${API_BASE_URL}/interview/voice/transcribe`,
    {
      method: "POST",
      headers: {
        "Content-Type": audio.type || "audio/webm",
        "X-Audio-Filename": filename,
        ...authHeaders()
      },
      body: audio
    }
  );

  if (!response.ok) {
    await readResponseError(response, "Unable to transcribe speech.");
  }

  return response.json() as Promise<{
    text: string;
    language_code?: string | null;
    language_probability?: number | null;
  }>;
}
