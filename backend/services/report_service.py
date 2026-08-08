from services.ai_client import AIAND_MODEL, client
import json


def _fallback_report(candidate_answers, evaluations, overall_score: float):
    average = {
        "technical_accuracy": round(sum(e["technical_accuracy"] for e in evaluations) / len(evaluations), 2),
        "problem_solving": round(sum(e["problem_solving"] for e in evaluations) / len(evaluations), 2),
        "communication": round(sum(e["communication"] for e in evaluations) / len(evaluations), 2),
        "edge_cases_reliability": round(sum(e["edge_cases_reliability"] for e in evaluations) / len(evaluations), 2),
        "engineering_quality": round(sum(e["engineering_quality"] for e in evaluations) / len(evaluations), 2),
    }

    return {
        "overall_score": overall_score,
        "overall_recommendation": "Fallback report generated offline",
        "readiness_level": "Needs Review",
        "score_breakdown": average,
        "strengths": ["Interview completed with local fallback scoring"],
        "weaknesses": ["OpenAI report generation was unavailable"],
        "evidence_summary": "The backend could not reach OpenAI, so this report was synthesized locally from the stored evaluations.",
        "improvement_roadmap": [
            "Reconnect the model-backed report generator",
            "Review the areas that scored lowest in the fallback output",
        ],
        "suggested_followup_areas": ["Communication", "Problem solving"],
    }


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

    try:
        response = client.responses.create(
            model=AIAND_MODEL,
            input=prompt
        )

        print(response.output_text)

        result = json.loads(response.output_text)

        return result
    except Exception as exc:
        print(f"OpenAI report generation unavailable, using fallback: {exc}")
        return _fallback_report(candidate_answers, evaluations, overall_score)
