# Project Overview

This repository implements an AI-assisted technical interviewing platform. It runs a protected interview flow, evaluates candidate answers with an LLM, generates adaptive follow-up questions, and produces a final hiring-style report for review in the frontend.

## 1. Project Purpose

The application is a structured interview workspace for hiring teams. A user signs in, chooses a role and seniority level, starts an interview, answers a sequence of curated questions, and receives an automated evaluation report at the end.

The high-level workflow is:

1. Authenticate in the frontend with Supabase.
2. Choose an interview role and level on the setup screen.
3. Start an interview session in the backend.
4. Serve the first curated question from the question bank.
5. Submit answers, score them with the LLM, and decide whether to ask a follow-up.
6. Continue through the question bank until the interview ends.
7. Generate a final report and display it in the frontend.

## 2. Folder Structure

The tree below shows the repository-owned project files. Generated directories such as `node_modules` and Python caches are intentionally omitted.

```text
.
├── package.json
├── README.md
├── PROGRESS_REPORT.md
├── backend
│   ├── .env
│   ├── main.py
│   ├── requirements.txt
│   ├── test_followup.py
│   ├── test_openai.py
│   ├── data
│   ├── models
│   │   ├── evaluation.py
│   │   └── interview_state.py
│   ├── question_bank
│   │   ├── ai_engineer.json
│   │   ├── backend_engineer.json
│   │   ├── data_analyst.json
│   │   └── frontend_engineer.json
│   ├── routes
│   │   └── interview.py
│   └── services
│       ├── auth_service.py
│       ├── evaluation_service.py
│       ├── followup_service.py
│       ├── question_service.py
│       ├── report_service.py
│       └── state_service.py
└── frontend
    ├── README.md
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── tsconfig.app.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── public
    │   ├── favicon.svg
    │   └── icons.svg
    └── src
        ├── App.css
        ├── App.tsx
        ├── index.css
        ├── main.tsx
        ├── assets
        │   ├── hero.png
        │   ├── react.svg
        │   └── vite.svg
        ├── components
        │   ├── ProtectedRoute.tsx
        │   └── SignedInBanner.tsx
        ├── pages
        │   ├── InterviewPage.tsx
        │   ├── LandingPage.tsx
        │   ├── LoginPage.tsx
        │   ├── ReportPage.tsx
        │   ├── SetupPage.tsx
        │   └── SignupPage.tsx
        └── services
            ├── api.ts
            └── auth.ts
```

Folder purposes:

- `backend/` contains the FastAPI application, interview logic, state model, evaluation/report generation, and curated question banks.
- `backend/models/` defines the in-memory data shapes used by the interview session and evaluation pipeline.
- `backend/routes/` exposes the HTTP API surface.
- `backend/services/` holds the core interview behavior, state storage, auth validation, and LLM integrations.
- `backend/question_bank/` stores role-specific question sets as JSON files.
- `backend/data/` currently exists as a placeholder and does not hold active runtime data.
- `frontend/` contains the Vite + React + TypeScript UI.
- `frontend/src/pages/` holds the routed screens for login, signup, setup, interview, landing, and report display.
- `frontend/src/components/` contains shared UI wrappers such as route protection and the signed-in banner.
- `frontend/src/services/` contains browser-side API helpers and auth-session helpers.
- `frontend/public/` and `frontend/src/assets/` contain static visual assets.

## 3. Backend Architecture

Framework: FastAPI with Pydantic models and standard Starlette middleware.

Main entry point: `backend/main.py`

Responsibilities:

- Loads backend environment variables from `backend/.env`.
- Creates the FastAPI application.
- Configures CORS for the local Vite frontend.
- Mounts the interview router under `/interview`.

Routing:

- `backend/routes/interview.py` is the single API router and the main orchestration layer for the interview flow.
- All protected interview routes use bearer-token authentication through a FastAPI dependency.

Services:

