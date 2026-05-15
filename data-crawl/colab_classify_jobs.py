"""
colab_classify_jobs.py — Chạy trên Google Colab (GPU T4 free)
Dùng model LLM local để classify jobs + extract skills

Hướng dẫn:
  1. Colab → Runtime → Change runtime type → T4 GPU
  2. Upload: data_jobs_pipeline_output.json + donviTDMU_phan_cap.json
  3. Chạy từng cell theo thứ tự

Output: data_jobs_classified.json
"""

# ============================================================================
# CELL 1: Install & GPU check
# ============================================================================
# !pip install -q transformers accelerate bitsandbytes torch tqdm

import torch
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'NONE'}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB" if torch.cuda.is_available() else "")

# ============================================================================
# CELL 2: Config
# ============================================================================
import json
import os
import re
import time
import math
import unicodedata
from collections import Counter
from typing import Any

INPUT_FILE = "data_jobs_pipeline_output.json"
CATALOG_FILE = "donviTDMU_phan_cap.json"
OUTPUT_FILE = "data_jobs_classified.json"

# Model: Qwen2.5-3B-Instruct — nhẹ, nhanh, rất tốt structured output
MODEL_ID = "Qwen/Qwen2.5-3B-Instruct"
# Alternatives nếu VRAM không đủ:
# MODEL_ID = "google/gemma-2-2b-it"       # 2B, nhẹ nhất
# MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"  # 7B, tốt hơn nhưng cần ~10GB VRAM

BATCH_SIZE = 5       # Jobs per LLM call (nhỏ hơn API vì local model chậm hơn)
MAX_JOBS = None      # None = all, set số để test (vd: 50)
MAX_NEW_TOKENS = 2048

# ============================================================================
# CELL 3: Load data
# ============================================================================
def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(data: Any, path: str):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ Saved {len(data)} records to {path}")

jobs = load_json(INPUT_FILE)
catalog = load_json(CATALOG_FILE)

if MAX_JOBS:
    jobs = jobs[:MAX_JOBS]

print(f"📊 Loaded {len(jobs)} jobs, {len(catalog)} groups in catalog")

# Build catalog text for prompt
VALID_NGANH = set()
NGANH_TO_NHOM = {}
catalog_summary = []
for group in catalog:
    nhom = group.get("nhom", "")
    nganh_list = []
    for nganh in group.get("nganh_hoc", []):
        ten = nganh.get("ten", "")
        ten_upper = ten.upper()
        VALID_NGANH.add(ten_upper)
        NGANH_TO_NHOM[ten_upper] = nhom
        
        vi_tri_all = []
        for career in nganh.get("nghe_nghiep", []):
            vi_tri_all.extend(career.get("vi_tri", []))
        nganh_list.append({"ten": ten, "vi_tri": vi_tri_all[:6]})
    catalog_summary.append({"nhom": nhom, "nganh_hoc": nganh_list})

CATALOG_TEXT = json.dumps(catalog_summary, ensure_ascii=False, indent=1)
print(f"📋 Catalog prompt: {len(CATALOG_TEXT)} chars")

# ============================================================================
# CELL 3 PATCH — Thay thế phần RULES + rule_based_classify
# ============================================================================
def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', str(text)).encode('ascii', 'ignore').decode('utf-8')
    return text.lower()

# ── Trọng số cho từng loại keyword ─────────────────────────────────────────
_W = {
    "phrase_primary_title": 12,   # cụm từ đặc thù, xuất hiện ở title
    "phrase_primary_body":   6,   # cụm từ đặc thù, xuất hiện ở mô tả
    "single_primary_title":  9,   # từ đặc thù, xuất hiện ở title
    "single_primary_body":   3,   # từ đặc thù, xuất hiện ở mô tả
    "secondary_title":       4,   # từ hỗ trợ, ở title
    "secondary_body":        1,   # từ hỗ trợ, ở mô tả
}

RULE_CONFIDENCE_THRESHOLD = 6   # tổng điểm tối thiểu để tin rule
_CONFLICT_GAP = 3               # 2 rule cách ≤ 3 điểm → cần tiebreak
_MAX_SCORE_ESTIMATE = 60        # dùng normalize confidence → 0..1

