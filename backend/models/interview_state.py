from pydantic import BaseModel, Field
from typing import List, Dict


class InterviewState(BaseModel):

    session_id: str

    role: str
    level: str

    questions_asked: List[str] = Field(default_factory=list)

    candidate_answers: List[Dict] = Field(default_factory=list)

    evaluations: List[Dict] = Field(default_factory=list)

    followup_questions: List[str] = Field(default_factory=list)

    categories_covered: List[str] = Field(default_factory=list)

    skills_tested: List[str] = Field(default_factory=list)

    strengths: List[str] = Field(default_factory=list)

    weaknesses: List[str] = Field(default_factory=list)

    conversation_history: List[Dict] = Field(default_factory=list)

    conversation_stage: str = "opening"

    warmup_questions: List[str] = Field(default_factory=list)

    warmup_index: int = 0

    awaiting_followup: bool = False

    current_followup: str = ""

    current_phase: str = "technical"

    interview_complete: bool = False
