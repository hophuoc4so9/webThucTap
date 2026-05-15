"""
Step 3: Skills Extraction — trích xuất kỹ năng từ description/requirement.
Sử dụng keyword matching + regex + normalization.
"""
from __future__ import annotations

import re
from typing import Any

from .config import SKILLS_TAXONOMY


# Build reverse lookup: skill_name_lower → (category, canonical_name)
_SKILL_LOOKUP: dict[str, tuple[str, str]] = {}
_SKILL_PATTERNS: list[tuple[re.Pattern, str, str]] = []

for category, skills in SKILLS_TAXONOMY.items():
    for skill in skills:
        # Skip skills ≤ 2 chars to avoid false positives (e.g., "Go", "AI", "R")
        if len(skill) <= 2:
            continue

        lower = skill.lower()
        _SKILL_LOOKUP[lower] = (category, skill)

        # Build regex pattern for word-boundary matching
        # Escape special regex chars in skill name
        escaped = re.escape(skill)
        # For single-word skills or skills with special chars, use boundary matching
        pattern = re.compile(
            r"(?<![a-zA-Z0-9])" + escaped + r"(?![a-zA-Z0-9])",
            re.IGNORECASE,
        )
        _SKILL_PATTERNS.append((pattern, category, skill))

# Sort by length descending to match longer skills first (e.g., "React Native" before "React")
_SKILL_PATTERNS.sort(key=lambda x: len(x[2]), reverse=True)


def extract_skills(
    text: str,
    min_confidence: float = 0.0,
) -> list[dict[str, Any]]:
    """
    Extract skills from text using taxonomy matching.
    Returns list of {name, category, confidence, count}.
    """
    if not text:
        return []

    found: dict[str, dict[str, Any]] = {}  # canonical_name → info

    for pattern, category, canonical in _SKILL_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            count = len(matches)
            if canonical not in found:
                found[canonical] = {
                    "name": canonical,
                    "category": category,
                    "count": count,
                    "confidence": _calculate_confidence(canonical, count, text),
                }
            else:
                found[canonical]["count"] += count

    # Filter by confidence
    results = [v for v in found.values() if v["confidence"] >= min_confidence]

    # Sort by confidence desc, then count desc
    results.sort(key=lambda x: (-x["confidence"], -x["count"]))

    return results


def _calculate_confidence(skill: str, count: int, text: str) -> float:
    """
    Calculate confidence score for a skill extraction.
    Based on: count, text length, skill specificity.
    """
    base = 0.5

    # More occurrences → higher confidence
    if count >= 3:
        base += 0.3
    elif count >= 2:
        base += 0.2
    elif count >= 1:
        base += 0.1

    # Longer skill names are more specific → higher confidence
    if len(skill) >= 10:
        base += 0.1
    elif len(skill) >= 5:
        base += 0.05

    # Multi-word skills are more specific
    if " " in skill or "/" in skill or "." in skill:
        base += 0.1

    return min(base, 1.0)


def extract_skills_for_job(job: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Extract skills from a job's description + requirement fields.
    """
    texts = [
        job.get("description") or "",
        job.get("requirement") or "",
        job.get("title") or "",
    ]
    combined = "\n".join(texts)
    return extract_skills(combined)


def enrich_jobs_with_skills(
    jobs: list[dict[str, Any]],
    verbose: bool = False,
) -> list[dict[str, Any]]:
    """
    Add skills extraction to each job.
    Adds: _skills (list), _skill_tags (list of names), _skill_categories (list)
    """
    total_skills = 0

    for job in jobs:
        skills = extract_skills_for_job(job)
        job["_skills"] = skills
        job["_skill_tags"] = [s["name"] for s in skills]
        job["_skill_categories"] = list(set(s["category"] for s in skills))
        total_skills += len(skills)

    if verbose:
        avg_skills = total_skills / max(len(jobs), 1)
        jobs_with_skills = sum(1 for j in jobs if j.get("_skill_tags"))
        print(f"[skills] Extracted {total_skills} skill mentions across {len(jobs)} jobs")
        print(f"[skills] Average: {avg_skills:.1f} skills/job")
        print(f"[skills] Jobs with ≥1 skill: {jobs_with_skills} ({jobs_with_skills/max(len(jobs),1)*100:.1f}%)")

        # Top skills
        from collections import Counter
        all_tags = []
        for j in jobs:
            all_tags.extend(j.get("_skill_tags", []))
        top = Counter(all_tags).most_common(20)
        print(f"[skills] Top 20 skills: {', '.join(f'{name}({cnt})' for name, cnt in top)}")

    return jobs
