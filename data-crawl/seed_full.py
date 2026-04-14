"""
Script seed toàn bộ: tạo tài khoản công ty, tạo hồ sơ công ty,
rồi đẩy 1000 tin tuyển dụng lên backend.

Thứ tự thực hiện:
  1. Đọc N bản ghi đầu từ data_jobs.json (mặc định 1000)
  2. Trích xuất danh sách công ty duy nhất
  3. POST /auth/register  → tạo tài khoản company cho mỗi công ty
  4. POST /companies      → tạo hồ sơ công ty với dữ liệu mẫu
  5. POST /jobs/seed      → đẩy các job lên (deadline gán ngẫu nhiên tháng 6/2026)

Cách dùng:
    python seed_full.py
    python seed_full.py --url http://localhost:8082 --limit 1000 --batch 100 --file data_jobs.json
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
DATA_FILE   = os.path.join(os.path.dirname(__file__), "data_jobs.json")
JOB_LIMIT   = 1000
BATCH_SIZE  = 20

# Khoảng deadline: 01/06/2026 → 30/06/2026
DEADLINE_START = date(2026, 6, 1)
DEADLINE_END   = date(2026, 6, 30)

COMPANY_PASSWORD = "Company@123456"

# ──────────────────────────────────────────────────────────────────────────────
# Danh sách mẫu để tạo dữ liệu công ty ngẫu nhiên
SIZES        = ["1-50", "50-100", "100-500", "500-1000", "1000+"]
NATIONALITIES = ["Việt Nam"]
PROVINCES    = ["Hà Nội", "TP. HCM", "Cần Thơ"]

ABOUT_IMAGES_SAMPLE = json.dumps([
    "https://placehold.co/800x400?text=About+1",
    "https://placehold.co/800x400?text=About+2",
])


def slugify(text: str) -> str:
    """Chuyển tên công ty → slug dùng làm email prefix."""
    if not text:
        return "company"
    # Normalize unicode, bỏ dấu tiếng Việt
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[\s_-]+", ".", text)
    text = re.sub(r"^-+|-+$", "", text)
    # Giới hạn độ dài
    return text[:40] or "company"


def random_june_deadline() -> str:
    delta = (DEADLINE_END - DEADLINE_START).days
    d = DEADLINE_START + timedelta(days=random.randint(0, delta))
    return d.strftime("%d/%m/%Y")


def load_data(file_path: str, limit: int) -> list[dict]:
    print(f"[data] Đọc file: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        data = [data]
    print(f"[data] Tổng file: {len(data):,} bản ghi → lấy {limit:,} bản đầu")
    return data[:limit]


def extract_companies(raw_list: list[dict]) -> list[str]:
    """Lấy danh sách tên công ty duy nhất (bỏ None / chuỗi rỗng)."""
    names = {r.get("company") for r in raw_list}
    names.discard(None)
    names.discard("")
    return sorted(names)


# ──────────────────────────────────────────────────────────────────────────────
def register_company_accounts(url: str, company_names: list[str]) -> dict[str, str]:
    """
    Tạo tài khoản auth cho mỗi công ty.
    Trả về dict: company_name → email
    """
    register_url = f"{url}/auth/register"
    mapping: dict[str, str] = {}
    slug_counter: dict[str, int] = {}

    print(f"\n[auth] Tạo {len(company_names)} tài khoản công ty ...")
    ok = skip = err = 0

    for name in company_names:
        slug = slugify(name)
        # Xử lý trùng slug
        if slug in slug_counter:
            slug_counter[slug] += 1
            email = f"{slug}{slug_counter[slug]}@company.tdmu.edu.vn"
        else:
            slug_counter[slug] = 0
            email = f"{slug}@company.tdmu.edu.vn"

        mapping[name] = email
        payload = {
            "email":    email,
            "password": COMPANY_PASSWORD,
            "role":     "company",
            "name":     name,
        }
        try:
            resp = requests.post(register_url, json=payload, timeout=10)
            if resp.status_code in (200, 201):
                ok += 1
            elif resp.status_code == 400:
                body = resp.json()
                msg = body.get("message", "")
                if "tồn tại" in msg or "exist" in msg.lower():
                    skip += 1
                else:
                    print(f"  ✗ {name}: {msg}")
                    err += 1
            else:
                print(f"  ✗ {name}: HTTP {resp.status_code}")
                err += 1
        except Exception as e:
            print(f"  ✗ {name}: {e}")
            err += 1

    print(f"[auth] Kết quả: tạo mới={ok}, đã tồn tại={skip}, lỗi={err}")
    return mapping


# ──────────────────────────────────────────────────────────────────────────────
def create_company_profiles(
    url: str,
    company_names: list[str],
    raw_list: list[dict],
    email_map: dict[str, str],
) -> dict[str, int]:
    """
    Tạo hồ sơ công ty trong job-service.
    Trả về dict: company_name → company_id
    """
    companies_url = f"{url}/companies"
    id_map: dict[str, int] = {}

    # Gom industry đầu tiên tìm được cho mỗi công ty
    industry_map: dict[str, str] = {}
    location_map: dict[str, str] = {}
    for r in raw_list:
        name = r.get("company")
        if name and name not in industry_map:
            industry_map[name] = r.get("industry") or ""
        if name and name not in location_map:
            location_map[name] = r.get("location") or ""

    print(f"\n[company] Tạo {len(company_names)} hồ sơ công ty ...")
    ok = skip = err = 0

    for name in company_names:
        email = email_map.get(name, "")
        slug  = slugify(name)
        industry  = industry_map.get(name, "Công nghệ thông tin")
        short_addr = location_map.get(name, random.choice(PROVINCES))

        payload = {
            "name":              name,
            "logo":              f"https://placehold.co/200x200?text={requests.utils.quote(name[:10])}",
            "shortDescription":  f"{name} – đơn vị tuyển dụng tại {short_addr}.",
            "currentJobOpening": random.randint(1, 10),
            "industry":          industry or "Công nghệ thông tin",
            "size":              random.choice(SIZES),
            "nationality":       random.choice(NATIONALITIES),
            "website":           f"https://{slug}.example.com",
            "socialMedia":       json.dumps({
                                     "facebook": f"https://facebook.com/{slug}",
                                     "linkedin": f"https://linkedin.com/company/{slug}",
                                 }),
            "address":           short_addr,
            "shortAddress":      short_addr,
            "description":       (
                f"{name} là đơn vị hoạt động trong lĩnh vực {industry}. "
                "Chúng tôi cam kết mang đến môi trường làm việc năng động, chuyên nghiệp "
                "và nhiều cơ hội phát triển cho các ứng viên tài năng."
            ),
            "banner":            f"https://placehold.co/1200x300?text={requests.utils.quote(name[:20])}",
            "followers":         random.randint(0, 5000),
            "aboutImages":       ABOUT_IMAGES_SAMPLE,
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
                print(f"  ✗ {name}: HTTP {resp.status_code} – {resp.text[:80]}")
                err += 1
        except Exception as e:
            print(f"  ✗ {name}: {e}")
            err += 1

    print(f"[company] Kết quả: tạo mới={ok}, trùng={skip}, lỗi={err}")
    return id_map


# ──────────────────────────────────────────────────────────────────────────────
def normalize_job(raw: dict) -> dict:
    province_ids = raw.get("province_ids")
    if isinstance(province_ids, list):
        province_ids = json.dumps(province_ids)

    salary_max = raw.get("salary_max")
    salary_min = raw.get("salary_min")

    return {
        "crawlId":        str(raw["id"]) if raw.get("id") is not None else None,
        "age":            raw.get("age"),
        "benefit":        raw.get("benefit"),
        "company":        raw.get("company"),
        "deadline":       random_june_deadline(),   # ← gán lại tháng 6/2026
        "degree":         raw.get("degree"),
        "description":    raw.get("description"),
        "experience":     raw.get("experience"),
        "field":          raw.get("field"),
        "industry":       raw.get("industry"),
        "location":       raw.get("location"),
        "otherInfo":      raw.get("other_info"),
        "requirement":    raw.get("requirement"),
        "salary":         raw.get("salary"),
        "title":          raw.get("title") or "(Chưa có tiêu đề)",
        "url":            raw.get("url"),
        "src":            raw.get("src") or "unknown",
        "tagsBenefit":    raw.get("tags_benefit"),
        "tagsRequirement":raw.get("tags_requirement"),
        "provinceIds":    province_ids,
        "salaryMax":      str(salary_max) if salary_max is not None else None,
        "salaryMin":      str(salary_min) if salary_min is not None else None,
    }


def post_batch(url: str, batch: list[dict]) -> tuple[int, int]:
    """Gửi một batch, trả về (inserted, skipped). Ném exception nếu lỗi."""
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
    """Gửi batch, tự động chia đôi đệ quy khi gặp 413, tới tận size=1."""
    try:
        return post_batch(url, batch)
    except requests.HTTPError as e:
        if e.response.status_code == 413 and len(batch) > 1:
            half = max(1, len(batch) // 2)
            ins1, skip1 = post_batch_with_retry(url, batch[:half])
            ins2, skip2 = post_batch_with_retry(url, batch[half:])
            return ins1 + ins2, skip1 + skip2
        # Nếu size=1 vẫn 413 → cắt bớt trường nặng rồi thử lại
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


def seed_jobs(url: str, raw_list: list[dict], batch_size: int):
    jobs = [normalize_job(r) for r in raw_list]
    total = len(jobs)
    num_batches = math.ceil(total / batch_size)
    total_inserted = total_skipped = total_failed = 0

    print(f"\n[jobs] Đẩy {total} tin tuyển dụng theo {num_batches} batch (size={batch_size}) ...")

    for i in range(num_batches):
        batch = jobs[i * batch_size: (i + 1) * batch_size]
        label = f"  Batch {i + 1:>3}/{num_batches} ({len(batch)} bản ghi)"
        print(label, end=" ... ", flush=True)
        try:
            ins, skip = post_batch_with_retry(url, batch)
            total_inserted += ins
            total_skipped  += skip
            print(f"inserted={ins}, skipped={skip}")
        except Exception as e:
            print(f"LỖI: {e}")
            total_failed += len(batch)

    print(f"[jobs] Hoàn thành → inserted={total_inserted}, skipped={total_skipped}, failed={total_failed}")


# ──────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Seed đầy đủ: auth + company + jobs")
    parser.add_argument("--url",   default=GATEWAY_URL, help="Base URL API Gateway")
    parser.add_argument("--file",  default=DATA_FILE,   help="Đường dẫn data_jobs.json")
    parser.add_argument("--limit", type=int, default=JOB_LIMIT,  help="Số job muốn đẩy lên")
    parser.add_argument("--batch", type=int, default=BATCH_SIZE, help="Kích thước batch")
    parser.add_argument(
        "--skip-auth",
        action="store_true",
        help="Bỏ qua bước tạo tài khoản auth (nếu đã chạy trước rồi)",
    )
    parser.add_argument(
        "--skip-company",
        action="store_true",
        help="Bỏ qua bước tạo hồ sơ công ty",
    )
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"[ERROR] Không tìm thấy file: {args.file}")
        sys.exit(1)

    # 1. Đọc dữ liệu
    raw_list = load_data(args.file, args.limit)

    # 2. Trích công ty
    company_names = extract_companies(raw_list)
    print(f"[data] Tìm thấy {len(company_names)} công ty duy nhất trong {len(raw_list)} job")

    # 3. Tạo tài khoản auth
    email_map: dict[str, str] = {}
    if not args.skip_auth:
        email_map = register_company_accounts(args.url, company_names)
    else:
        print("[auth] Bỏ qua (--skip-auth)")

    # 4. Tạo hồ sơ công ty trong job-service
    if not args.skip_company:
        create_company_profiles(args.url, company_names, raw_list, email_map)
    else:
        print("[company] Bỏ qua (--skip-company)")

    # 5. Seed jobs (deadline → tháng 6/2026)
    seed_jobs(args.url, raw_list, args.batch)

    print("\n✅ Seed hoàn tất!")


if __name__ == "__main__":
    main()
