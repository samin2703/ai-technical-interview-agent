from pydantic import BaseModel
from typing import List


class EvaluationResult(BaseModel):
    technical_accuracy: int
    problem_solving: int
    communication: int
    edge_cases_reliability: int
    engineering_quality: int

    strengths: List[str]
    weaknesses: List[str]