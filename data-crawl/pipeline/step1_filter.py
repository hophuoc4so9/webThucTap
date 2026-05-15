"""
Step 1: Filter & Score — loại bỏ job không phù hợp sinh viên / fresher.
Sử dụng scoring system: mỗi job tích điểm dựa trên các tín hiệu,
job dưới ngưỡng bị loại.
"""
from __future__ import annotations

import re
from typing import Any

from .config import (
    MAX_EXPERIENCE_YEARS,
    TITLE_BLACKLIST_EXACT,
    TITLE_BLACKLIST_WORD,
    TITLE_WHITELIST,
    EXPERIENCE_BLACKLIST_PATTERNS,
    REQUIREMENT_SENIOR_KEYWORDS,
    SCORE_WEIGHTS,
    SCORE_REJECTION_THRESHOLD,
    SALARY_FRESHER_MAX_VND,
)


def _lower(text: str | None) -> str:
    """Lowercase + strip safely."""
    return (text or "").lower().strip()


def _parse_experience_years(exp: str | None) -> float | None:
    """
    Parse experience field to a number of years.
    Returns None if cannot parse, 0 if explicitly "Chưa có kinh nghiệm".
    """
    if not exp:
        return None

    raw = _lower(exp)

    # Explicit no experience
    if any(kw in raw for kw in [
        "chưa có kinh nghiệm", "không yêu cầu", "không cần",
        "no experience", "not required", "không có yêu cầu"
    ]):
        return 0.0

    # Patterns like "2 - 4 Năm", "Trên 3 Năm", "1-2 years", "Lên đến 2 Năm"
    # First try range: "X - Y"
    range_match = re.search(r'(\d+)\s*[-–]\s*(\d+)', raw)
    if range_match:
        low = int(range_match.group(1))
        return float(low)

    # "Trên X" or "Over X"
    over_match = re.search(r'(?:trên|over|above|>)\s*(\d+)', raw)
    if over_match:
        return float(over_match.group(1))

    # "Lên đến X" / "Up to X"
    upto_match = re.search(r'(?:lên đến|up\s*to|dưới|under|<)\s*(\d+)', raw)
    if upto_match:
        return float(upto_match.group(1)) * 0.5  # conservative estimate

    # Just a number
    num_match = re.search(r'(\d+)', raw)
    if num_match:
        return float(num_match.group(1))

    return None


def _parse_salary_vnd(salary: str | None) -> float | None:
    """Parse salary string to VND amount (max value in range)."""
    if not salary:
        return None

    raw = _lower(salary)
    if any(kw in raw for kw in ["cạnh tranh", "thỏa thuận", "thương lượng", "negotiable"]):
        return None

    # Handle USD
    is_usd = "usd" in raw or "$" in raw

    # Extract numbers
    numbers = re.findall(r'[\d,.]+', raw.replace(",", ""))
    if not numbers:
        return None

    values = []
    for n in numbers:
        try:
            val = float(n.replace(".", "").replace(",", ""))
            values.append(val)
        except ValueError:
            continue

    if not values:
        return None

    max_val = max(values)

    # Convert to VND if needed
    if is_usd:
        max_val *= 25_000
    elif "tr" in raw or "triệu" in raw:
        max_val *= 1_000_000

    return max_val


def _parse_age_min(age: str | None) -> int | None:
    """Extract minimum age from age field."""
    if not age:
        return None
    raw = _lower(age)
    if "không giới hạn" in raw or "không yêu cầu" in raw:
        return None

    # "25 - 35" → 25
    match = re.search(r'(\d+)\s*[-–]\s*(\d+)', raw)
    if match:
        return int(match.group(1))

    # "Trên 23" → 23
    match = re.search(r'(?:trên|trên\s+|>)\s*(\d+)', raw)
    if match:
        return int(match.group(1))

    # "Dưới 45" → no useful min
    return None


