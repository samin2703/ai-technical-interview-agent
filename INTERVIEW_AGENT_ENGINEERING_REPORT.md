# Interview Agent Engineering Report

Date: August 5, 2026

## 1. Executive Summary

This project is a full-stack AI-assisted technical interviewing system designed to simulate a structured interviewer, evaluate responses, adapt with follow-up questions, and produce a recruiter-friendly final report. The implementation combines a React frontend, a FastAPI backend, Supabase-based authentication, curated JSON question banks, an OpenAI-compatible model provider for scoring/follow-up/reporting, and an ElevenLabs-backed voice layer for more realistic speech playback and transcription.

At its current stage, the system is best described as an MVP-plus prototype with several strong product ideas already implemented:

- authenticated interview access
- role- and level-based interview setup
- a multi-phase interview flow with warm-up and scored technical stages
- adaptive follow-up questioning
- AI-generated evaluation reports
- hybrid voice interaction with ElevenLabs playback/transcription plus browser fallback and recording support

The overall design shows a clear engineering strategy: keep the workflow understandable, isolate AI-dependent behavior behind service modules, use simple local state to move fast, and add fallback behavior so the interview can continue even if model calls fail during runtime.

## 2. Scope and Method

This report is based on direct inspection of the repository state on August 5, 2026. It is grounded in:

- source code in `backend/` and `frontend/`
- the current `README.md`
- `PROJECT_OVERVIEW.md`
- `PROGRESS_REPORT.md`

Where this report describes how the system was "developed" or why a decision was made, that is partly inferred from the current code structure and the checked-in project notes, not from a full historical commit-by-commit design record.

## 3. Product Intent

The Interview Agent is designed to support a hiring workflow where a signed-in user can:

1. authenticate into the app
2. configure an interview for a role and seniority level
3. complete a short warm-up
4. answer technical questions from a curated bank
5. receive follow-up questions when answers appear weak or incomplete
6. finish with a structured final assessment report

This design makes the system closer to an interview assistant than a generic chatbot. The core objective is not open-ended conversation; it is guided candidate assessment.

## 4. System Architecture

### High-level architecture

```text
Browser
  |
  |-- React + TypeScript + React Router
  |-- Tailwind-based UI
  |-- localStorage session persistence
  |-- MediaRecorder + Web Speech fallback APIs
  |
  |---- Supabase Auth REST API
  |         |
  |         -> sign up / sign in / logout
  |
  |---- FastAPI backend
            |
            |-- auth_service
            |-- state_service
            |-- question_service
            |-- conversation_service
            |-- evaluation_service
            |-- followup_service
            |-- report_service
            |-- elevenlabs_service
            |
            |---- OpenAI-compatible model provider via ai_client
            |
            |---- ElevenLabs API
                     |
                     -> voice list / speech synthesis / speech-to-text
```

### Architectural style

The system follows a pragmatic service-oriented MVC-lite structure:

- `routes/` defines the HTTP API and orchestrates the workflow
- `services/` contains business logic and AI integrations
- `models/` defines the main in-memory data structures
- `question_bank/` stores static interview content outside code
- `frontend/src/pages/` maps directly to product screens

This is a good fit for an MVP because it is easy to reason about, fast to extend, and does not require a database or orchestration layer up front.

## 5. Technologies Used

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn
- `python-dotenv`
- OpenAI Python SDK
- `httpx`
- manual HMAC verification for Supabase-style JWTs

### Frontend

- React 19
- TypeScript 6
- React Router 7
- Vite 8
- Tailwind CSS 4 via Vite plugin

### Browser platform features

- `localStorage` for auth/session/report persistence in the client
- MediaRecorder API for recorded answer capture
- Web Speech Recognition API for browser fallback live transcription
- Web Speech Synthesis API for browser fallback spoken playback
- Print and Blob APIs for report export

### External services

- Supabase Auth for sign-up, sign-in, and logout
- an OpenAI-compatible LLM provider configured through `AIAND_BASE_URL`, `AIAND_API_KEY`, and `AIAND_MODEL`
- ElevenLabs for realistic text-to-speech and speech-to-text, configured through `ELEVENLABS_*` backend environment variables