RULES_V2 = [
    {
        "id": "CNTT",
        "nganh": ["CÔNG NGHỆ THÔNG TIN", "KỸ THUẬT PHẦN MỀM"],
        "keywords": {
            "primary": [
                "lap trinh vien", "software engineer", "software developer",
                "frontend developer", "backend developer", "fullstack developer",
                "web developer", "mobile developer",
                "react", "angular", "vue", "nextjs",
                "nodejs", "django", "spring boot", "laravel",
                "flutter", "kotlin", "swift",
                "devops", "ci cd", "docker", "kubernetes",
                "rest api", "graphql",
                "ky thuat phan mem", "cong nghe thong tin",
            ],
            "secondary": [
                "frontend", "backend", "fullstack",
                "java", "python", "php", "c++", "golang", "typescript",
                "sql", "database", "git", "agile", "scrum",
                "linux", "api", "microservices", "cloud",
                "developer", "software",
            ],
            "negative": [
                "machine learning", "deep learning", "data scientist",
                "ai engineer", "mlops", "neural network",
                "plc", "autocad", "solidworks",
                "ke toan", "marketing",
            ],
        },
        "skills": ["Lập trình", "API", "SQL", "Git"],
    },
    {
        "id": "AI_DS",
        "nganh": ["TRÍ TUỆ NHÂN TẠO VÀ KHOA HỌC DỮ LIỆU"],
        "keywords": {
            "primary": [
                "machine learning engineer", "data scientist", "ai engineer",
                "mlops", "llm", "generative ai", "computer vision",
                "natural language processing", "nlp",
                "deep learning", "neural network",
                "tensorflow", "pytorch", "scikit learn", "huggingface",
                "tri tue nhan tao", "khoa hoc du lieu",
            ],
            "secondary": [
                "machine learning", "data analyst", "data engineer",
                "python", "r language", "spark", "hadoop",
                "phan tich du lieu", "big data", "etl",
                "power bi", "tableau", "ai",
            ],
            "negative": [
                "frontend", "backend", "web developer", "mobile developer",
                "ke toan", "marketing",
            ],
        },
        "skills": ["Python", "Machine Learning", "Phân tích dữ liệu", "TensorFlow"],
    },
    {
        "id": "KE_TOAN",
        "nganh": ["KẾ TOÁN", "KIỂM TOÁN"],
        "keywords": {
            "primary": [
                "ke toan tong hop", "ke toan truong", "ke toan noi bo",
                "kiem toan vien", "kiem toan noi bo",
                "misa", "fast accounting", "bravo",
                "bao cao thue", "quyet toan thue", "thue gtgt", "thue tndn",
                "bao cao tai chinh", "chung tu ke toan",
                "ke toan", "kiem toan",
            ],
            "secondary": [
                "accountant", "accounting", "audit",
                "excel ke toan", "so sach", "cong no",
                "ngan sach", "tai chinh ke toan", "thue",
            ],
            "negative": [
                "phan tich tai chinh dau tu", "chung khoan",
                "frontend", "lap trinh",
            ],
        },
        "skills": ["Kế toán", "MISA", "Thuế", "Báo cáo tài chính"],
    },
    {
        "id": "MARKETING",
        "nganh": ["MARKETING"],
        "keywords": {
            "primary": [
                "digital marketing", "performance marketing",
                "facebook ads", "google ads", "tiktok ads",
                "seo specialist", "sem", "content marketing",
                "brand manager", "marketing manager", "marketing online",
                "growth hacker",
            ],
            "secondary": [
                "seo", "content", "social media", "campaign",
                "brand", "quang cao", "truyen thong",
                "email marketing", "influencer", "kpi marketing", "marketing",
            ],
            "negative": [
                "shopee seller", "quan ly san tmdt",
                "ke toan", "lap trinh",
            ],
        },
        "skills": ["SEO", "Content Marketing", "Digital Marketing", "Chạy quảng cáo"],
    },
    {
        "id": "TMDT",
        "nganh": ["THƯƠNG MẠI ĐIỆN TỬ"],
        "keywords": {
            "primary": [
                "quan ly san shopee", "quan ly san lazada", "tiktok shop",
                "san thuong mai dien tu", "van hanh san tmdt",
                "ecommerce executive", "thuong mai dien tu",
                "shopee ads", "lazada ads",
            ],
            "secondary": [
                "shopee", "lazada", "tiki", "sendo",
                "ecommerce", "e-commerce",
                "don hang online", "ban hang online",
                "kho tmdt", "fulfillment",
            ],
            "negative": [],
        },
        "skills": ["Vận hành sàn TMĐT", "Shopee", "Lazada", "TikTok Shop"],
    },
    {
        "id": "LOGISTICS",
        "nganh": ["LOGISTICS VÀ QUẢN LÝ CHUỖI CUNG ỨNG"],
        "keywords": {
            "primary": [
                "xuat nhap khau", "khai bao hai quan", "forwarder",
                "freight", "logistics coordinator", "supply chain",
                "quan ly kho", "kho van", "giao nhan hang hoa",
                "chung tu xuat nhap khau", "incoterms",
                "logistics", "chuoi cung ung",
            ],
            "secondary": [
                "warehouse", "inventory", "nhap kho", "xuat kho",
                "van tai", "thong quan", "to khai hai quan",
            ],
            "negative": ["ke toan", "marketing", "lap trinh"],
        },
        "skills": ["Logistics", "Xuất nhập khẩu", "Quản lý kho"],
    },
    {
        "id": "KY_THUAT_DIEN",
        "nganh": ["KỸ THUẬT ĐIỆN", "KỸ THUẬT ĐIỀU KHIỂN VÀ TỰ ĐỘNG HOÁ"],
        "keywords": {
            "primary": [
                "ky su dien", "ky thuat dien", "tu dong hoa",
                "plc programmer", "plc siemens", "plc omron",
                "scada", "hmi", "bien tan", "servo",
                "bao tri dien", "thiet ke he thong dien",
                "ky thuat dieu khien", "electrical engineer",
            ],
            "secondary": [
                "plc", "electrical", "dien cong nghiep", "dien dan dung",
                "tu dien", "may bien ap", "ups", "automation",
                "autocad electrical", "eplan",
            ],
            "negative": ["lap trinh web", "software", "ke toan"],
        },
        "skills": ["Kỹ thuật điện", "PLC", "Tự động hóa"],
    },
    {
        "id": "CO_DIEN_TU",
        "nganh": ["KỸ THUẬT CƠ ĐIỆN TỬ"],
        "keywords": {
            "primary": [
                "ky su co khi", "thiet ke co khi", "khuon ep nhua",
                "khuon dap", "cnc programming", "gia cong co khi",
                "solidworks", "catia", "nx cad",
                "co dien tu", "co khi che tao",
            ],
            "secondary": [
                "co khi", "mechanical", "may cnc", "cnc",
                "kiem tra chat luong co khi", "qc co khi",
                "cad", "khuon mau",
            ],
            "negative": [
                "autocad electrical",
                "xay dung", "kien truc",
                "plc", "scada",
            ],
        },
        "skills": ["Cơ khí", "AutoCAD", "SolidWorks", "CNC"],
    },
    {
        "id": "OTO",
        "nganh": ["CÔNG NGHỆ KỸ THUẬT Ô TÔ"],
        "keywords": {
            "primary": [
                "ky thuat o to", "sua chua o to", "bao duong o to",
                "gara o to", "kiem tra xe", "dong co o to",
                "ky thuat xe may", "dich vu xe",
            ],
            "secondary": [
                "automotive", "phu tung o to", "linh kien xe",
                "dien o to", "hop so", "o to", "xe may",
                "oto",
            ],
            "negative": ["phan mem o to", "erp automotive"],
        },
        "skills": ["Kỹ thuật ô tô", "Bảo dưỡng ô tô"],
    },
    {
        "id": "MOI_TRUONG",
        "nganh": ["KỸ THUẬT MÔI TRƯỜNG", "QUẢN LÝ TÀI NGUYÊN VÀ MÔI TRƯỜNG"],
        "keywords": {
            "primary": [
                "nhan vien hse", "quan ly moi truong", "ky su moi truong",
                "xu ly nuoc thai", "xu ly chat thai",
                "iso 14001", "iso 45001", "quan trac moi truong",
                "an toan lao dong", "bao ho lao dong",
                "ehs", "hse officer", "hse manager",
            ],
            "secondary": [
                "hse", "safety", "moi truong", "environmental",
                "quan ly chat thai", "tai nguyen nuoc",
                "o nhiem", "occupational health",
            ],
            "negative": ["ke toan", "marketing", "lap trinh"],
        },
        "skills": ["An toàn lao động", "ISO 45001", "ISO 14001", "Quản lý môi trường"],
    },
    {
        "id": "THUC_PHAM",
        "nganh": ["CÔNG NGHỆ THỰC PHẨM"],
        "keywords": {
            "primary": [
                "ky su thuc pham", "cong nghe thuc pham",
                "haccp", "iso 22000", "fssc 22000",
                "kiem soat chat luong thuc pham",
                "nghien cuu phat trien san pham thuc pham",
                "qc thuc pham", "qa thuc pham",
            ],
            "secondary": [
                "thuc pham", "food", "do uong", "beverage",
                "bao bi thuc pham", "dinh duong",
                "vi sinh thuc pham", "kiem nghiem thuc pham",
                "qc", "qa", "quality control", "packaging", "bao bi",
                "kiem soat chat luong",
            ],
            "negative": ["lap trinh", "ke toan", "moi truong"],
        },
        "skills": ["Kiểm soát chất lượng", "HACCP", "ISO 22000", "Bao bì"],
    },
    {
        "id": "DESIGN",
        "nganh": ["THIẾT KẾ ĐỒ HỌA", "TRUYỀN THÔNG ĐA PHƯƠNG TIỆN"],
        "keywords": {
            "primary": [
                "graphic designer", "ui ux designer", "motion designer",
                "video editor", "content creator",
                "figma", "adobe xd", "sketch",
                "after effects", "premiere pro",
                "thiet ke do hoa", "thiet ke ui ux",
            ],
            "secondary": [
                "photoshop", "illustrator", "indesign",
                "visual", "branding", "nhan dien thuong hieu",
                "dung phim", "quay phim", "edit video",
                "ui ux", "motion",
            ],
            "negative": ["lap trinh", "ke toan"],
        },
        "skills": ["Photoshop", "Illustrator", "Figma", "Dựng video"],
    },
    {
        "id": "XAY_DUNG",
        "nganh": ["KIẾN TRÚC", "KỸ THUẬT XÂY DỰNG"],
        "keywords": {
            "primary": [
                "ky su xay dung", "giam sat cong trinh",
                "du toan cong trinh", "thi cong xay dung",
                "kien truc su", "thiet ke kien truc",
                "revit", "bim coordinator",
                "quan ly du an xay dung", "quy hoach do thi",
                "giam sat cong trinh",
            ],
            "secondary": [
                "xay dung", "construction", "kien truc",
                "ket cau", "be tong", "mep",
                "tu van giam sat", "nghiem thu",
                "bim", "du toan", "autocad",
            ],
            "negative": [
                "autocad electrical",
                "solidworks", "cnc", "plc",
            ],
        },
        "skills": ["AutoCAD", "Revit", "BIM", "Dự toán"],
    },
    {
        "id": "LUAT",
        "nganh": ["LUẬT"],
        "keywords": {
            "primary": [
                "phap che doanh nghiep", "tu van phap luat",
                "luat su", "thu ky toa an",
                "compliance officer", "legal counsel",
                "soan thao hop dong", "phap ly du an",
                "luat", "phap che",
            ],
            "secondary": [
                "hop dong", "phap luat", "legal", "compliance",
                "tranh chap", "to tung", "quy dinh phap luat",
                "phap ly",
            ],
            "negative": ["ke toan", "marketing"],
        },
        "skills": ["Pháp lý", "Hợp đồng", "Tuân thủ"],
    },
    {
        "id": "TIENG_ANH",
        "nganh": ["NGÔN NGỮ ANH"],
        "keywords": {
            "primary": [
                "phien dich tieng anh", "bien dich tieng anh",
                "translator english", "interpreter english",
                "giao vien tieng anh", "gia su tieng anh",
                "ielts tutor", "toeic",
            ],
            "secondary": ["tieng anh", "english", "ielts", "toefl"],
            "negative": [],
        },
        "skills": ["Tiếng Anh", "IELTS", "TOEIC"],
    },
    {
        "id": "TIENG_TRUNG",
        "nganh": ["NGÔN NGỮ TRUNG QUỐC"],
        "keywords": {
            "primary": [
                "phien dich tieng trung", "bien dich tieng trung",
                "thu ky tieng trung", "giao vien tieng trung",
                "tieng trung thuong mai",
            ],
            "secondary": ["tieng trung", "chinese", "mandarin", "hsk"],
            "negative": [],
        },
        "skills": ["Tiếng Trung", "Biên phiên dịch"],
    },
    {
        "id": "TIENG_HAN",
        "nganh": ["NGÔN NGỮ HÀN QUỐC"],
        "keywords": {
            "primary": [
                "phien dich tieng han", "bien dich tieng han",
                "thu ky tieng han", "giao vien tieng han",
            ],
            "secondary": ["tieng han", "korean", "topik", "han quoc"],
            "negative": [],
        },
        "skills": ["Tiếng Hàn", "Biên phiên dịch"],
    },
    {
        "id": "QTKD",
        "nganh": ["QUẢN TRỊ KINH DOANH"],
        "keywords": {
            "primary": [
                "nhan vien kinh doanh", "chuyen vien kinh doanh",
                "sales executive", "business development",
                "account executive", "tu van ban hang",
                "quan tri kinh doanh", "phat trien thi truong"
            ],
            "secondary": [
                "sales", "ban hang", "kinh doanh", "khach hang",
                "doanh so", "hop dong", "crm", "cham soc khach hang"
            ],
            "negative": ["lap trinh", "ke toan", "marketing online", "facebook ads"]
        },
        "skills": ["Bán hàng", "CRM", "Chăm sóc khách hàng", "Đàm phán"],
    },
    {
        "id": "TAI_CHINH_NGAN_HANG",
        "nganh": ["TÀI CHÍNH - NGÂN HÀNG"],
        "keywords": {
            "primary": [
                "chuyen vien tin dung", "giao dich vien ngan hang",
                "quan he khach hang ca nhan", "quan he khach hang doanh nghiep",
                "financial analyst", "phan tich tai chinh",
                "tu van tai chinh", "ngan hang", "tin dung"
            ],
            "secondary": [
                "finance", "banking", "tai chinh", "vay von",
                "bao lanh", "the tin dung", "dau tu", "chung khoan"
            ],
            "negative": ["ke toan tong hop", "bao cao thue", "lap trinh"]
        },
        "skills": ["Tài chính", "Tín dụng", "Phân tích tài chính"],
    },
    {
        "id": "DU_LICH",
        "nganh": ["DU LỊCH"],
        "keywords": {
            "primary": [
                "huong dan vien du lich", "dieu hanh tour",
                "nhan vien le tan khach san", "tour operator",
                "travel consultant", "dat phong khach san",
                "du lich", "khach san"
            ],
            "secondary": [
                "tour", "hotel", "resort", "booking", "le tan",
                "nha hang khach san", "hospitality", "visa", "ve may bay"
            ],
            "negative": ["lap trinh", "ke toan", "xay dung"]
        },
        "skills": ["Điều hành tour", "Lễ tân", "Tư vấn du lịch"],
    },
    {
        "id": "NHAN_SU",
        "nganh": ["QUẢN TRỊ KINH DOANH"],
        "keywords": {
            "primary": [
                "nhan vien nhan su", "chuyen vien nhan su",
                "hr executive", "hr admin", "recruitment specialist",
                "tuyen dung", "hanh chinh nhan su", "c&b"
            ],
            "secondary": [
                "hr", "human resources", "bao hiem xa hoi",
                "hop dong lao dong", "cham cong", "tien luong", "dao tao noi bo"
            ],
            "negative": ["lap trinh", "ke toan", "marketing"]
        },
        "skills": ["Tuyển dụng", "Nhân sự", "C&B", "Hành chính"],
    },
    {
        "id": "GIAO_DUC",
        "nganh": ["GIÁO DỤC HỌC", "GIÁO DỤC MẦM NON", "GIÁO DỤC TIỂU HỌC"],
        "keywords": {
            "primary": [
                "giao vien mam non", "giao vien tieu hoc",
                "tro giang", "giao vien", "gia su",
                "dao tao", "education consultant"
            ],
            "secondary": [
                "giang day", "hoc sinh", "lop hoc", "bai giang",
                "chuong trinh dao tao", "mam non", "tieu hoc"
            ],
            "negative": ["giao vien tieng anh", "ielts", "toeic"]
        },
        "skills": ["Giảng dạy", "Soạn giáo án", "Quản lý lớp học"],
    },
    {
        "id": "TAM_LY",
        "nganh": ["TÂM LÝ HỌC"],
        "keywords": {
            "primary": [
                "chuyen vien tam ly", "tu van tam ly",
                "tham van hoc duong", "psychologist",
                "school counselor", "counselor"
            ],
            "secondary": [
                "tam ly", "tham van", "tu van hoc duong",
                "hanh vi", "tri lieu", "suc khoe tinh than"
            ],
            "negative": ["sales", "ban hang", "marketing"]
        },
        "skills": ["Tham vấn", "Tư vấn tâm lý", "Giao tiếp"],
    },
    {
        "id": "HOA_SINH",
        "nganh": ["CÔNG NGHỆ SINH HỌC", "HOÁ HỌC"],
        "keywords": {
            "primary": [
                "nhan vien phong thi nghiem", "lab technician",
                "kiem nghiem vien", "hoa nghiem",
                "cong nghe sinh hoc", "hoa hoc",
                "qc lab", "qa lab"
            ],
            "secondary": [
                "laboratory", "lab", "thi nghiem", "kiem nghiem",
                "hoa chat", "vi sinh", "sinh hoc", "mau thu"
            ],
            "negative": ["lap trinh", "ke toan", "marketing"]
        },
        "skills": ["Phòng thí nghiệm", "Kiểm nghiệm", "Hóa chất", "Vi sinh"],
    }
]

