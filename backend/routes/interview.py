from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel
from services.evaluation_service import evaluate_answer
from services.conversation_service import (
    closing_message,
    opening_message,
    reply_to_message,
    transition_message,
)
from services.report_service import generate_report
from services.followup_service import generate_followup
from services.elevenlabs_service import (
    get_voice_runtime_config,
    list_voices,
    synthesize_speech,
    transcribe_audio,
)
from services.question_service import (
    get_first_question,
    get_next_question,
    get_question_details
)
from services.state_service import (
    create_session,
    get_session
)
from services.auth_service import is_token_valid

router = APIRouter()


def require_auth(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    token = authorization.removeprefix("Bearer ").strip()

    if not token or not is_token_valid(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
router = APIRouter(dependencies=[Depends(require_auth)])

MAX_QUESTIONS = {
    "Junior": 4,
    "Mid": 12,
    "Senior": 15
}

WARMUP_QUESTIONS = [
    "What's your name?",
    "How are you doing today?",
    "Before we begin, is there anything you'd like me to know about how you'd like this interview to go?",
]

class InterviewRequest(BaseModel):
    role: str
    level: str


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


class ConversationRequest(BaseModel):
    session_id: str
    message: str


class VoiceSynthesisRequest(BaseModel):
    text: str
    voice_id: str | None = None


def get_warmup_question(state) -> str | None:
    if state.warmup_index < len(state.warmup_questions):
        return state.warmup_questions[state.warmup_index]

    return None


def advance_to_technical(state):
    state.current_phase = "technical"

    next_question = get_first_question(
        state.role,
        state.level
    )

    if next_question is None:
        fallback_question = (
            f"Tell me about a recent project you worked on as an {state.role} "
            f"and the technical tradeoffs you made."
        )
        state.questions_asked.append(fallback_question)
        return fallback_question

    state.questions_asked.append(next_question["question"])
    return next_question["question"]


@router.post("/start")
def start_interview(req: InterviewRequest):

    state = create_session(
        req.role,
        req.level
    )

    opening = opening_message(req.role, req.level)
    state.warmup_questions = list(WARMUP_QUESTIONS)
    state.warmup_index = 0
    state.current_phase = "warmup"
    warmup_question = get_warmup_question(state)
    state.conversation_history.append(
        {
            "role": "assistant",
            "message": opening,
            "intent": "opening",
        }
    )
    state.conversation_stage = "warmup"

    return {
        "session_id": state.session_id,
        "question": warmup_question,
        "opening_message": opening,
        "stage": "warmup",
    }


@router.post("/converse")
def converse(req: ConversationRequest):
    state = get_session(req.session_id)

    if not state:
        return {"error": "Session not found"}

    return reply_to_message(state, req.message)


@router.get("/voice/status")
def get_voice_status():
    return get_voice_runtime_config()


@router.get("/voice/voices")
def get_available_voices():
    try:
        return {
            "voices": list_voices(),
            "default_voice_id": get_voice_runtime_config().get("default_voice_id"),
        }
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.post("/voice/speak")
def speak_with_elevenlabs(req: VoiceSynthesisRequest):
    try:
        audio_bytes, media_type = synthesize_speech(
            req.text,
            voice_id=req.voice_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return Response(
        content=audio_bytes,
        media_type=media_type,
        headers={
            "Cache-Control": "no-store",
        },
    )


@router.post("/voice/transcribe")
async def transcribe_with_elevenlabs(
    request: Request,
    audio_filename: str | None = Header(default=None, alias="X-Audio-Filename"),
):
    audio_bytes = await request.body()
    content_type = request.headers.get("content-type", "audio/webm")

    try:
        return transcribe_audio(
            audio_bytes,
            filename=audio_filename or "interview.webm",
            content_type=content_type,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.post("/answer")
def submit_answer(req: AnswerRequest):

    state = get_session(req.session_id)

    if not state:
        return {"error": "Session not found"}

    if state.current_phase == "warmup":
        state.conversation_history.append(
            {
                "role": "user",
                "message": req.answer,
                "intent": "warmup_answer",
            }
        )

        state.warmup_index += 1
        next_warmup = get_warmup_question(state)

        if next_warmup is not None:
            transition = transition_message("warmup", state.role, next_warmup)
            state.conversation_history.append(
                {
                    "role": "assistant",
                    "message": transition,
                    "intent": "transition",
                }
            )

            return {
                "transition_message": transition,
                "warmup_question": next_warmup,
                "stage": "warmup",
            }

        transition = transition_message("next", state.role, "technical interview")
        state.conversation_history.append(
            {
                "role": "assistant",
                "message": transition,
                "intent": "transition",
            }
        )

        state.current_phase = "technical"
        technical_question = advance_to_technical(state)

        return {
            "next_question": technical_question,
            "transition_message": transition,
            "stage": "technical",
        }
    
    if state.awaiting_followup:

        followup_question = state.current_followup

        state.candidate_answers.append(
            {
                "question": followup_question,
                "answer": req.answer
            }
        )

        followup_evaluation = evaluate_answer(
            followup_question,
            req.answer
        )

        state.evaluations.append(
            followup_evaluation.model_dump()
        )

        state.awaiting_followup = False
        state.current_followup = ""

        next_question = get_next_question(
            state.role,
            state.level,
            state.questions_asked
        )

        if next_question is None:

            state.interview_complete = True

            report = generate_report(
                state.candidate_answers,
                state.evaluations
            )

            closing = closing_message(state.role, state.level)
            state.conversation_history.append(
                {
                    "role": "assistant",
                    "message": closing,
                    "intent": "closing",
                }
            )

            return {
                "message": "Interview Complete",
                "closing_message": closing,
                "report": report
            }

        transition = transition_message("followup", state.role, followup_question)
        state.conversation_history.append(
            {
                "role": "assistant",
                "message": transition,
                "intent": "transition",
            }
        )
        state.questions_asked.append(
            next_question["question"]
        )

        return {
            "next_question": next_question["question"],
            "transition_message": transition,
        }

    state.candidate_answers.append(
        {
            "question": state.questions_asked[-1],
            "answer": req.answer
        }
    )

    question_details = get_question_details(
        state.role,
        state.level,
        state.questions_asked[-1]
    )

    if question_details:

        category = question_details["category"]

        if category not in state.categories_covered:
            state.categories_covered.append(
                category
            )

        skill = question_details["skill"]

        if skill not in state.skills_tested:
            state.skills_tested.append(
                skill
            )

    evaluation = evaluate_answer(
        state.questions_asked[-1],
        req.answer
    )

    followup = generate_followup(
        state.questions_asked[-1],
        req.answer,
        evaluation.model_dump()
    )

    state.followup_questions.append(
        followup
    )

    state.evaluations.append(
        evaluation.model_dump()
    )

    avg_score = (
        evaluation.technical_accuracy +
        evaluation.problem_solving +
        evaluation.communication +
        evaluation.edge_cases_reliability +
        evaluation.engineering_quality
    ) / 5

    if avg_score < 6:

        state.awaiting_followup = True

        state.current_followup = followup

        transition = transition_message("followup", state.role, followup)
        state.conversation_history.append(
            {
                "role": "assistant",
                "message": transition,
                "intent": "transition",
            }
        )

        return {
            "followup_question": followup,
            "transition_message": transition,
        }

    max_questions = MAX_QUESTIONS.get(
        state.level,
        10
    )

    if len(state.candidate_answers) >= max_questions:

        state.interview_complete = True

        report = generate_report(
            state.candidate_answers,
            state.evaluations
        )

        closing = closing_message(state.role, state.level)
        state.conversation_history.append(
            {
                "role": "assistant",
                "message": closing,
                "intent": "closing",
            }
        )

        return {
            "message": "Interview Complete",
            "closing_message": closing,
            "report": report
        }


    next_question = get_next_question(
        state.role,
        state.level,
        state.questions_asked
    )

    if next_question is None:

        state.interview_complete = True

        report = generate_report(
            state.candidate_answers,
            state.evaluations
        )

        closing = closing_message(state.role, state.level)
        state.conversation_history.append(
            {
                "role": "assistant",
                "message": closing,
                "intent": "closing",
            }
        )

        return {
            "message": "Interview Complete",
            "closing_message": closing,
            "report": report
        }

    state.questions_asked.append(
        next_question["question"]
    )

    transition = transition_message("next", state.role, next_question["question"])
    state.conversation_history.append(
        {
            "role": "assistant",
            "message": transition,
            "intent": "transition",
        }
    )

    return {
        "next_question": next_question["question"],
        "transition_message": transition,
    }
@router.get("/session/{session_id}")
def get_interview_state(session_id: str):

    state = get_session(session_id)

    if not state:
        return {"error": "Session not found"}

    return state