## 6. Backend Design and Engineering

### 6.1 Application bootstrap

`backend/main.py` creates the FastAPI app, loads environment variables from `backend/.env`, configures CORS for local Vite development, and mounts the interview router under `/interview`.

This is intentionally lean. The backend is currently centered around one functional domain: interviewing.

### 6.2 Router as interview orchestrator

`backend/routes/interview.py` is the main control tower of the product. It does more than define endpoints; it acts as the interview state machine.

Key responsibilities:

- enforce authentication with a dependency
- start a new interview session
- manage warm-up progression
- transition into technical questions
- accept candidate answers
- trigger evaluation and follow-up generation
- detect interview completion
- generate the final report

The route layer is intentionally thin in some areas but still contains meaningful business flow logic. That is a common MVP tradeoff: it reduces indirection, but it also means the router now owns a large portion of the interview workflow.

### 6.3 Authentication model

Authentication is split across frontend and backend:

- the frontend logs users in directly against Supabase Auth
- the backend receives the resulting bearer token
- `auth_service.py` validates that token before protected routes run

This is a smart product decision for an MVP because it avoids building a full user system in-house while still protecting the interview API.

Notable engineering detail:

- the backend tries to verify Supabase JWTs using `SUPABASE_JWT_SECRET`
- if strict verification fails, it falls back to checking decoded payload shape and expiration only

That fallback keeps development flexible, but it also introduces a serious security limitation discussed later in this report.

### 6.4 Session and state management

`state_service.py` stores interview sessions in an in-memory dictionary keyed by UUID.

The `InterviewState` model tracks:

- session id
- role and level
- questions asked
- candidate answers
- evaluations
- follow-up questions
- categories covered
- skills tested
- conversation history
- warm-up question state
- follow-up state
- current phase
- completion status

This is one of the strongest engineering decisions in the repo. Instead of scattering state across multiple globals, the project uses a single explicit session object that represents the interview lifecycle.

Why this matters:

- it keeps the interview flow understandable
- it supports stage transitions cleanly
- it makes later migration to a database easier because the data model already exists

### 6.5 Question system

Questions live in role-specific JSON files inside `backend/question_bank/`.

Observed question bank coverage:

- `ai_engineer.json`: 122 questions
- `backend_engineer.json`: 150 questions
- `frontend_engineer.json`: 150 questions
- `data_analyst.json`: 150 questions

Each question includes:

- role
- category
- difficulty
- skill
- question text

This is a strong content architecture choice. Keeping questions in JSON rather than code makes the system easier to maintain, extend, and audit by non-backend contributors.

Selection behavior today:

- filename is derived from role name
- questions are filtered by difficulty
- the first matching question is selected as the starting point
- subsequent questions are chosen in deterministic order by skipping already asked items

This makes the interview predictable and easy to debug, but it also means the system is not yet varied or personalized beyond role and seniority.

### 6.6 Warm-up and interview phases

The interview has two explicit phases:

- `warmup`
- `technical`

Warm-up is based on a fixed three-question list:

- "What's your name?"
- "How are you doing today?"
- "Before we begin, is there anything you'd like me to know about how you'd like this interview to go?"

After warm-up completes, the backend transitions into the technical stage and loads the first scored question.

This is a thoughtful UX decision. It humanizes the experience and avoids dropping the candidate directly into scoring.

### 6.7 Evaluation engine

`evaluation_service.py` sends the question and answer to the model and requests structured JSON with five rubric scores:

- technical accuracy
- problem solving
- communication
- edge cases and reliability
- engineering quality

It also asks for:

- strengths
- weaknesses

The result is parsed into a Pydantic `EvaluationResult`.

This is one of the best engineered parts of the system because it imposes structure on otherwise open-ended LLM output. The rubric makes the scoring process more explainable and gives downstream reporting a stable shape.

### 6.8 Follow-up generation

`followup_service.py` asks the model for one follow-up question based on:

- the original question
- the candidate answer
- the evaluation summary

The router then computes an average across the five rubric scores. If the average is below `6`, the system pauses the main flow and asks the follow-up.

This is the key adaptive behavior in the product. It turns the app from a static questionnaire into a conditional interviewer.

