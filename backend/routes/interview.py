from fastapi import APIRouter
from pydantic import BaseModel
from services.evaluation_service import evaluate_answer
from services.report_service import generate_report
from services.followup_service import generate_followup
from services.question_service import (
    get_first_question,
    get_next_question,
    get_question_details
)
from services.state_service import (
    create_session,
    get_session
)

router = APIRouter()

MAX_QUESTIONS = {
    "Junior": 4,
    "Mid": 12,
    "Senior": 15
}

class InterviewRequest(BaseModel):
    role: str
    level: str


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


@router.post("/start")
def start_interview(req: InterviewRequest):

    state = create_session(
        req.role,
        req.level
    )
    

    question = get_first_question(
        req.role,
        req.level
    )

    if question is None:

        state.current_phase = "fallback"

        return {
            "session_id": state.session_id,
            "fallback_mode": True,
            "message": (
                "Curated question bank unavailable. "
                "Dynamic interview mode activated."
            )
        }

    state.questions_asked.append(
        question["question"]
    )
    return {
        "session_id": state.session_id,
        "question": question["question"]
    }


@router.post("/answer")
def submit_answer(req: AnswerRequest):

    state = get_session(req.session_id)

    if not state:
        return {"error": "Session not found"}
    
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

            return {
                "message": "Interview Complete",
                "report": report
            }

        state.questions_asked.append(
            next_question["question"]
        )

        return {
            "next_question": next_question["question"]
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

        return {
            "followup_question": followup
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

        return {
            "message": "Interview Complete",
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

        return {
            "message": "Interview Complete",
            "report": report
        }

    state.questions_asked.append(
        next_question["question"]
    )

    return {
        "next_question": next_question["question"]
    }
@router.get("/session/{session_id}")
def get_interview_state(session_id: str):

    state = get_session(session_id)

    if not state:
        return {"error": "Session not found"}

    return state