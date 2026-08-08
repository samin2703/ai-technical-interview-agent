# AI Interviewer Cognisor

AI Interviewer Cognisor is an AI-assisted technical interview platform with authenticated interview sessions, warm-up conversation, adaptive technical questioning, voice support, and recruiter-style final reports.

Updated for the current repository state in August 2026.

## Latest Updates

- Added Supabase-backed sign-in and sign-up with protected frontend routes and protected backend interview endpoints.
- Expanded the interview flow to include a warm-up stage before scored technical questions.
- Added conversation-style opening, transition, clarification, and closing support.
- Moved AI calls behind a shared OpenAI-compatible client using `AIAND_*` configuration, with `OPENAI_API_KEY` accepted as a fallback alias.
- Added stronger fallback behavior when evaluation, follow-up generation, or report generation fails.
- Added optional ElevenLabs-backed speech synthesis and transcription through authenticated backend proxy routes.
- Upgraded the frontend flow with setup, interview, and report experiences that support voice preferences and session continuity.
- Expanded checked-in role coverage to AI Engineer, Frontend Engineer, Backend Engineer, and Data Analyst.

## Current Capabilities

- Sign up, sign in, and log out through Supabase Auth
- Protected interview API routes
- Role- and level-based interview setup
- Warm-up, technical, follow-up, and closing interview stages
- Adaptive follow-up questions when an answer scores weakly
- Weighted scoring across five evaluation dimensions
- AI-generated final assessment reports
- Browser voice mode with speech synthesis support
- ElevenLabs voice mode for higher-quality playback and recorded-answer transcription
- Local fallback behavior so the interview can still continue if live AI calls fail

## Supported Roles

- AI Engineer
- Frontend Engineer
- Backend Engineer
- Data Analyst

The frontend also exposes `Full Stack Engineer`, but a curated `backend/question_bank/full_stack_engineer.json` file is not currently checked in.

## Evaluation Rubric

- Technical Accuracy: 30%
- Problem Solving: 25%
- Communication: 15%
- Edge Cases and Reliability: 15%
- Engineering Quality: 15%

## Tech Stack

### Backend

- FastAPI
- Python
- Pydantic
- OpenAI Python SDK
- `httpx`

### Frontend

- React 19
- TypeScript
- Vite
- React Router 7
- Tailwind CSS 4

### External Services

- Supabase Auth
- OpenAI-compatible model provider via `AIAND_BASE_URL`
- ElevenLabs for optional speech synthesis and speech-to-text

## Interview Flow

1. The user signs in.
2. The user chooses a role and seniority level on the setup page.
3. The user can optionally configure microphone and voice preferences.
4. The backend starts the session with an opening message and warm-up questions.
5. The interview transitions into scored technical questions from the curated role question bank.
6. Answers are evaluated across five rubric dimensions.
7. Lower-scoring answers can trigger an adaptive follow-up question.
8. The interview ends with a weighted final report and recommendation.

Current question budget by level:

- Junior: 4 answers
- Mid: 12 answers
- Senior: 15 answers

## Project Structure

```text
backend/
  main.py
  routes/
  services/
  models/
  question_bank/
frontend/
  src/
    components/
    pages/
    services/
```

## Local Setup

### 1. Shared UI Tooling

Install the shared Tailwind tooling from the repository root:

```bash
npm install
```

### 2. Backend

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

## Environment Variables

### Backend `backend/.env`

Required:

- `AIAND_API_KEY` preferred API key for the OpenAI-compatible provider, or `OPENAI_API_KEY` as a fallback alias
- `SUPABASE_JWT_SECRET` for backend bearer-token validation

Optional:

- `AIAND_BASE_URL` default: `https://api.aiand.com/v1`
- `AIAND_MODEL` default: `openai/gpt-oss-120b`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_DEFAULT_VOICE_ID`
- `ELEVENLABS_TTS_MODEL_ID` default: `eleven_flash_v2_5`
- `ELEVENLABS_STT_MODEL_ID` default: `scribe_v2`
- `ELEVENLABS_OUTPUT_FORMAT` default: `mp3_44100_128`
- `ELEVENLABS_TIMEOUT_SECONDS` default: `60`

### Frontend `frontend/.env`

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## API Surface

All interview routes are mounted under `/interview`.

- `POST /interview/start`
- `POST /interview/answer`
- `POST /interview/converse`
- `GET /interview/session/{session_id}`
- `GET /interview/voice/status`
- `GET /interview/voice/voices`
- `POST /interview/voice/speak`
- `POST /interview/voice/transcribe`

## Current Status

This repository is beyond the original MVP, but it is still an active prototype rather than a production-hardened system.

Known gaps:

- Interview sessions are stored in memory only.
- Reports and sessions are not persisted in a database.
- The setup page collects more inputs than the backend currently uses.
- Question ordering is deterministic rather than randomized.
- Automated test coverage is still limited.

## Author

Samin Sadique Aurin
