"""
Script để seed dữ liệu công việc từ file data_jobs.json vào backend
qua endpoint POST /jobs/seed của API Gateway.

Cách dùng:
    python seed_jobs.py
    python seed_jobs.py --url http://localhost:8080 --batch 200 --file data_jobs.json
"""
import argparse
import json
import math
import os
import sys
import requests

GATEWAY_URL = "http://localhost:8080"
BATCH_SIZE = 100
DATA_FILE = os.path.join(os.path.dirname(__file__), "data_jobs.json")


def load_data(file_path: str) -> list[dict]:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else [data]


def normalize_item(raw: dict) -> dict:
    """Chuyển key từ schema crawl sang camelCase của DTO."""
    province_ids = raw.get("province_ids")
    if isinstance(province_ids, list):
        province_ids = json.dumps(province_ids)

    salary_max = raw.get("salary_max")
    salary_min = raw.get("salary_min")

    return {
        "crawlId": str(raw["id"]) if raw.get("id") is not None else None,
        "age": raw.get("age"),
        "benefit": raw.get("benefit"),
        "company": raw.get("company"),
        "deadline": raw.get("deadline"),
        "degree": raw.get("degree"),
        "description": raw.get("description"),
        "experience": raw.get("experience"),
        "field": raw.get("field"),
        "industry": raw.get("industry"),
        "location": raw.get("location"),
        "otherInfo": raw.get("other_info"),
        "requirement": raw.get("requirement"),
        "salary": raw.get("salary"),
        "title": raw.get("title") or "(Chưa có tiêu đề)",
        "url": raw.get("url"),
        "src": raw.get("src") or "unknown",
        "tagsBenefit": raw.get("tags_benefit"),
        "tagsRequirement": raw.get("tags_requirement"),
        "provinceIds": province_ids,
        "salaryMax": str(salary_max) if salary_max is not None else None,
        "salaryMin": str(salary_min) if salary_min is not None else None,
    }


def seed(url: str, batch_size: int, file_path: str):
    print(f"[seed] Đọc dữ liệu từ: {file_path}")
    raw_list = load_data(file_path)
    total = len(raw_list)
    print(f"[seed] Tổng số bản ghi: {total}")

    jobs = [normalize_item(r) for r in raw_list]
    num_batches = math.ceil(total / batch_size)
    total_inserted = 0
    total_skipped = 0

    for i in range(num_batches):
        batch = jobs[i * batch_size: (i + 1) * batch_size]
        print(f"[seed] Gửi batch {i + 1}/{num_batches} ({len(batch)} bản ghi)...", end=" ")
        try:
            resp = requests.post(
                f"{url}/jobs/seed",
                json={"jobs": batch},
                headers={"Content-Type": "application/json"},
                timeout=60,
            )
            resp.raise_for_status()
            result = resp.json()
            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)
            total_inserted += inserted
            total_skipped += skipped
            print(f"inserted={inserted}, skipped={skipped}")
        except requests.HTTPError as e:
            print(f"LỖI HTTP: {e.response.status_code} – {e.response.text}")
        except Exception as e:
            print(f"LỖI: {e}")

    print(f"\n[seed] Hoàn thành! Tổng inserted={total_inserted}, skipped={total_skipped}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed job data vào API Gateway")
    parser.add_argument("--url", default=GATEWAY_URL, help="Base URL của API Gateway")
    parser.add_argument("--batch", type=int, default=BATCH_SIZE, help="Số bản ghi mỗi batch")
    parser.add_argument("--file", default=DATA_FILE, help="Đường dẫn tới file data_jobs.json")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"[ERROR] Không tìm thấy file: {args.file}")
        sys.exit(1)

    seed(args.url, args.batch, args.file)
