from openai import OpenAI
from dotenv import load_dotenv
from models.evaluation import EvaluationResult

import os
import json

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
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

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )
    print("===== EVALUATION RESPONSE =====")
    print(response.output_text)
    print("===============================")
    try:

        result = json.loads(
            response.output_text
        )

        return EvaluationResult(**result)

    except Exception:

        return EvaluationResult(
            technical_accuracy=0,
            problem_solving=0,
            communication=0,
            edge_cases_reliability=0,
            engineering_quality=0,
            strengths=["Evaluation Failed"],
            weaknesses=["Invalid JSON returned by model"]
        )