def clean_skills(skills):
    result = []
    seen = set()
    SOFT_SKILLS = {
        "giao tiếp", "làm việc nhóm", "chịu áp lực", "cẩn thận",
        "trung thực", "chăm chỉ", "ham học hỏi", "tư duy logic",
        "quản lý thời gian",
    }
    for s in skills or []:
        s = str(s).strip()
        key = s.lower()
        if not s or key in SOFT_SKILLS or key in seen:
            continue
        seen.add(key)
        result.append(s)
    return result[:8]

def map_nganh_to_nhom(nganh_list: list[str]) -> list[str]:
    fixed_nhom = []
    for nganh in nganh_list:
        nhom = NGANH_TO_NHOM.get(nganh.upper())
        if nhom and nhom not in fixed_nhom:
            fixed_nhom.append(nhom)
    return fixed_nhom

def _score_tier(kw_list, title, body, tier):
    score = 0
    matched = []
    for kw in kw_list:
        kw_norm = normalize_text(kw)
        is_phrase = " " in kw_norm
        if is_phrase:
            w_title = _W["phrase_primary_title"] if tier == "primary" else _W["secondary_title"]
            w_body  = _W["phrase_primary_body"]  if tier == "primary" else _W["secondary_body"]
        else:
            w_title = _W["single_primary_title"] if tier == "primary" else _W["secondary_title"]
            w_body  = _W["single_primary_body"]  if tier == "primary" else _W["secondary_body"]
        
        if kw_norm in title:
            score += w_title
            matched.append(f"[title] {kw}")
        elif kw_norm in body:
            score += w_body
            matched.append(f"[body] {kw}")
    return score, matched

