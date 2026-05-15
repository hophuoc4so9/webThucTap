"""
seed_pipeline_data.py — Xóa dữ liệu cũ và import lại từ pipeline output

Thứ tự thực hiện:
  1. DELETE /jobs/clear-all       → xóa toàn bộ jobs cũ
  2. Xóa companies cũ (dùng API)
  3. POST /companies              → tạo company mới (status=approved, bỏ qua xác thực)
  4. POST /jobs/seed              → seed jobs mới từ pipeline output

Cách dùng:
    python seed_pipeline_data.py
    python seed_pipeline_data.py --url http://localhost:8082 --limit 5000 --batch 20
    python seed_pipeline_data.py --skip-clear  # không xóa dữ liệu cũ
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
import sys
import unicodedata
from datetime import date, timedelta

import requests

# ──────────────────────────────────────────────────────────────────────────────
GATEWAY_URL = "http://localhost:8082"
DATA_FILE = os.path.join(os.path.dirname(__file__), "data_jobs_pipeline_output.json")
JOB_LIMIT = 5000
BATCH_SIZE = 20

# Khoảng deadline: 01/07/2026 → 31/08/2026
DEADLINE_START = date(2026, 7, 1)
DEADLINE_END = date(2026, 8, 31)

SIZES = ["1-50", "50-100", "100-500", "500-1000", "1000+"]
NATIONALITIES = ["Việt Nam"]


# ──────────────────────────────────────────────────────────────────────────────
def slugify(text: str) -> str:
    if not text:
        return "company"
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[\s_-]+", ".", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:40] or "company"


def random_deadline() -> str:
    delta = (DEADLINE_END - DEADLINE_START).days
    d = DEADLINE_START + timedelta(days=random.randint(0, delta))
    return d.strftime("%d/%m/%Y")


def load_data(file_path: str, limit: int | None) -> list[dict]:
    print(f"[data] Doc file: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        data = [data]
    total = len(data)
    if limit and limit < total:
        data = data[:limit]
        print(f"[data] Tong: {total:,} jobs -> lay {limit:,} ban dau")
    else:
        print(f"[data] Tong: {total:,} jobs")
    return data


def extract_companies(raw_list: list[dict]) -> list[str]:
    names = {r.get("company") for r in raw_list}
    names.discard(None)
    names.discard("")
    return sorted(names)


# ──────────────────────────────────────────────────────────────────────────────
def clear_old_data(url: str):
    """Xóa toàn bộ jobs cũ và companies cũ."""
    print("\n[clear] Xoa toan bo jobs cu...")
    try:
        resp = requests.delete(f"{url}/jobs/clear-all", timeout=60)
        if resp.status_code in (200, 201):
            print(f"[clear] Jobs: {resp.json()}")
        else:
            print(f"[clear] Jobs: HTTP {resp.status_code} - {resp.text[:200]}")
    except Exception as e:
        print(f"[clear] Jobs ERROR: {e}")

    # Xóa companies - lấy danh sách rồi xóa từng cái
    print("[clear] Xoa toan bo companies cu...")
    try:
        # Lấy tất cả companies (bao gồm cả pending)
        page = 1
        deleted = 0
        while True:
            resp = requests.get(
                f"{url}/companies/admin",
                params={"page": page, "limit": 100},
                timeout=30,
            )
            if resp.status_code != 200:
                print(f"[clear] Loi lay companies: HTTP {resp.status_code}")
                break

            body = resp.json()
            companies = body.get("data", [])
            if not companies:
                break

            for c in companies:
                cid = c.get("id")
                if cid:
                    try:
                        del_resp = requests.delete(f"{url}/companies/{cid}", timeout=10)
                        if del_resp.status_code in (200, 201):
                            deleted += 1
                        else:
                            print(f"  ! Loi xoa company #{cid}: HTTP {del_resp.status_code}")
                    except Exception as e:
                        print(f"  ! Loi xoa company #{cid}: {e}")

            total = body.get("total", 0)
            if page * 100 >= total:
                break
            page += 1

        print(f"[clear] Da xoa {deleted} companies")
    except Exception as e:
        print(f"[clear] Companies ERROR: {e}")


# ──────────────────────────────────────────────────────────────────────────────
def create_companies(
    url: str,
    company_names: list[str],
    raw_list: list[dict],
) -> dict[str, int]:
    """
    Tạo hồ sơ công ty với status=approved (bỏ qua xác thực admin).
    Returns: dict company_name → company_id
    """
    companies_url = f"{url}/companies"
    id_map: dict[str, int] = {}

    # Gom industry và location đầu tiên cho mỗi công ty
    industry_map: dict[str, str] = {}
    location_map: dict[str, str] = {}
    for r in raw_list:
        name = r.get("company")
        if name and name not in industry_map:
            industry_map[name] = r.get("industry") or ""
        if name and name not in location_map:
            location_map[name] = r.get("location") or ""

    # Đếm số job cho mỗi công ty
    job_count_map: dict[str, int] = {}
    for r in raw_list:
        name = r.get("company")
        if name:
            job_count_map[name] = job_count_map.get(name, 0) + 1

    print(f"\n[company] Tao {len(company_names)} ho so cong ty (status=approved)...")
    ok = skip = err = 0

    for i, name in enumerate(company_names):
        slug = slugify(name)
        industry = industry_map.get(name, "")
        short_addr = location_map.get(name, "Viet Nam")
        job_count = job_count_map.get(name, 1)

        payload = {
            "name": name,
            "logo": f"https://placehold.co/200x200?text={requests.utils.quote(name[:10])}",
            "shortDescription": f"{name} - tuyen dung tai {short_addr}.",
            "currentJobOpening": min(job_count, 50),
            "industry": industry or "Khac",
            "size": random.choice(SIZES),
            "nationality": random.choice(NATIONALITIES),
            "website": f"https://{slug}.example.com",
            "address": short_addr,
            "shortAddress": short_addr,
            "description": (
                f"{name} la don vi hoat dong trong linh vuc {industry}. "
                "Chung toi cam ket mang den moi truong lam viec nang dong, chuyen nghiep "
                "va nhieu co hoi phat trien cho cac ung vien tai nang."
            ),
            "banner": f"https://placehold.co/1200x300?text={requests.utils.quote(name[:20])}",
            "followers": random.randint(0, 5000),
            # ⚡ KEY: set status=approved để bỏ qua xác thực admin
            "status": "approved",
            "isAutoVerified": True,
        }
        try:
            resp = requests.post(companies_url, json=payload, timeout=15)
            if resp.status_code in (200, 201):
                body = resp.json()
                company_id = body.get("id")
                if company_id:
                    id_map[name] = company_id
                ok += 1
            elif resp.status_code == 409:
                skip += 1
            else:
                print(f"  ! {name}: HTTP {resp.status_code} - {resp.text[:80]}")
                err += 1
        except Exception as e:
            print(f"  ! {name}: {e}")
            err += 1

        # Progress
        if (i + 1) % 50 == 0:
            print(f"  ... {i + 1}/{len(company_names)} ({ok} ok, {err} err)")

    print(f"[company] Ket qua: tao moi={ok}, trung={skip}, loi={err}")
    return id_map


# ──────────────────────────────────────────────────────────────────────────────
def load_catalog() -> list[dict]:
    """Load donviTDMU_phan_cap.json catalog."""
    catalog_path = os.path.join(os.path.dirname(__file__), "donviTDMU_phan_cap.json")
    if not os.path.exists(catalog_path):
        print(f"[classify] WARNING: Catalog not found at {catalog_path}")
        return []
    with open(catalog_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize_text(text: str) -> str:
    """Normalize Vietnamese text for matching."""
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = re.sub(r"[\u0300-\u036f]", "", text)
    return text.lower().strip()


def build_classifier(catalog: list[dict]) -> tuple[list[tuple], list[tuple]]:
    """
    Build classifier lookup from catalog.
    Returns (position_rules, industry_rules) where each rule is
    (normalized_keyword, nhom_name, nganh_name).
    """
    position_rules: list[tuple] = []
    industry_rules: list[tuple] = []

    for group in catalog:
        nhom = (group.get("nhom") or "").strip()
        for nganh in group.get("nganh_hoc", []):
            ten = (nganh.get("ten") or "").strip()
            if not ten:
                continue
            # Industry/ngành name matching
            industry_rules.append((_normalize_text(ten), nhom, ten))
            # Position title matching from nghe_nghiep.vi_tri
            for career in nganh.get("nghe_nghiep", []):
                for vi_tri in career.get("vi_tri", []):
                    normalized = _normalize_text(vi_tri)
                    if normalized and len(normalized) >= 4:
                        position_rules.append((normalized, nhom, ten))

    # Sort by length descending to match longer (more specific) patterns first
    position_rules.sort(key=lambda x: len(x[0]), reverse=True)
    industry_rules.sort(key=lambda x: len(x[0]), reverse=True)
    return position_rules, industry_rules


def classify_job(
    raw: dict,
    position_rules: list[tuple],
    industry_rules: list[tuple],
) -> tuple[list[str], list[str]]:
    """
    Classify a job into nhom/nganh_hoc using catalog rules.
    Returns (nhom_list, nganh_hoc_list).
    """
    title = _normalize_text(raw.get("title", ""))
    industry = _normalize_text(raw.get("industry", ""))
    field = _normalize_text(raw.get("field", ""))
    search_text = f"{title} {industry} {field}"

    matched_nhom: set[str] = set()
    matched_nganh: set[str] = set()

    # 1. Match job title against vi_tri positions (highest confidence)
    for keyword, nhom, nganh in position_rules:
        if keyword in title:
            matched_nhom.add(nhom)
            matched_nganh.add(nganh)
            break  # First match is best (longest pattern)

    # 2. Match industry/field against ngành names
    for keyword, nhom, nganh in industry_rules:
        if keyword in search_text:
            matched_nhom.add(nhom)
            matched_nganh.add(nganh)
            break

    # 3. Skill-based heuristic fallback
    if not matched_nganh:
        skill_tags = raw.get("skill_tags", [])
        skill_cats = raw.get("skill_categories", [])
        skill_text = " ".join(str(s).lower() for s in skill_tags)
        cat_text = " ".join(str(c).lower() for c in skill_cats)

        if any(k in skill_text for k in ["python", "java", "react", "sql", "docker", "git", "api"]):
            matched_nhom.add("VIỆN CÔNG NGHỆ SỐ")
            matched_nganh.add("CÔNG NGHỆ THÔNG TIN")
        elif any(k in cat_text for k in ["programming", "web framework", "cloud/devops", "database"]):
            matched_nhom.add("VIỆN CÔNG NGHỆ SỐ")
            matched_nganh.add("CÔNG NGHỆ THÔNG TIN")
        elif any(k in skill_text for k in ["kế toán", "misa", "thuế", "kiểm toán"]):
            matched_nhom.add("TRƯỜNG KINH TẾ TÀI CHÍNH")
            matched_nganh.add("KẾ TOÁN")
        elif any(k in skill_text for k in ["marketing", "seo", "google ads", "facebook ads"]):
            matched_nhom.add("TRƯỜNG KINH TẾ TÀI CHÍNH")
            matched_nganh.add("MARKETING")

    return sorted(matched_nhom), sorted(matched_nganh)


def normalize_job_for_seed(
    raw: dict,
    company_id_map: dict[str, int],
    position_rules: list[tuple],
    industry_rules: list[tuple],
) -> dict:
    """Chuyển pipeline output format → seed DTO format."""
    company_name = raw.get("company", "")
    company_id = company_id_map.get(company_name)

    # Salary
    salary_min = raw.get("salary_min")
    salary_max = raw.get("salary_max")

    # Classify job → nhóm ngành
    # Ưu tiên dùng classification từ Colab LLM nếu có
    pre_nhom = raw.get("nhom", [])
    pre_nganh = raw.get("nganh_hoc", [])
    if pre_nhom or pre_nganh:
        nhom_list = pre_nhom
        nganh_list = pre_nganh
    else:
        nhom_list, nganh_list = classify_job(raw, position_rules, industry_rules)

    # Extract skills from pipeline output
    skill_tags = raw.get("skill_tags", [])

    return {
        "title": raw.get("title") or "(Chua co tieu de)",
        "company": company_name,
        "companyId": company_id,
        "description": raw.get("description", ""),
        "requirement": raw.get("requirement", ""),
        "benefit": raw.get("benefit", ""),
        "location": raw.get("location", ""),
        "industry": raw.get("industry", ""),
        "salary": raw.get("salary", ""),
        "salaryMin": str(salary_min) if salary_min else None,
        "salaryMax": str(salary_max) if salary_max else None,
        "degree": raw.get("degree", ""),
        "experience": raw.get("experience", ""),
        "age": raw.get("age", ""),
        "deadline": random_deadline(),
        "url": raw.get("url", ""),
        "src": raw.get("src", "unknown"),
        "otherInfo": raw.get("other_info", ""),
        "tagsBenefit": None,
        "tagsRequirement": json.dumps(skill_tags) if skill_tags else None,
        "nhom": nhom_list,
        "nganh_hoc": nganh_list,
    }


def post_batch(url: str, batch: list[dict]) -> tuple[int, int]:
    resp = requests.post(
        f"{url}/jobs/seed",
        json={"jobs": batch},
        headers={"Content-Type": "application/json"},
        timeout=60,
    )
    resp.raise_for_status()
    result = resp.json()
    return result.get("inserted", 0), result.get("skipped", 0)


def post_batch_with_retry(url: str, batch: list[dict]) -> tuple[int, int]:
    try:
        return post_batch(url, batch)
    except requests.HTTPError as e:
        if e.response.status_code == 413 and len(batch) > 1:
            half = max(1, len(batch) // 2)
            ins1, skip1 = post_batch_with_retry(url, batch[:half])
            ins2, skip2 = post_batch_with_retry(url, batch[half:])
            return ins1 + ins2, skip1 + skip2
        if e.response.status_code == 413 and len(batch) == 1:
            item = dict(batch[0])
            for heavy_field in ("description", "requirement", "benefit", "otherInfo"):
                if item.get(heavy_field) and len(item[heavy_field]) > 2000:
                    item[heavy_field] = item[heavy_field][:2000] + "..."
            try:
                return post_batch(url, [item])
            except Exception:
                raise
        raise


def seed_jobs(url: str, raw_list: list[dict], company_id_map: dict[str, int], batch_size: int,
              position_rules: list[tuple], industry_rules: list[tuple]):
    jobs = [normalize_job_for_seed(r, company_id_map, position_rules, industry_rules) for r in raw_list]

    # Classification stats
    classified = sum(1 for j in jobs if j.get("nhom") and len(j["nhom"]) > 0)
    print(f"[classify] {classified}/{len(jobs)} jobs classified ({classified/max(len(jobs),1)*100:.1f}%)")

    total = len(jobs)
    num_batches = math.ceil(total / batch_size)
    total_inserted = total_skipped = total_failed = 0

    print(f"\n[jobs] Day {total} tin tuyen dung theo {num_batches} batch (size={batch_size})...")

    for i in range(num_batches):
        batch = jobs[i * batch_size: (i + 1) * batch_size]
        label = f"  Batch {i + 1:>4}/{num_batches} ({len(batch)} ban ghi)"
        print(label, end=" ... ", flush=True)
        try:
            ins, skip = post_batch_with_retry(url, batch)
            total_inserted += ins
            total_skipped += skip
            print(f"inserted={ins}, skipped={skip}")
        except Exception as e:
            print(f"LOI: {e}")
            total_failed += len(batch)

    print(f"[jobs] Hoan thanh -> inserted={total_inserted}, skipped={total_skipped}, failed={total_failed}")


# ──────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Xoa du lieu cu va import lai tu pipeline output"
    )
    parser.add_argument("--url", default=GATEWAY_URL, help="Base URL API Gateway")
    parser.add_argument("--file", default=DATA_FILE, help="File pipeline output JSON")
    parser.add_argument("--limit", type=int, default=JOB_LIMIT, help="So job muon import")
    parser.add_argument("--batch", type=int, default=BATCH_SIZE, help="Kich thuoc batch")
    parser.add_argument("--skip-clear", action="store_true", help="Khong xoa du lieu cu")
    parser.add_argument("--skip-companies", action="store_true", help="Bo qua tao cong ty")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"[ERROR] Khong tim thay file: {args.file}")
        print(f"  Hay chay pipeline truoc: python run_pipeline.py --verbose --stats")
        sys.exit(1)

    print("=" * 70)
    print("  TDMU Seed Pipeline Data")
    print("=" * 70)

    # 1. Load du lieu
    raw_list = load_data(args.file, args.limit)

    # 2. Trich cong ty
    company_names = extract_companies(raw_list)
    print(f"[data] Tim thay {len(company_names)} cong ty duy nhat trong {len(raw_list)} job")

    # 3. Load catalog & build classifier
    catalog = load_catalog()
    position_rules, industry_rules = build_classifier(catalog)
    print(f"[classify] Loaded {len(position_rules)} position rules, {len(industry_rules)} industry rules")

    # 4. Xoa du lieu cu
    if not args.skip_clear:
        clear_old_data(args.url)
    else:
        print("[clear] Bo qua (--skip-clear)")

    # 5. Tao cong ty moi (status=approved)
    company_id_map: dict[str, int] = {}
    if not args.skip_companies:
        company_id_map = create_companies(args.url, company_names, raw_list)
    else:
        print("[company] Bo qua (--skip-companies)")

    # 6. Seed jobs (with classification)
    seed_jobs(args.url, raw_list, company_id_map, args.batch, position_rules, industry_rules)

    print(f"\n{'=' * 70}")
    print(f"  Done! {len(raw_list)} jobs imported.")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
