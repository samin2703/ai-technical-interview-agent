from openai import OpenAI
from dotenv import load_dotenv

import os

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


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

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    return response.output_text.strip()