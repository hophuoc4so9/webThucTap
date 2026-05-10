import json

from .settings import settings


def _trim_text(value: str, limit: int) -> str:
    if not value:
        return ""
    return value[:limit]


def _trim_list(values: list, limit: int) -> list:
    return values[:limit] if values else []


def build_cv_prompt(cv: dict) -> tuple[str, str]:
    system_prompt = (
        "You are a strict CV reviewer. Return ONLY one valid JSON object that matches the schema."
        " No markdown, no extra text. Use Vietnamese and be concise."
    )

    payload = {
        "task": "cv_improvement",
        "locale": "vi-VN",
        "rules": [
            "Use only provided CV data.",
            "Be specific and concise Vietnamese.",
            "Limit the number of improvements and keywords.",
            "No extra commentary outside JSON.",
        ],
        "outputSchema": {
            "score": "0-100",
            "summary": "string",
            "strengths": ["string"],
            "improvements": [
                {
                    "section": "summary|skills|experience|projects|general",
                    "issue": "string",
                    "suggestion": "string",
                    "priority": "high|medium|low",
                }
            ],
            "keywordsToAdd": ["string"],
            "recommendation": "revise-current-cv|create-new-cv",
        },
        "limits": {
            "maxImprovements": settings.max_improvements,
            "maxKeywords": settings.max_keywords,
        },
        "cv": _trim_payload(cv),
    }

    return system_prompt, json.dumps(payload, ensure_ascii=False)


def build_fit_prompt(cv: dict, job: dict) -> tuple[str, str]:
    system_prompt = (
        "You are a recruitment AI. Compare CV and job, then return ONLY one valid JSON object matching the schema."
        " Use concise Vietnamese and no extra text."
    )

    payload = {
        "task": "cv_job_fit",
        "locale": "vi-VN",
        "outputSchema": {
            "fitScore": "0-100",
            "matchedSkills": ["string"],
            "missingSkills": ["string"],
            "missingKeywords": ["string"],
            "recommendation": "use-current-cv|revise-current-cv|create-new-cv",
            "explanation": "string",
            "actionPlan": ["string"],
        },
        "limits": {
            "maxMissingKeywords": settings.max_keywords,
            "maxActionPlan": settings.max_action_plan,
        },
        "cv": _trim_payload(cv),
        "job": _trim_payload(job),
    }

    return system_prompt, json.dumps(payload, ensure_ascii=False)


def _trim_payload(payload: dict) -> dict:
    max_chars = settings.max_input_chars
    trimmed = {}
    for key, value in payload.items():
        if isinstance(value, str):
            trimmed[key] = _trim_text(value, max_chars)
        elif isinstance(value, list):
            trimmed[key] = _trim_list(value, settings.max_improvements * 2)
        elif isinstance(value, dict):
            trimmed[key] = value
        else:
            trimmed[key] = value
    return trimmed