def score_job(job: dict[str, Any]) -> tuple[int, list[str]]:
    """
    Score a job based on suitability for intern/fresher/junior.
    Returns (score, list_of_reasons).
    Higher = more suitable. Below threshold → reject.
    """
    score = 0
    reasons: list[str] = []

    title = _lower(job.get("title"))
    experience_raw = job.get("experience")
    requirement = _lower(job.get("requirement"))
    description = _lower(job.get("description"))
    salary_raw = job.get("salary")
    age_raw = job.get("age")
    industry = _lower(job.get("industry"))

    # ─── Title whitelist (strong positive) ───────────────────────────────
    for kw in TITLE_WHITELIST:
        if kw in title:
            score += SCORE_WEIGHTS["title_whitelist_match"]
            reasons.append(f"+title_whitelist:{kw}")
            break

    # ─── Title blacklist exact (immediate reject) ────────────────────────
    for kw in TITLE_BLACKLIST_EXACT:
        if kw in title:
            score += SCORE_WEIGHTS["title_blacklist_exact"]
            reasons.append(f"-title_blacklist_exact:{kw}")
            break

    # ─── Title blacklist word ────────────────────────────────────────────
    for kw in TITLE_BLACKLIST_WORD:
        if kw in title:
            score += SCORE_WEIGHTS["title_blacklist_word"]
            reasons.append(f"-title_blacklist_word:{kw}")
            break

    # ─── Experience analysis ─────────────────────────────────────────────
    exp_years = _parse_experience_years(experience_raw)

    if exp_years is None:
        # No experience info → neutral/positive (might accept anyone)
        score += SCORE_WEIGHTS["experience_empty"]
        reasons.append("+experience_empty")
    elif exp_years == 0:
        score += SCORE_WEIGHTS["experience_low"]
        reasons.append("+experience_none_required")
    elif exp_years <= 1:
        score += SCORE_WEIGHTS["experience_low"]
        reasons.append(f"+experience_low:{exp_years}y")
    elif exp_years >= 3:
        score += SCORE_WEIGHTS["experience_high"]
        reasons.append(f"-experience_high:{exp_years}y")

    # ─── Experience text pattern blacklist ────────────────────────────────
    exp_text = _lower(experience_raw)
    for pattern in EXPERIENCE_BLACKLIST_PATTERNS:
        if re.search(pattern, exp_text, re.IGNORECASE):
            score += -10
            reasons.append(f"-experience_pattern:{pattern[:30]}")
            break

    # ─── Requirement senior keywords ─────────────────────────────────────
    combined_text = f"{requirement} {description}"
    senior_hits = 0
    for kw in REQUIREMENT_SENIOR_KEYWORDS:
        if kw in combined_text:
            senior_hits += 1
    if senior_hits > 0:
        penalty = min(senior_hits * SCORE_WEIGHTS["requirement_senior"], -75)
        score += penalty
        reasons.append(f"-requirement_senior:{senior_hits}hits")

    # ─── Salary check ────────────────────────────────────────────────────
    salary_vnd = _parse_salary_vnd(salary_raw)
    if salary_vnd and salary_vnd > SALARY_FRESHER_MAX_VND:
        score += SCORE_WEIGHTS["salary_too_high"]
        reasons.append(f"-salary_high:{salary_vnd/1e6:.0f}M")

    # ─── Age requirement ─────────────────────────────────────────────────
    age_min = _parse_age_min(age_raw)
    if age_min and age_min >= 28:
        score += SCORE_WEIGHTS["age_min_high"]
        reasons.append(f"-age_min_high:{age_min}")

    # ─── Industry bonus ──────────────────────────────────────────────────
    if "mới tốt nghiệp" in industry or "thực tập" in industry:
        score += SCORE_WEIGHTS["industry_student"]
        reasons.append("+industry_student")

    # ─── Degree bonus ────────────────────────────────────────────────────
    degree = _lower(job.get("degree"))
    if degree in ["trung học", "thpt"]:
        score += SCORE_WEIGHTS["degree_thpt"]
        reasons.append("+degree_thpt")

    return score, reasons


def filter_jobs(
    jobs: list[dict[str, Any]],
    threshold: int = SCORE_REJECTION_THRESHOLD,
    verbose: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Filter jobs. Returns (accepted, rejected).
    Each accepted job gets '_score' and '_score_reasons' injected.
    """
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    for job in jobs:
        score, reasons = score_job(job)
        job["_score"] = score
        job["_score_reasons"] = reasons

        if score >= threshold:
            accepted.append(job)
        else:
            rejected.append(job)

    if verbose:
        print(f"[filter] Total: {len(jobs)}")
        print(f"[filter] Accepted: {len(accepted)} ({len(accepted)/max(len(jobs),1)*100:.1f}%)")
        print(f"[filter] Rejected: {len(rejected)} ({len(rejected)/max(len(jobs),1)*100:.1f}%)")

        # Score distribution
        scores = [j["_score"] for j in jobs]
        if scores:
            import statistics
            print(f"[filter] Score range: {min(scores)} → {max(scores)}, "
                  f"median={statistics.median(scores):.0f}, mean={statistics.mean(scores):.1f}")

    return accepted, rejected
