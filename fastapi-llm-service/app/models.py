from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field


class AiRecommendation(str, Enum):
    use_current_cv = "use-current-cv"
    revise_current_cv = "revise-current-cv"
    create_new_cv = "create-new-cv"


class CvImprovementItem(BaseModel):
    section: str
    issue: str
    suggestion: str
    priority: str


class CvSuggestionResponse(BaseModel):
    score: int
    summary: str
    strengths: list[str]
    improvements: list[CvImprovementItem]
    keywordsToAdd: list[str]
    recommendation: str


class ApplicationFitResponse(BaseModel):
    fitScore: int
    matchedSkills: list[str]
    missingSkills: list[str]
    missingKeywords: list[str]
    recommendation: str
    explanation: str
    actionPlan: list[str]


class CvSuggestionRequest(BaseModel):
    cv: dict
    userId: int | None = None
    role: str | None = None


class ApplicationFitRequest(BaseModel):
    cv: dict
    job: dict
    userId: int | None = None
    role: str | None = None


class TaskType(str, Enum):
    cv_suggest = "cv_suggest"
    cv_job_fit = "cv_job_fit"


class TaskCreateResponse(BaseModel):
    taskId: str
    status: str


class TaskStatusResponse(BaseModel):
    taskId: str
    status: str
    result: dict | None = None
    error: str | None = None
    type: TaskType | None = None


class ErrorResponse(BaseModel):
    message: str = Field(default="Unexpected error")


class ForecastPoint(BaseModel):
    date: str
    value: float


class ForecastRequest(BaseModel):
    series: list[ForecastPoint]
    periods: int = 14
    freq: str = "D"


class ForecastResponse(BaseModel):
    forecast: list[dict]
