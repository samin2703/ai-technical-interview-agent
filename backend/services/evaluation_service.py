from models.evaluation import EvaluationResult
from services.ai_client import AIAND_MODEL, client

import json


def _fallback_evaluation(question: str, answer: str) -> EvaluationResult:
    answer_words = len(answer.split())
    depth_score = 2 if answer_words < 20 else 5 if answer_words < 60 else 7
    structure_score = 3 if "\n" not in answer else 5
    relevance_score = 4 if answer_words else 0

    return EvaluationResult(
        technical_accuracy=max(1, min(6, depth_score)),
        problem_solving=max(1, min(6, relevance_score)),
        communication=max(1, min(6, structure_score)),
        edge_cases_reliability=max(1, min(6, relevance_score)),
        engineering_quality=max(1, min(6, depth_score)),
        strengths=[
            "Answered in the fallback offline mode",
            "Provided a response for the interview flow",
        ],
        weaknesses=[
            "OpenAI evaluation was unavailable",
            "Scoring used a local fallback heuristic",
        ],
    )


def evaluate_answer(question: str, answer: str):

    prompt = f"""
You are a technical interview evaluator.

Question:
{question}

Candidate Answer:
{answer}

Evaluate the answer using:

1. Technical Accuracy (0-10)
2. Problem Solving (0-10)
3. Communication (0-10)
4. Edge Cases and Reliability (0-10)
5. Engineering Quality (0-10)

Also provide:
- strengths (list)
- weaknesses (list)

Return ONLY valid JSON in this format:

{{
  "technical_accuracy": 0,
  "problem_solving": 0,
  "communication": 0,
  "edge_cases_reliability": 0,
  "engineering_quality": 0,
  "strengths": [],
  "weaknesses": []
}}
"""

    try:
        response = client.responses.create(
            model=AIAND_MODEL,
            input=prompt
        )
        print("===== EVALUATION RESPONSE =====")
        print(response.output_text)
        print("===============================")

        result = json.loads(response.output_text)

        return EvaluationResult(**result)
    except Exception as exc:
        print(f"OpenAI evaluation unavailable, using fallback: {exc}")
        return _fallback_evaluation(question, answer)