### 6.9 Final report generation

`report_service.py` aggregates scores across the interview, computes a weighted overall score, and asks the model to generate structured JSON containing:

- overall score
- overall recommendation
- readiness level
- score breakdown
- strengths
- weaknesses
- evidence summary
- improvement roadmap
- suggested follow-up areas

The weighting is:

- Technical Accuracy: 30%
- Problem Solving: 25%
- Communication: 15%
- Edge Cases and Reliability: 15%
- Engineering Quality: 15%

This weighting system is a meaningful technical decision because it formalizes what the product values and prevents every dimension from being treated as equally important.

### 6.10 Conversation layer

`conversation_service.py` is a lightweight non-LLM conversation helper that supports:

- greetings
- introductions
- repeat requests
- clarification requests
- acknowledgements
- simple transitions

Its implementation is heuristic and rule-based rather than model-based. That is a good cost and reliability decision for common conversational affordances.

The service also generates:

- opening messages
- transition messages
- closing messages

This gives the app a more natural pacing without making every small interaction depend on the model provider.

### 6.11 ElevenLabs voice integration

The backend now includes a dedicated `elevenlabs_service.py` that acts as a server-side proxy for voice functionality.

Responsibilities include:

- exposing the current voice runtime configuration
- listing available ElevenLabs voices for authenticated users
- generating spoken audio from assistant or question text
- transcribing recorded answer audio

Key backend design decision:

- the ElevenLabs API key remains on the backend and is never exposed to the browser

The relevant protected routes live in `backend/routes/interview.py`:

- `GET /interview/voice/status`
- `GET /interview/voice/voices`
- `POST /interview/voice/speak`
- `POST /interview/voice/transcribe`

This is an important architectural improvement over a browser-only voice design because it enables higher-quality speech while preserving credential safety.

### 6.12 Fallback behavior

The repo intentionally includes fallback logic in several AI-dependent services.

When runtime model calls fail:

- answer scoring falls back to a local heuristic
- follow-up generation falls back to a templated question
- report generation falls back to a computed offline report

This is a strong resilience-oriented decision. It recognizes that model providers are not perfectly reliable and that the interview experience should degrade gracefully instead of simply crashing.

## 7. Frontend Design and Engineering

### 7.1 Routing and page structure

The frontend is organized around user-facing pages:

- `LandingPage`
- `LoginPage`
- `SignupPage`
- `SetupPage`
- `InterviewPage`
- `ReportPage`

`App.tsx` uses React Router and wraps the main app routes in `ProtectedRoute`, which blocks access when there is no local auth session.

This page-oriented structure is clean and appropriate for a workflow product.

### 7.2 Authentication UX

The frontend performs auth directly against Supabase REST endpoints from `frontend/src/services/api.ts`.

Auth behavior includes:

- sign-up
- sign-in
- logout
- local session persistence
- redirect protection

Session data is stored in `localStorage` through `auth.ts`.

This is a pragmatic choice because it avoids the need for a custom auth backend while keeping the user experience simple.

### 7.3 Setup experience

The setup page collects:

- role
- level
- tech stack
- interview type
- voice provider choice
- microphone configuration
- selected browser voice or ElevenLabs voice
- speech rate
- auto-speak preference

This screen shows a product evolution beyond the original MVP. It is no longer just a simple form; it is becoming an interview control panel.

Important detail:

- only `role` and `level` are currently sent to the backend on interview start

So the frontend has outpaced the backend in configurability.

### 7.4 Interview experience

`InterviewPage.tsx` is the most complex frontend screen. It manages:

- current question display
- answer capture
- warm-up vs technical stage display
- ElevenLabs speech playback
- ElevenLabs transcription via recorded audio
- browser speech fallback
- interim transcription
- assistant messages
- question replay
- voice interruption
- answer submission
- local session persistence

This page acts as the client-side interaction controller for the interview.

From an engineering perspective, its responsibilities are substantial:

- UI state
- voice state
- timing state
- local persistence
- backend integration

This makes it powerful, but it also means the component is carrying a lot of complexity in one place.

### 7.5 Voice interaction design

Voice functionality is now implemented as a hybrid design rather than a purely browser-native one.

Capabilities include:

