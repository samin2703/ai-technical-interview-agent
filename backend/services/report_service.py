from openai import OpenAI
from dotenv import load_dotenv

import os
import json

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def generate_report(candidate_answers, evaluations):

    if not evaluations:

        return {
            "overall_score": 0,
            "overall_recommendation":
                "Insufficient Data"
        }

    avg_technical = sum(
        e["technical_accuracy"]
        for e in evaluations
    ) / len(evaluations)

    avg_problem_solving = sum(
        e["problem_solving"]
        for e in evaluations
    ) / len(evaluations)

    avg_communication = sum(
        e["communication"]
        for e in evaluations
    ) / len(evaluations)

    avg_edge_cases = sum(
        e["edge_cases_reliability"]
        for e in evaluations
    ) / len(evaluations)

    avg_engineering = sum(
        e["engineering_quality"]
        for e in evaluations
    ) / len(evaluations)

    overall_score = round(

        (
            avg_technical * 0.30
            + avg_problem_solving * 0.25
            + avg_communication * 0.15
            + avg_edge_cases * 0.15
            + avg_engineering * 0.15
        ) * 10,

        2
    )

    prompt = f"""
You are a senior technical interviewer.

Candidate Answers:
{candidate_answers}

Evaluation Results:
{evaluations}

Weighted Overall Score:
{overall_score}

Score Breakdown:

Technical Accuracy:
{round(avg_technical, 2)}

Problem Solving:
{round(avg_problem_solving, 2)}

Communication:
{round(avg_communication, 2)}

Edge Cases and Reliability:
{round(avg_edge_cases, 2)}

Engineering Quality:
{round(avg_engineering, 2)}

Generate a final assessment report.

Use the weighted score when deciding readiness level and recommendation.

Return ONLY valid JSON.

Format:

{{
    "overall_score": 0,

    "overall_recommendation": "",

    "readiness_level": "",

    "score_breakdown": {{
        "technical_accuracy": 0,
        "problem_solving": 0,
        "communication": 0,
        "edge_cases_reliability": 0,
        "engineering_quality": 0
    }},

    "strengths": [],

    "weaknesses": [],

    "evidence_summary": "",

    "improvement_roadmap": [],

    "suggested_followup_areas": []
}}
"""

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt
    )

    print(response.output_text)

    try:

        result = json.loads(
            response.output_text
        )

        return result

    except Exception:

        return {
            "overall_score": overall_score,
            "overall_recommendation":
                "Report Generation Failed"
        }