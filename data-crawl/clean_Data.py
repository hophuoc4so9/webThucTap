import json
import re

# ===== PATH =====
input_path = "D:/NCKH/webThucTap/data-crawl/data_jobs_multi_mapped.json"
output_path = "D:/NCKH/webThucTap/data-crawl/data_jobs_final_clean.json"

# ===== LOAD =====
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# ===== HELPER =====
def clean_text(text):
    if not text:
        return ""

    text = re.sub(r'\s+', ' ', text)  # remove extra spaces
    text = text.strip()

    return text

# parse salary đơn giản
def parse_salary(salary):
    if not salary:
        return None

    salary = salary.lower()

    match = re.findall(r'(\d+)', salary)
    if not match:
        return None

    nums = [int(x) for x in match]

    if "triệu" in salary:
        nums = [x * 1_000_000 for x in nums]

    if len(nums) == 1:
        return {"min": nums[0], "max": nums[0]}

    return {"min": min(nums), "max": max(nums)}

# convert tags -> list
def normalize_tags(tags):
    if not tags:
        return []

    if isinstance(tags, list):
        return tags

    return [t.strip() for t in tags.split(";") if t.strip()]

# ===== CLEAN =====
cleaned = []

for job in data:

    # bỏ job không có mapping (optional)
    if not job.get("nganh_hoc"):
        continue

    new_job = {}

    # ===== TEXT =====
    new_job["title"] = clean_text(job.get("title"))
    new_job["company"] = clean_text(job.get("company"))
    new_job["description"] = clean_text(job.get("description"))
    new_job["requirement"] = clean_text(job.get("requirement"))
    new_job["location"] = clean_text(job.get("location"))

    # ===== SALARY =====
    salary_parsed = parse_salary(job.get("salary"))
    new_job["salary"] = salary_parsed

    # ===== TAG =====
    new_job["tags_requirement"] = normalize_tags(job.get("tags_requirement"))

    # ===== CATEGORY =====
    new_job["nhom"] = job.get("nhom", [])
    new_job["nganh_hoc"] = job.get("nganh_hoc", [])

    # ===== FILTER BAD DATA =====
    if len(new_job["description"]) < 30:
        continue

    if len(new_job["requirement"]) < 20:
        continue

    cleaned.append(new_job)

# ===== SAVE =====
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(cleaned, f, ensure_ascii=False, indent=2)

print(f"✅ Done: {len(cleaned)}/{len(data)} jobs kept")