- voice provider selection in setup
- backend-proxied ElevenLabs voice catalog loading
- realistic spoken playback using ElevenLabs TTS
- recorded answer transcription using ElevenLabs STT
- microphone permission request
- audio input device selection
- browser fallback playback and transcription when needed
- adjustable speech rate
- automatic reading of new questions
- status indicators for idle, listening, thinking, and speaking

The design intentionally splits responsibility across browser and backend:

- the browser handles device access, recording, and local interaction state
- the backend handles secure ElevenLabs API access
- the frontend keeps a browser-voice fallback path available for resilience

The narration flow was also simplified after integration bugs surfaced. Instead of letting multiple effects auto-play assistant text and question text independently, the interview screen now uses a single explicit narration path per interview event. That change reduces duplicate playback, stale intro replay, and competing "two voices" behavior.

Tradeoff:

- the voice stack is stronger and more realistic than before, but it is now more stateful and integration-heavy than a browser-only prototype

### 7.6 Report experience

`ReportPage.tsx` turns the model output into a recruiter-friendly presentation. It supports:

- recommendation summary
- readiness level
- score visualization
- strengths and weaknesses
- evidence summary
- improvement roadmap
- suggested follow-up areas
- export to PDF through print flow
- download of a recruiter brief as standalone HTML

This is an especially strong product decision. It shifts the output from "LLM text blob" to a usable hiring artifact.

## 8. End-to-End Workflow

The implemented workflow is:

1. User signs up or signs in through the frontend.
2. Supabase returns an access token.
3. The frontend stores the token locally and uses it as a bearer token for backend requests.
4. The user selects a role and level on the setup page.
5. The user can optionally choose ElevenLabs as the voice provider and select a specific voice.
6. The frontend calls `POST /interview/start`.
7. The backend creates a new in-memory session.
8. The backend returns an opening message plus the first warm-up question.
9. The frontend narrates the opening message and then the first question through either ElevenLabs or the browser fallback path.
10. The user answers warm-up prompts by typing or by recording an answer clip.
11. If the user records audio in ElevenLabs mode, the frontend sends the clip to `POST /interview/voice/transcribe` before answer submission.
12. The backend transitions to the technical phase.
13. The backend loads the first role- and level-matched question.
14. The user submits an answer.
15. The backend evaluates the answer with the model.
16. If the average score is below `6`, the backend generates a follow-up question.
17. Otherwise the backend advances to the next curated question.
18. The interview stops when the question budget is reached or no more questions remain.
19. The backend generates the final report.
20. The frontend stores the report locally and navigates to the report page.
21. The user can review, print, or download the report.

### Question budget by level

- Junior: 4
- Mid: 12
- Senior: 15

## 9. Major Features

### Functional features

- protected interview routes
- role-based question bank selection
- difficulty-based question filtering
- warm-up phase before scoring
- adaptive technical follow-up questions
- weighted multi-dimensional evaluation
- final recruiter-style assessment report
- conversation helper route for repeat/clarification behavior
- protected ElevenLabs voice catalog, speech synthesis, and transcription endpoints

### UX features

- polished landing, auth, setup, interview, and report screens
- signed-in user banner and logout flow
- local session persistence between screens
- voice-assisted interview interaction
- realistic spoken prompts through ElevenLabs
- recorded answer transcription through ElevenLabs
- report export options

### Resilience features

- runtime fallback scoring
- runtime fallback follow-up generation
- runtime fallback report generation

## 10. Technical Decisions and Their Rationale

### Decision 1: Use a service layer around AI-dependent behavior

Why it was likely chosen:

- isolate model prompts from route code
- make the interview flow easier to read
- support fallback behavior per capability

Impact:

- good separation for evaluation, follow-up, and reporting
- easier future migration to other providers

### Decision 2: Store sessions in memory first

Why it was likely chosen:

- fastest way to build interview flow
- no schema migrations or database setup
- simple local development

Impact:

- fast MVP development
- no persistence, no multi-instance readiness

### Decision 3: Use JSON question banks

Why it was likely chosen:

- easier content editing
- separates interview content from logic
- simple role expansion path

Impact:

- maintainable content model
- no dynamic generation or analytics-backed selection yet

