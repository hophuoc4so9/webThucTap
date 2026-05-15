"""
Step 2: Normalize & Enrich — chuẩn hóa dữ liệu sau khi lọc.
- Clean title
- Normalize company name
- Normalize location
- Parse & normalize salary
- Detect employment type
- Deduplicate
"""
from __future__ import annotations

import re
import unicodedata
from hashlib import md5
from typing import Any

from .config import (
    LOCATION_ALIASES,
    EMPLOYMENT_TYPE_MAP,
    DUPLICATE_TITLE_SIMILARITY,
)


# ─── Text Cleaning ───────────────────────────────────────────────────────────

def _clean_text(text: str | None) -> str:
    """Strip, collapse whitespace, remove control chars."""
    if not text:
        return ""
    # Remove control chars
    text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C" or ch in "\n\r\t")
    # Collapse whitespace
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _clean_title(title: str | None) -> str:
    """Clean job title: remove codes, brackets, excessive punctuation."""
    if not title:
        return ""
    text = _clean_text(title)

    # Remove leading job codes like "123932 - "
    text = re.sub(r"^\d{4,}\s*[-–]\s*", "", text)

    # Remove [location] prefix/suffix like "[Hà Nội]" or "(Hà Nội)"
    text = re.sub(r"\[([^\]]+)\]\s*[-–]?\s*", "", text)
    text = re.sub(r"\(Phỏng vấn[^)]*\)", "", text, flags=re.IGNORECASE)

    # Remove " - GẤP" at the end
    text = re.sub(r"\s*[-–]\s*GẤP\s*$", "", text, flags=re.IGNORECASE)

    # Collapse whitespace again
    text = re.sub(r"\s+", " ", text).strip()

    # Title case normalization (capitalize first letter of each word)
    # But keep all-caps words like QC, IT, HR, etc.
    words = text.split()
    result = []
    for w in words:
        if w.isupper() and len(w) <= 5:
            result.append(w)  # Keep short acronyms as-is
        elif w.isupper():
            result.append(w.capitalize())
        else:
            result.append(w)
    return " ".join(result)


def _normalize_company(name: str | None) -> str:
    """Normalize company name: collapse case, trim legal suffixes."""
    if not name:
        return ""
    text = _clean_text(name)

    # Remove excessive whitespace within name
    text = re.sub(r"\s+", " ", text)

    # Standardize common prefixes — keep them but clean up
    # "CÔNG TY TNHH" → "Công Ty TNHH"
    text = re.sub(r"^CÔNG TY", "Công Ty", text, flags=re.IGNORECASE)
    text = re.sub(r"^CTY", "Công Ty", text, flags=re.IGNORECASE)

    return text.strip()


def _normalize_location(location: str | None) -> list[str]:
    """
    Normalize location field to a list of standard province names.
    Input: "Hồ Chí Minh Đà Nẵng Hà Nội"  →  ["Hồ Chí Minh", "Đà Nẵng", "Hà Nội"]
    """
    if not location:
        return []

    text = _clean_text(location).lower()

    # First, try direct match with aliases
    result: list[str] = []
    found_keys: set[str] = set()

    # Sort aliases by length (longest first) to avoid partial matches
    sorted_aliases = sorted(LOCATION_ALIASES.items(), key=lambda x: len(x[0]), reverse=True)

    for alias, standard in sorted_aliases:
        if alias in text and standard not in result:
            result.append(standard)
            found_keys.add(alias)

    # If nothing found, try splitting by common delimiters
    if not result:
        parts = re.split(r"[,;/|]", text)
        for part in parts:
            part = part.strip()
            if part and part in LOCATION_ALIASES:
                standard = LOCATION_ALIASES[part]
                if standard not in result:
                    result.append(standard)
            elif part:
                # Capitalize properly and add as-is
                capitalized = part.title()
                if capitalized not in result:
                    result.append(capitalized)

    return result


def _parse_salary(salary: str | None) -> dict[str, Any] | None:
    """
    Parse salary into structured format.
    Returns: {"raw": str, "min": int|None, "max": int|None, "currency": "VND"|"USD"}
    """
    if not salary:
        return None

    raw = _clean_text(salary)
    lower = raw.lower()

    if any(kw in lower for kw in ["cạnh tranh", "thỏa thuận", "thương lượng", "negotiable"]):
        return {"raw": raw, "min": None, "max": None, "currency": "VND", "type": "negotiable"}

    # Detect currency
    currency = "USD" if ("usd" in lower or "$" in lower) else "VND"
    multiplier = 25_000 if currency == "USD" else 1

    # Check for "Tr" (triệu) or "triệu"
    if "tr" in lower or "triệu" in lower:
        multiplier *= 1_000_000
    elif currency == "VND" and multiplier == 1:
        # If numbers are small (< 100), they're probably in millions
        pass

    # Extract numbers
    numbers = re.findall(r'[\d]+(?:[.,]\d+)?', raw.replace(",", ""))
    values = []
    for n in numbers:
        try:
            val = float(n.replace(".", ""))
            if val > 0:
                values.append(val)
        except ValueError:
            continue

    if not values:
        return {"raw": raw, "min": None, "max": None, "currency": "VND", "type": "unknown"}

    # Apply multiplier
    vnd_values = [int(v * multiplier) for v in values]

    # If values are still small (< 1000), assume millions
    if max(vnd_values) < 1000 and currency == "VND":
        vnd_values = [v * 1_000_000 for v in vnd_values]

    sal_min = min(vnd_values) if vnd_values else None
    sal_max = max(vnd_values) if len(vnd_values) > 1 else sal_min

    return {
        "raw": raw,
        "min": sal_min,
        "max": sal_max,
        "currency": "VND",  # Normalized to VND
        "type": "range" if len(vnd_values) > 1 else "fixed",
    }