def _has_negative(kw_list, title, body):
    combined = title + " " + body
    return any(normalize_text(kw) in combined for kw in kw_list)

def _score_rule(rule, title, body):
    kws = rule["keywords"]
    if _has_negative(kws.get("negative", []), title, body):
        return None
    total = 0
    matched = []
    s, m = _score_tier(kws.get("primary", []), title, body, "primary")
    total += s; matched += m
    s, m = _score_tier(kws.get("secondary", []), title, body, "secondary")
    total += s; matched += m
    return {"rule": rule, "score": total, "matched": matched} if total > 0 else None

def _resolve_conflict(candidates, title):
    if len(candidates) == 1: return candidates[0]
    top_score = candidates[0]["score"]
    close = [c for c in candidates if top_score - c["score"] <= _CONFLICT_GAP]
    if len(close) == 1: return close[0]
    def _primary_title_hits(c):
        primaries = c["rule"]["keywords"].get("primary", [])
        return sum(1 for kw in primaries if normalize_text(kw) in title)
    close.sort(key=_primary_title_hits, reverse=True)
    return close[0]

def rule_based_classify(job):
    title = normalize_text(job.get("title") or "")
    body  = normalize_text(" ".join([
        job.get("industry")    or "",
        job.get("requirement") or "",
        " ".join(job.get("skill_tags") or []),
    ]))
    results = []
    for rule in RULES_V2:
        res = _score_rule(rule, title, body)
        if res: results.append(res)
    if not results: return None
    
    results.sort(key=lambda x: x["score"], reverse=True)
    best = _resolve_conflict(results, title)
    
    if best["score"] < RULE_CONFIDENCE_THRESHOLD:
        return None
        
    rule = best["rule"]
    nganh = [n for n in rule["nganh"] if n.upper() in VALID_NGANH][:2]
    nhom  = map_nganh_to_nhom(nganh)
    confidence = min(round(best["score"] / _MAX_SCORE_ESTIMATE, 2), 1.0)
    
    return {
        "nhom": nhom,
        "nganh_hoc": nganh,
        "skills": clean_skills(rule.get("skills", [])),
        "classification_source": "rule",
        "rule_score": best["score"],
        "matched_keywords": best["matched"],
        "rule_id": rule["id"],
        "confidence": confidence
    }