### Decision 4: Delegate auth to Supabase

Why it was likely chosen:

- avoids building identity management
- enables protected routes quickly
- good fit for startup-style development speed

Impact:

- reduced backend auth complexity
- introduces dependency on correct token verification

### Decision 5: Use a hybrid voice stack with backend-proxied ElevenLabs

Why it was likely chosen:

- improve speech quality beyond browser-native synthesis
- avoid exposing the ElevenLabs API key to the browser
- retain browser fallback paths for resilience
- add transcription without building a custom realtime audio service

Impact:

- significantly better spoken output quality
- safer API-key handling
- more moving parts in the frontend narration/state flow

### Decision 6: Keep report generation model-based but structurally constrained

Why it was likely chosen:

- final reports need more nuance than numeric aggregates
- structured JSON keeps the output renderable in the UI

Impact:

- strong product output
- still vulnerable to malformed model output

### Decision 7: Add warm-up and transition messaging

Why it was likely chosen:

- reduce the cold, mechanical feel of a pure question engine
- make the interview feel more human

Impact:

- better candidate experience
- slightly more workflow state to manage

## 11. Engineering Challenges and How the Current System Addresses Them

### Challenge: LLM output is useful but unreliable

Solution used:

- structured prompts for evaluation/report generation
- Pydantic parsing for evaluation
- fallback heuristics if model calls fail at runtime

Assessment:

This is a strong engineering response to a common AI product problem.

### Challenge: Secure the product without building a full auth stack

Solution used:

- Supabase handles login/signup/logout
- backend accepts bearer tokens and verifies them locally

Assessment:

This is a good build-vs-buy decision for an MVP, though the current verification implementation still needs tightening.

### Challenge: Preserve interview state across multiple steps

Solution used:

- explicit `InterviewState`
- session id passed between frontend and backend
- frontend `localStorage` for screen-to-screen continuity

Assessment:

The state model is simple, readable, and effective for a single-process prototype.

### Challenge: Make the interview feel adaptive instead of static

Solution used:

- weak answers trigger follow-up questions
- transition and assistant messages improve pacing
- categories and skills are tracked for later reporting potential

Assessment:

This gives the product a clear identity beyond a static form.

### Challenge: Add voice capability without building real-time audio infrastructure

Solution used:

- a backend-proxied ElevenLabs layer for high-quality TTS and STT
- browser MediaRecorder for audio capture
- browser speech APIs as fallback utilities
- a single explicit narration path in the interview screen to keep playback sequencing predictable

Assessment:

This is a practical middle ground: much better quality than browser-only voice, but still lighter-weight than a full low-latency streaming voice architecture.

### Challenge: Produce decision-ready outputs instead of raw scores

Solution used:

- weighted scoring system
- recruiter-readable report format
- exportable report page

Assessment:

This is one of the strongest product decisions in the system because it connects interview execution to a real hiring outcome.

## 12. Current Limitations, Risks, and Technical Debt

### 12.1 No persistent backend storage

Sessions are stored only in memory. If the backend restarts:

- active interviews are lost
- reports are lost unless still stored in the user's browser
- there is no audit trail or history

### 12.2 Auth verification has a security weakness

`auth_service.py` first attempts signature verification, but if that fails it can still accept a token based only on decoded payload fields such as `exp` and `aud`.

That means the system is not currently enforcing strict cryptographic verification in all cases. For a production interview platform, this is a significant security risk.

### 12.3 Fallback mode is only partial

The AI services contain runtime fallback logic, but `ai_client.py` raises a startup error if no API key is present at import time.

So the system can degrade gracefully when the provider is unreachable after startup, but it does not currently support a true no-key offline startup mode.

### 12.4 Setup inputs are ahead of backend support

The setup page collects `techStack` and `interviewType`, but `startInterview()` only sends `role` and `level` to the backend.

This means the UI suggests more personalization than the backend currently delivers.

### 12.5 Full Stack role is exposed without a matching backend question bank

The setup screen offers "Full Stack Engineer", but the backend question bank folder does not currently contain a matching `full_stack_engineer.json`.

The system will fall back rather than run a full curated interview for that role.