def _detect_employment_type(job: dict[str, Any]) -> str:
    """Detect employment type from title, description, other_info."""
    combined = " ".join([
        (job.get("title") or ""),
        (job.get("description") or ""),
        (job.get("other_info") or ""),
    ]).lower()

    # Check for internship first (highest priority)
    for kw in ["thực tập", "intern", "internship"]:
        if kw in combined:
            return "internship"

    for kw in ["part-time", "bán thời gian", "parttime"]:
        if kw in combined:
            return "part-time"

    for kw in ["freelance", "remote", "từ xa"]:
        if kw in combined:
            return kw if kw != "từ xa" else "remote"

    return "full-time"  # Default


# ─── Deduplication ───────────────────────────────────────────────────────────

def _job_fingerprint(job: dict[str, Any]) -> str:
    """Create fingerprint for dedup: title + company + location."""
    parts = [
        (job.get("title") or "").lower().strip(),
        (job.get("company") or "").lower().strip(),
        (job.get("location") or "").lower().strip(),
    ]
    raw = "|".join(parts)
    return md5(raw.encode("utf-8")).hexdigest()


def _jaccard_similarity(a: str, b: str) -> float:
    """Compute Jaccard similarity between two strings (word-level)."""
    set_a = set(a.lower().split())
    set_b = set(b.lower().split())
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def deduplicate_jobs(
    jobs: list[dict[str, Any]],
    verbose: bool = False,
) -> list[dict[str, Any]]:
    """
    Remove duplicate jobs.
    Strategy: exact fingerprint match → remove.
    Also does fuzzy title+company match with Jaccard similarity.
    """
    seen_fingerprints: set[str] = set()
    seen_urls: set[str] = set()
    unique_jobs: list[dict[str, Any]] = []
    dup_count = 0

    for job in jobs:
        # 1. Exact URL dedup
        url = (job.get("url") or "").strip()
        if url and url in seen_urls:
            dup_count += 1
            continue
        if url:
            seen_urls.add(url)

        # 2. Fingerprint dedup (title + company + location)
        fp = _job_fingerprint(job)
        if fp in seen_fingerprints:
            dup_count += 1
            continue
        seen_fingerprints.add(fp)

        unique_jobs.append(job)

    if verbose:
        print(f"[dedup] Removed {dup_count} duplicates, {len(unique_jobs)} unique jobs remain")

    return unique_jobs


# ─── Main normalize function ────────────────────────────────────────────────

def normalize_jobs(
    jobs: list[dict[str, Any]],
    verbose: bool = False,
) -> list[dict[str, Any]]:
    """
    Apply all normalization steps to a list of jobs.
    """
    result: list[dict[str, Any]] = []

    for job in jobs:
        normalized = dict(job)  # shallow copy

        # Clean & normalize fields
        normalized["title"] = _clean_title(job.get("title"))
        normalized["company"] = _normalize_company(job.get("company"))
        normalized["description"] = _clean_text(job.get("description"))
        normalized["requirement"] = _clean_text(job.get("requirement"))
        normalized["benefit"] = _clean_text(job.get("benefit"))
        normalized["other_info"] = _clean_text(job.get("other_info"))

        # Location
        locations = _normalize_location(job.get("location"))
        normalized["location"] = ", ".join(locations) if locations else ""
        normalized["locations"] = locations

        # Salary
        salary_parsed = _parse_salary(job.get("salary"))
        normalized["salary_parsed"] = salary_parsed
        if salary_parsed:
            normalized["salary_min"] = salary_parsed.get("min")
            normalized["salary_max"] = salary_parsed.get("max")

        # Employment type
        normalized["employment_type"] = _detect_employment_type(job)

        result.append(normalized)

    # Deduplicate
    result = deduplicate_jobs(result, verbose=verbose)

    if verbose:
        print(f"[normalize] Processed {len(result)} jobs")
        # Stats
        with_salary = sum(1 for j in result if j.get("salary_parsed") and j["salary_parsed"].get("min"))
        internships = sum(1 for j in result if j.get("employment_type") == "internship")
        print(f"[normalize] With salary: {with_salary}, Internships: {internships}")

    return result
