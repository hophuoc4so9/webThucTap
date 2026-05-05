import json
from datetime import datetime
from dateutil.relativedelta import relativedelta

def add_6_months(date_str):
    if not date_str:
        return None

    d = datetime.strptime(date_str, "%Y-%m-%d")
    new_date = d + relativedelta(months=6)

    return new_date.strftime("%Y-%m-%d")
input_path = "D:/NCKH/webThucTap/data-crawl/data_jobs_with_deadline_parsed.json"
output_path = "D:/NCKH/webThucTap/data-crawl/data_jobs_with_deadline_extended.json"

with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

count = 0

for job in data:
    d = job.get("deadline_date")

    new_d = add_6_months(d)

    if new_d:
        count += 1

    job["deadline_plus_6m"] = new_d

print(f"✅ Extended: {count}/{len(data)}")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Done add 6 months")