# ============================================================================
# CELL 4: Load model
# ============================================================================
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

print(f"⏳ Loading {MODEL_ID}...")

# 4-bit quantization để vừa T4 16GB
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto",
    torch_dtype=torch.float16,
)

print(f"✅ Model loaded! VRAM used: {torch.cuda.memory_allocated()/1e9:.1f} GB")

# ============================================================================
# CELL 5: LLM inference functions
# ============================================================================
SYSTEM_PROMPT = f"""Bạn là chuyên gia phân loại việc làm cho Đại học Thủ Dầu Một.

DANH MỤC:
{CATALOG_TEXT}

Với mỗi job, trả về JSON:
{{"nhom":["TÊN NHÓM"],"nganh_hoc":["TÊN NGÀNH"],"skills":["skill1","skill2"]}}

QUY TẮC:
- Dựa vào title + industry + requirement → chọn nhóm/ngành PHÙ HỢP NHẤT
- Mỗi job chỉ 1-2 ngành, không gán nhiều
- Không match → nhom=[], nganh_hoc=[]
- skills: CHỈ hard skills (Python, React, AutoCAD, MISA, Docker, IELTS...)
- KHÔNG lấy soft skills (giao tiếp, làm việc nhóm, chăm chỉ)
- Tối đa 12 skills, viết hoa đúng tên

Trả JSON array, KHÔNG giải thích."""


