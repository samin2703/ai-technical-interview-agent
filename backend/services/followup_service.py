from services.ai_client import AIAND_MODEL, client


def _fallback_followup(question: str, answer: str, evaluation: dict) -> str:
    if evaluation.get("technical_accuracy", 0) <= 3:
        return "Can you walk me through the tradeoffs you considered and the simplest correct approach?"

    return f"Could you go one level deeper on {question.lower().rstrip('.')}"


def generate_followup(
    question: str,
    answer: str,
    evaluation: dict
):

    prompt = f"""
You are a technical interviewer.

Original Question:
{question}

Candidate Answer:
{answer}

Evaluation:
{evaluation}

Generate ONE follow-up question.

Rules:
- Stay on the same topic.
- If the answer is strong, ask a deeper question.
- If the answer is weak, ask a simpler clarification question.
- Return ONLY the follow-up question.
"""

    try:
        response = client.responses.create(
            model=AIAND_MODEL,
            input=prompt
        )

        return response.output_text.strip()
    except Exception as exc:
        print(f"OpenAI follow-up unavailable, using fallback: {exc}")
        return _fallback_followup(question, answer, evaluation)