- `backend/services/auth_service.py` validates bearer tokens.
- `backend/services/state_service.py` creates and retrieves in-memory interview sessions.
- `backend/services/question_service.py` loads question banks and selects questions.
- `backend/services/evaluation_service.py` scores answers with OpenAI.
- `backend/services/followup_service.py` generates one follow-up question with OpenAI.
- `backend/services/report_service.py` aggregates scores and generates the final report with OpenAI.

Models:

- `backend/models/interview_state.py` defines the interview session state.
- `backend/models/evaluation.py` defines the structured answer-scoring result.

Utilities:

- There is no separate utility layer beyond the service modules.
- The backend relies on module-level helpers and module-level OpenAI clients rather than a dedicated helper package.

## 4. Interview Workflow

Step-by-step flow from interview creation to report generation:

1. The frontend submits role and level from `frontend/src/pages/SetupPage.tsx` to `frontend/src/services/api.ts`.
2. `frontend/src/services/api.ts` calls `POST /interview/start`.
3. `backend/routes/interview.py` creates a new session through `backend/services/state_service.py`.
4. The route fetches the first matching question through `backend/services/question_service.py`.
5. The frontend stores the returned `session_id` and current question in local storage and navigates to the interview screen.
6. `frontend/src/pages/InterviewPage.tsx` displays the active question and submits each answer through `frontend/src/services/api.ts`.
7. `backend/routes/interview.py` loads the session state and records the answer.
8. The route looks up metadata for the current question so it can track categories and skills covered.
9. `backend/services/evaluation_service.py` scores the answer with OpenAI and returns a structured evaluation.
10. `backend/services/followup_service.py` generates a follow-up question when the answer quality is weak enough to warrant one.
11. `backend/routes/interview.py` decides whether to continue with a follow-up, move to the next curated question, or end the interview.
12. When the question limit is reached or the question bank is exhausted, `backend/services/report_service.py` generates the final report.
13. The frontend saves that report in local storage and opens `frontend/src/pages/ReportPage.tsx`.

Files responsible for the main steps:

- Session creation and orchestration: `backend/routes/interview.py`, `backend/services/state_service.py`
- Question selection: `backend/services/question_service.py`
- Scoring: `backend/services/evaluation_service.py`
- Follow-up generation: `backend/services/followup_service.py`
- Final report generation: `backend/services/report_service.py`
- UI flow: `frontend/src/pages/SetupPage.tsx`, `frontend/src/pages/InterviewPage.tsx`, `frontend/src/pages/ReportPage.tsx`

## 5. API Endpoints

The backend currently exposes three interview endpoints, all mounted under `/interview`.

| Method | Endpoint | Request model | Response shape | Service calls |
| --- | --- | --- | --- | --- |
| `POST` | `/interview/start` | `InterviewRequest` with `role` and `level` | Returns `session_id` and `question`, or fallback-mode metadata when no curated question exists | `create_session`, `get_first_question` |
| `POST` | `/interview/answer` | `AnswerRequest` with `session_id` and `answer` | Returns `followup_question`, `next_question`, or final `report`; may also return a simple error object for a missing session | `get_session`, `get_question_details`, `evaluate_answer`, `generate_followup`, `get_next_question`, `generate_report` |
| `GET` | `/interview/session/{session_id}` | Path parameter `session_id` | Returns the in-memory `InterviewState` or an error object | `get_session` |

Auth behavior:

- All routes in `backend/routes/interview.py` are protected by a bearer-token dependency.
- Tokens are validated by `backend/services/auth_service.py` before the handler logic runs.

Request/response modeling:

- `InterviewRequest` and `AnswerRequest` are defined directly in `backend/routes/interview.py`.
- Endpoint responses are mostly ad hoc JSON dictionaries rather than dedicated response models.

## 6. LLM Integration

Model used:

- `gpt-4.1-mini` is used in all three OpenAI-backed services.

Prompt generation:

- `backend/services/evaluation_service.py` sends the question and candidate answer to the model and asks for a JSON rubric score plus strengths and weaknesses.
- `backend/services/followup_service.py` sends the original question, answer, and evaluation and asks for one follow-up question.
- `backend/services/report_service.py` sends all candidate answers, all evaluation results, and the aggregated weighted score to generate the final report.

Evaluation pipeline:

- The evaluation service computes five scored dimensions: technical accuracy, problem solving, communication, edge cases and reliability, and engineering quality.
- The model output is parsed as JSON and converted into `EvaluationResult` from `backend/models/evaluation.py`.
- If parsing fails, the service returns a fallback score object with failure markers.

Follow-up question generation:

- The follow-up service returns a single plain-text follow-up question.
- The route decides whether that follow-up is used based on the current answer score.

Structured output schemas:

- The evaluation service requests a strict JSON schema and maps it into a Pydantic model.
- The report service also requests JSON, but it does not validate the response with a dedicated Pydantic schema.
- The follow-up service is unstructured and returns plain text.

## 7. Question System

Question bank storage:

- Role-specific question banks live in `backend/question_bank/`.
- The current files are `ai_engineer.json`, `backend_engineer.json`, `data_analyst.json`, and `frontend_engineer.json`.

Selection logic:

- `backend/services/question_service.py` derives the filename from the role name.
- It loads the JSON file for that role, filters questions by difficulty, and returns the first matching item.
- `get_next_question` returns the first unanswered question at the same difficulty.

Adaptive questioning:

- After an answer is scored, the route computes a simple average across the five rubric dimensions.
- If the average is below `6`, the interview pauses for a follow-up question.
- Otherwise the flow advances to the next curated question.

Randomization:

- There is no random sampling or shuffling in the current implementation.
- Question order is deterministic within a role and difficulty level.

Role-specific logic:

- Role selection drives which JSON file is loaded.
- Question metadata also tracks category and skill so the session can record coverage across the interview.

## 8. Session/State Management

How interview state is stored:

- Sessions are kept in memory in a module-level dictionary inside `backend/services/state_service.py`.
- Each session is keyed by a UUID `session_id`.
- There is no database persistence.

Conversation history:

- `backend/models/interview_state.py` stores asked questions, candidate answers, evaluations, and follow-up questions as lists.
- The route appends each answer and evaluation as the interview progresses.

Candidate information:

- The current session state only stores role and level as candidate-facing interview context.
- There is no richer candidate profile, company context, or job requisition data yet.

Progress tracking:

- The session tracks categories covered, skills tested, the current follow-up question, whether a follow-up is pending, the current phase, and whether the interview is complete.

## 9. Evaluation System

Rubrics:

- Technical Accuracy
- Problem Solving
- Communication
- Edge Cases and Reliability
- Engineering Quality

Scoring:

- Each dimension is scored from 0 to 10 by the model.
- The final weighted score in `backend/services/report_service.py` uses 30%, 25%, 15%, 15%, and 15% weighting across the five dimensions.
- The service normalizes the final score to a 0 to 100 scale.

Recommendation generation:

- The report prompt asks the model to produce an overall recommendation and a readiness level based on the weighted score and score breakdown.
- The final report also includes strengths, weaknesses, evidence summary, improvement roadmap, and suggested follow-up areas.

Final report generation:

- `backend/services/report_service.py` aggregates averages across all evaluations before prompting the model.
- If no evaluations exist, it returns a minimal insufficient-data report.
- If the model returns invalid JSON, the service falls back to a basic report with the computed weighted score.

## 10. Existing Design Patterns

Services pattern:

- The backend uses a service layer for auth, state, questions, evaluation, follow-up generation, and reporting.

Dependency injection:

- FastAPI dependency injection is used for bearer-token enforcement in `backend/routes/interview.py`.

Factory pattern:

- There is no explicit factory class.
- The question loader behaves like a small role-to-file selector, but it is not implemented as a formal factory.

Other architectural patterns:

- Router orchestration is centralized in one route module.
- Interview state is modeled as an in-memory session object.
- LLM interaction is isolated behind thin service wrappers.
- The frontend uses route-level protection through a wrapper component.

## 11. Configuration

Environment variables:

- `OPENAI_API_KEY` is used by the backend LLM services.
- `SUPABASE_JWT_SECRET` is used by backend token validation.
- `VITE_SUPABASE_URL` is used by the frontend auth client.
- `VITE_SUPABASE_ANON_KEY` is used by the frontend auth client.

Config files:

- `backend/.env` stores local backend secrets.
- `backend/requirements.txt` pins backend Python dependencies.
- `frontend/package.json` defines frontend scripts and dependencies.
- `frontend/vite.config.ts` wires React and Tailwind into Vite.
- `frontend/eslint.config.js` defines linting rules.
- `frontend/tsconfig*.json` define the TypeScript compilation settings.

Database:

- There is no database in the current architecture.
- Interview sessions are stored only in process memory.

External APIs:

- OpenAI Responses API is used for evaluation, follow-up generation, and report generation.
- Supabase Auth is used by the frontend for login, signup, and logout.

## 12. Current Limitations

Observed limitations and technical debt:

- Interview sessions are ephemeral and disappear on restart.
- The backend has no persistence layer for reports or historical sessions.
- The setup page collects tech stack and interview type, but the backend does not currently use those values to affect question selection.
- Question selection is deterministic rather than randomized.
- The backend response models are mostly implicit dictionaries instead of explicit Pydantic response schemas.
- Report generation depends on raw JSON returned by the LLM and only has fallback parsing behavior.
- The frontend stores the current question and final report in local storage, so refresh behavior depends on browser state.
- The README still describes the project as primarily supporting AI Engineer, even though the question bank already contains backend, frontend, and data analyst content.
- The repo has only smoke tests for OpenAI and follow-up generation, not comprehensive automated coverage of the interview flow.

The repository progress notes in `PROGRESS_REPORT.md` also call out future work such as stronger persistence, more dynamic setup inputs, better error handling, report history, additional interview modes, and more automated tests.

## 13. Suggested Extension Points

Where a new Company Context Service could fit:

- Add a new service in `backend/services/`, for example `company_context_service.py`.
- Call it from `backend/routes/interview.py` during `POST /interview/start` before the first question is selected.
- Store company metadata in `backend/models/interview_state.py` so it can influence later prompts and scoring.
- Pass that context into `backend/services/evaluation_service.py`, `backend/services/followup_service.py`, and `backend/services/report_service.py` so the prompts can be company-aware.

Where company-specific question generation would fit:

- Extend `backend/services/question_service.py` to merge role questions with company context or to select from a second company-specific bank.
- Add a company-specific folder alongside `backend/question_bank/` if you want static curated questions.
- If dynamic generation is preferred, call the LLM from the question service or a dedicated generator service before returning the next question.

Files most likely to change for that feature:

- `backend/routes/interview.py`
- `backend/services/question_service.py`
- `backend/services/state_service.py`
- `backend/models/interview_state.py`
- `backend/services/evaluation_service.py`
- `backend/services/followup_service.py`
- `backend/services/report_service.py`
- `frontend/src/pages/SetupPage.tsx`
- `frontend/src/services/api.ts`

## 14. Notes on the Frontend Flow

The frontend is a routed React application built with Vite and TypeScript. `frontend/src/App.tsx` defines the route structure, `frontend/src/components/ProtectedRoute.tsx` blocks unauthenticated access, and `frontend/src/pages/InterviewPage.tsx`, `frontend/src/pages/ReportPage.tsx`, and `frontend/src/pages/SetupPage.tsx` handle the main interview experience. `frontend/src/services/api.ts` is the bridge to the backend, while `frontend/src/services/auth.ts` manages local auth-session storage.

The UI is presentation-heavy but functionally straightforward: login and signup use Supabase directly, the setup page starts the interview, the interview page handles answer submission, and the report page renders the saved final report.