def generate(prompt: str) -> str:
    """Run inference on local model."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            temperature=0.1,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode only new tokens
    new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(new_tokens, skip_special_tokens=True)


def build_batch_prompt(batch: list[dict]) -> str:
    items = []
    for i, job in enumerate(batch):
        items.append({
            "idx": i,
            "title": (job.get("title") or "")[:100],
            "industry": (job.get("industry") or "")[:60],
            "requirement": (job.get("requirement") or "")[:250],
            "skill_tags": (job.get("skill_tags") or [])[:8],
        })
    return json.dumps(items, ensure_ascii=False)


def parse_llm_response(text: str, batch_size: int) -> list[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        text = text.strip()

    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            return [result]
    except json.JSONDecodeError:
        # Try to find JSON in response
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        # Try individual JSON objects
        objects = re.findall(r'\{[^{}]*\}', text)
        if objects:
            parsed = []
            for obj_str in objects:
                try:
                    parsed.append(json.loads(obj_str))
                except json.JSONDecodeError:
                    pass
            if parsed:
                return parsed

    print(f"  ⚠️ Parse failed, returning empty")
    return [{"nhom": [], "nganh_hoc": [], "skills": []}] * batch_size


# ============================================================================
# CELL 6: Quick test (1 batch)
# ============================================================================
test_batch = jobs[:3]
test_prompt = build_batch_prompt(test_batch)
print("📝 Test prompt:", test_prompt[:200], "...")
print()

t0 = time.time()
test_response = generate(test_prompt)
print(f"⏱️ Inference time: {time.time()-t0:.1f}s")
print(f"📤 Response:\n{test_response[:500]}")

test_parsed = parse_llm_response(test_response, len(test_batch))
print(f"\n✅ Parsed {len(test_parsed)} results:")
for i, r in enumerate(test_parsed):
    print(f"  [{i}] nhom={r.get('nhom',[])} | nganh={r.get('nganh_hoc',[])} | skills={r.get('skills',[])[:5]}")

# ============================================================================
# CELL 7: Run full classification
# ============================================================================
from tqdm import tqdm

num_batches = math.ceil(len(jobs) / BATCH_SIZE)
results = []
errors = 0
total_classified = 0

print(f"🚀 Processing {len(jobs)} jobs in {num_batches} batches (size={BATCH_SIZE})...")

# Checkpoint: save every N batches
CHECKPOINT_EVERY = 50

for i in tqdm(range(num_batches), desc="Classifying"):
    batch = jobs[i * BATCH_SIZE: (i + 1) * BATCH_SIZE]
    
    # Pre-classify with rule-based system
    llm_batch = []
    llm_indices = []
    for j, job in enumerate(batch):
        rule_res = rule_based_classify(job)
        if rule_res:
            job["nhom"] = rule_res["nhom"]
            job["nganh_hoc"] = rule_res["nganh_hoc"]
            job["llm_skills"] = rule_res["skills"]
            existing_skills = set(job.get("skill_tags", []))
            rule_skills = set(rule_res["skills"])
            job["skill_tags_merged"] = sorted(existing_skills | rule_skills)
            total_classified += 1
            results.append(job)
        else:
            llm_batch.append(job)
            llm_indices.append(j)

    # Use LLM for remaining jobs that failed rule-based
    if llm_batch:
        prompt = build_batch_prompt(llm_batch)
        try:
            response_text = generate(prompt)
            parsed = parse_llm_response(response_text, len(llm_batch))

            for j, (job, classification) in enumerate(zip(llm_batch, parsed)):
                job["nhom"] = classification.get("nhom", [])
                job["nganh_hoc"] = classification.get("nganh_hoc", [])
                job["llm_skills"] = classification.get("skills", [])

                existing_skills = set(job.get("skill_tags", []))
                llm_skills = set(classification.get("skills", []))
                job["skill_tags_merged"] = sorted(existing_skills | llm_skills)

                if job["nhom"]:
                    total_classified += 1
                results.append(job)

        except Exception as e:
            print(f"\n  ❌ Batch {i+1} LLM error: {e}")
            for job in llm_batch:
                job["nhom"] = []
                job["nganh_hoc"] = []
                job["llm_skills"] = []
                job["skill_tags_merged"] = job.get("skill_tags", [])
                results.append(job)
            errors += 1

    # Checkpoint
    if (i + 1) % CHECKPOINT_EVERY == 0:
        save_json(results, f"checkpoint_{i+1}.json")
        print(f"  💾 Checkpoint: {len(results)} jobs saved")

    # Clear GPU cache periodically
    if (i + 1) % 20 == 0:
        torch.cuda.empty_cache()

print(f"\n✅ Done! {total_classified}/{len(results)} classified ({total_classified/max(len(results),1)*100:.1f}%)")
print(f"   Errors: {errors} batches")

# ============================================================================
# CELL 8: Stats
# ============================================================================
nhom_counter = Counter()
nganh_counter = Counter()
for job in results:
    for n in job.get("nhom", []):
        nhom_counter[n] += 1
    for n in job.get("nganh_hoc", []):
        nganh_counter[n] += 1

print("\n📊 PHÂN BỐ THEO NHÓM:")
for nhom, count in nhom_counter.most_common():
    print(f"  {nhom}: {count}")

print("\n📊 TOP 15 NGÀNH:")
for nganh, count in nganh_counter.most_common(15):
    print(f"  {nganh}: {count}")

all_skills = []
for job in results:
    all_skills.extend(job.get("llm_skills", []))

print(f"\n📊 TOP 20 HARD SKILLS:")
for skill, count in Counter(all_skills).most_common(20):
    print(f"  {skill}: {count}")

unclassified = [j for j in results if not j.get("nhom")]
print(f"\n⚠️ Chưa classify: {len(unclassified)} jobs")

# ============================================================================
# CELL 9: Save final output
# ============================================================================
final_output = []
for job in results:
    out = dict(job)
    out["nhom"] = job.get("nhom", [])
    out["nganh_hoc"] = job.get("nganh_hoc", [])
    if job.get("skill_tags_merged"):
        out["skill_tags"] = job["skill_tags_merged"]
    out.pop("llm_skills", None)
    out.pop("skill_tags_merged", None)
    final_output.append(out)

save_json(final_output, OUTPUT_FILE)
print(f"\n🎯 Xong! Dùng file '{OUTPUT_FILE}' với seed script:")
print(f"   python seed_pipeline_data.py --file {OUTPUT_FILE}")

# Download
# from google.colab import files
# files.download(OUTPUT_FILE)