### 12.6 Question selection is deterministic and shallowly adaptive

Today the system:

- chooses the first matching question
- proceeds linearly through the bank
- only adapts through a single follow-up path

There is no randomization, no coverage balancing, and no branching strategy based on previous category performance.

### 12.7 Interview breadth can be reduced by follow-up counting behavior

The question budget is enforced using the number of stored candidate answers, which includes follow-up answers.

As a result, weaker answers can consume the same question budget with more follow-up depth and less topic breadth.

That may be acceptable, but it is a design tradeoff that should be explicit.

### 12.8 Conversation support is still lightweight

There is a backend `/interview/converse` route and the frontend now uses it for clarification/repeat flows, but the conversation system is still rule-based and limited to simple prompt support rather than deep interviewer reasoning.

So the conversation layer is useful, but still intentionally narrow.

### 12.9 Voice flow is now hybrid and stateful

The earlier auto-submit behavior has been removed, which is an improvement. However, the current voice system still depends on careful coordination between:

- browser recording state
- backend transcription responses
- backend-generated ElevenLabs audio
- narration sequencing across intro, transition, and question playback

This is manageable, but it means the interview screen remains one of the most state-sensitive parts of the application.

### 12.10 Response typing is inconsistent

Request bodies use Pydantic models, but many backend responses are ad hoc dictionaries instead of formal response schemas.

This limits:

- API self-documentation quality
- frontend type safety
- contract testing

### 12.11 Validation around question-bank edge cases is limited

The question loader assumes a matching filtered question exists in some flows. If a role file exists but does not contain a requested difficulty, the current implementation may fail inelegantly.

### 12.12 Automated testing is minimal

The repo includes smoke-style scripts for OpenAI and follow-up generation, but it does not yet include comprehensive automated coverage for:

- auth behavior
- session lifecycle
- warm-up progression
- technical question progression
- fallback behavior
- report generation contract validity
- frontend interaction flow
- voice behavior

### 12.13 Logging and observability are basic

Some services print raw model outputs directly to stdout. There is no structured logging, tracing, metrics, or persistent error reporting.

## 13. What the System Does Well

Despite the current limitations, the project has several genuinely strong engineering qualities:

- The interview flow is conceptually clear.
- The service boundaries are sensible for an MVP.
- The question content system is easy to scale.
- The report output is much more useful than a simple scorecard.
- Voice support adds meaningful differentiation.
- The system already demonstrates fallback-aware AI engineering rather than assuming the model always works.

In short, the repo shows thoughtful product engineering, not just an API wrapper around an LLM.

## 14. Recommended Next Steps

### Highest priority

1. Replace the current token fallback with strict JWT verification only.
2. Add persistent storage for sessions and reports.
3. Align setup inputs with backend behavior so `techStack` and `interviewType` affect question selection and prompts.
4. Fix the interview auto-submit behavior in voice mode.

### Strong next engineering improvements

1. Introduce response schemas for backend endpoints.
2. Add a proper report history model.
3. Add randomized or coverage-aware question selection.
4. Fully integrate the conversation route into the interview page.
5. Add structured logging and error monitoring.
6. Separate the voice controller logic from `InterviewPage.tsx` into a dedicated module or hook.

### Testing priorities

1. Backend API tests for the full interview lifecycle.
2. Auth rejection and expiry tests.
3. Contract tests for evaluation/report JSON shapes.
4. Frontend route and flow tests.
5. Voice feature tests covering narration sequencing, fallback behavior, and recorded-answer transcription.

## 15. Conclusion

The Interview Agent was engineered as a practical, product-driven full-stack prototype: fast to iterate, clear to demo, and already capable of delivering a meaningful interview experience. Its strongest design choices are the explicit session model, the service-based AI workflow, the structured evaluation rubric, the recruiter-oriented reporting layer, and the decision to combine curated question banks with adaptive AI follow-ups and a backend-proxied ElevenLabs voice layer.

The current architecture is appropriate for an MVP and shows good judgment about where to stay simple and where to add product depth. The next phase of engineering should focus less on adding surface features and more on hardening the platform: strict auth validation, persistence, deeper test coverage, stronger API contracts, and tighter alignment between frontend configuration and backend behavior.
