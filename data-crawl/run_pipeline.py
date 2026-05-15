"""
run_pipeline.py — Chạy toàn bộ pipeline xử lý dữ liệu job

Pipeline gồm 3 bước:
  1. Filter & Score   — lọc job phù hợp intern/fresher/junior
  2. Normalize & Enrich — chuẩn hóa title, company, location, salary, dedup
  3. Skills Extraction — trích xuất kỹ năng từ mô tả

Cách dùng:
  python run_pipeline.py
  python run_pipeline.py --input data_jobs.json --limit 5000 --output output_jobs_clean.json
  python run_pipeline.py --verbose --stats
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Any

# Thêm parent dir vào path để import pipeline package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline.step1_filter import filter_jobs
from pipeline.step2_normalize import normalize_jobs
from pipeline.step3_skills import enrich_jobs_with_skills


DEFAULT_INPUT = os.path.join(os.path.dirname(__file__), "data_jobs.json")
DEFAULT_OUTPUT = os.path.join(os.path.dirname(__file__), "data_jobs_pipeline_output.json")
DEFAULT_REJECTED = os.path.join(os.path.dirname(__file__), "data_jobs_rejected.json")
DEFAULT_STATS = os.path.join(os.path.dirname(__file__), "pipeline_stats.json")


def load_data(path: str, limit: int | None = None) -> list[dict[str, Any]]:
    """Load raw job data from JSON."""
    print(f"📂 Loading: {path}")
    t0 = time.time()

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        data = [data]

    total = len(data)
    if limit and limit < total:
        data = data[:limit]
        print(f"   Loaded {total:,} jobs, using first {limit:,}")
    else:
        print(f"   Loaded {total:,} jobs")

    print(f"   Time: {time.time() - t0:.1f}s")
    return data


def save_data(data: list[dict[str, Any]], path: str, label: str = ""):
    """Save processed data to JSON."""
    print(f"💾 Saving {label}: {path} ({len(data):,} records)")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def clean_output(job: dict[str, Any]) -> dict[str, Any]:
    """
    Prepare final output: chuyển từ internal format sang format phù hợp seed vào DB.
    Remove internal scoring fields, flatten skills.
    """
    out: dict[str, Any] = {}

    # ─── Core fields ─────────────────────────────────────────────────────
    out["title"] = job.get("title", "")
    out["company"] = job.get("company", "")
    out["description"] = job.get("description", "")
    out["requirement"] = job.get("requirement", "")
    out["benefit"] = job.get("benefit", "")
    out["location"] = job.get("location", "")
    out["locations"] = job.get("locations", [])
    out["industry"] = job.get("industry", "")

    # ─── Parsed fields ───────────────────────────────────────────────────
    out["salary"] = job.get("salary", "")
    out["salary_min"] = job.get("salary_min")
    out["salary_max"] = job.get("salary_max")
    out["employment_type"] = job.get("employment_type", "full-time")
    out["degree"] = job.get("degree", "")
    out["experience"] = job.get("experience", "")
    out["age"] = job.get("age", "")

    # ─── Skills ──────────────────────────────────────────────────────────
    out["skill_tags"] = job.get("_skill_tags", [])
    out["skill_categories"] = job.get("_skill_categories", [])
    out["skills_detail"] = job.get("_skills", [])

    # ─── Metadata ────────────────────────────────────────────────────────
    out["url"] = job.get("url", "")
    out["src"] = job.get("src", "")
    out["deadline"] = job.get("deadline", "")
    out["other_info"] = job.get("other_info", "")

    # ─── Score info (useful for debugging/review) ────────────────────────
    out["_fresher_score"] = job.get("_score", 0)

    return out


def generate_stats(
    raw_count: int,
    accepted: list[dict[str, Any]],
    rejected: list[dict[str, Any]],
) -> dict[str, Any]:
    """Generate pipeline statistics."""
    from collections import Counter

    stats: dict[str, Any] = {
        "input_total": raw_count,
        "accepted": len(accepted),
        "rejected": len(rejected),
        "acceptance_rate": f"{len(accepted) / max(raw_count, 1) * 100:.1f}%",
    }

    # Score distribution
    scores = [j.get("_score", 0) for j in accepted]
    if scores:
        import statistics
        stats["score_stats"] = {
            "min": min(scores),
            "max": max(scores),
            "mean": round(statistics.mean(scores), 1),
            "median": round(statistics.median(scores), 0),
        }

    # Employment type distribution
    emp_types = Counter(j.get("employment_type", "unknown") for j in accepted)
    stats["employment_types"] = dict(emp_types.most_common())

    # Top locations
    all_locations = []
    for j in accepted:
        all_locations.extend(j.get("locations", []))
    stats["top_locations"] = dict(Counter(all_locations).most_common(15))

    # Top skills
    all_skills = []
    for j in accepted:
        all_skills.extend(j.get("_skill_tags", []))
    stats["top_skills"] = dict(Counter(all_skills).most_common(30))

    # Top skill categories
    all_cats = []
    for j in accepted:
        all_cats.extend(j.get("_skill_categories", []))
    stats["top_skill_categories"] = dict(Counter(all_cats).most_common())

    # Top rejection reasons
    reject_reasons = Counter()
    for j in rejected:
        for r in j.get("_score_reasons", []):
            if r.startswith("-"):
                reason_type = r.split(":")[0]
                reject_reasons[reason_type] += 1
    stats["top_rejection_reasons"] = dict(reject_reasons.most_common(15))

    # Source distribution
    sources = Counter(j.get("src", "unknown") for j in accepted)
    stats["sources"] = dict(sources.most_common())

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Pipeline xử lý dữ liệu job cho nền tảng tuyển dụng sinh viên TDMU"
    )
    parser.add_argument("--input", "-i", default=DEFAULT_INPUT, help="File JSON đầu vào")
    parser.add_argument("--output", "-o", default=DEFAULT_OUTPUT, help="File JSON đầu ra (jobs đã lọc)")
    parser.add_argument("--rejected-output", default=DEFAULT_REJECTED, help="File JSON chứa jobs bị loại")
    parser.add_argument("--stats-output", default=DEFAULT_STATS, help="File JSON chứa thống kê")
    parser.add_argument("--limit", "-n", type=int, default=None, help="Giới hạn số job xử lý (để test)")
    parser.add_argument("--verbose", "-v", action="store_true", help="In chi tiết từng bước")
    parser.add_argument("--stats", "-s", action="store_true", help="Xuất file thống kê")
    parser.add_argument("--no-rejected", action="store_true", help="Không lưu file rejected")
    parser.add_argument("--threshold", type=int, default=None, help="Override score threshold")
    args = parser.parse_args()

    print("=" * 70)
    print("🚀 TDMU Job Processing Pipeline")
    print("=" * 70)
    total_t0 = time.time()

    # ─── Load ────────────────────────────────────────────────────────────
    raw_jobs = load_data(args.input, args.limit)
    raw_count = len(raw_jobs)

    # ─── Step 1: Filter ──────────────────────────────────────────────────
    print("\n" + "─" * 70)
    print("📋 Step 1: Filter & Score (lọc job phù hợp sinh viên/fresher)")
    print("─" * 70)
    t0 = time.time()

    threshold = args.threshold if args.threshold is not None else None
    filter_kwargs = {"verbose": args.verbose}
    if threshold is not None:
        filter_kwargs["threshold"] = threshold

    accepted, rejected = filter_jobs(raw_jobs, **filter_kwargs)
    print(f"   ✅ Accepted: {len(accepted):,} | ❌ Rejected: {len(rejected):,}")
    print(f"   Time: {time.time() - t0:.1f}s")

    # ─── Step 2: Normalize ───────────────────────────────────────────────
    print("\n" + "─" * 70)
    print("🔧 Step 2: Normalize & Enrich (chuẩn hóa dữ liệu)")
    print("─" * 70)
    t0 = time.time()

    accepted = normalize_jobs(accepted, verbose=args.verbose)
    print(f"   ✅ After dedup: {len(accepted):,} jobs")
    print(f"   Time: {time.time() - t0:.1f}s")

    # ─── Step 3: Skills Extraction ───────────────────────────────────────
    print("\n" + "─" * 70)
    print("🎯 Step 3: Skills Extraction (trích xuất kỹ năng)")
    print("─" * 70)
    t0 = time.time()

    accepted = enrich_jobs_with_skills(accepted, verbose=args.verbose)
    print(f"   Time: {time.time() - t0:.1f}s")

    # ─── Output ──────────────────────────────────────────────────────────
    print("\n" + "─" * 70)
    print("💾 Saving results")
    print("─" * 70)

    # Clean output
    output_jobs = [clean_output(j) for j in accepted]
    save_data(output_jobs, args.output, "accepted jobs")

    if not args.no_rejected:
        rejected_output = [clean_output(j) for j in rejected]
        save_data(rejected_output, args.rejected_output, "rejected jobs")

    # Stats
    if args.stats:
        stats = generate_stats(raw_count, accepted, rejected)
        save_data([stats], args.stats_output, "statistics")

        print("\n📊 Pipeline Statistics:")
        print(f"   Input:    {stats['input_total']:,}")
        print(f"   Accepted: {stats['accepted']:,} ({stats['acceptance_rate']})")
        print(f"   Rejected: {stats['rejected']:,}")
        if "score_stats" in stats:
            ss = stats["score_stats"]
            print(f"   Score:    min={ss['min']}, max={ss['max']}, mean={ss['mean']}, median={ss['median']}")
        print(f"   Types:    {stats.get('employment_types', {})}")
        print(f"   Top locations: {list(stats.get('top_locations', {}).keys())[:5]}")
        print(f"   Top skills:    {list(stats.get('top_skills', {}).keys())[:10]}")

    # ─── Summary ─────────────────────────────────────────────────────────
    total_time = time.time() - total_t0
    print("\n" + "=" * 70)
    print(f"✅ Pipeline hoàn tất! ({total_time:.1f}s)")
    print(f"   📄 Output: {args.output}")
    print(f"   📊 {len(output_jobs):,} jobs sẵn sàng để import")
    print("=" * 70)


if __name__ == "__main__":
    main()
