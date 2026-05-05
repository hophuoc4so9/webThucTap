import json

# ===== PATH =====
input_path = "D:/NCKH/webThucTap/data-crawl/data_jobs_final_clean.json"

# ===== LOAD =====
with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

total = len(data)

# ===== LẤY TOÀN BỘ KEY =====
all_keys = set()
for item in data:
    all_keys.update(item.keys())

# ===== CHECK EMPTY =====
def is_empty(value):
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    if isinstance(value, list) and len(value) == 0:
        return True
    return False

# ===== THỐNG KÊ =====
stats = {}

for key in all_keys:
    missing = 0

    for item in data:
        if is_empty(item.get(key)):
            missing += 1

    stats[key] = missing

# ===== SORT =====
sorted_stats = sorted(stats.items(), key=lambda x: x[1], reverse=True)

# ===== PRINT =====
print(f"Tổng records: {total}\n")

for key, missing in sorted_stats:
    percent = (missing / total) * 100
    print(f"{key:20} | missing: {missing:6} | {percent:6.2f}%")