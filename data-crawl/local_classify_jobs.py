import json
import os
import re
import time
import math
import unicodedata
from collections import Counter
from typing import Any
from tqdm import tqdm

INPUT_FILE = "data_jobs_pipeline_output.json"
CATALOG_FILE = "donviTDMU_phan_cap.json"
OUTPUT_FILE = "data_jobs_classified_local.json"

# ============================================================================
# LOAD DATA
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

print(f"📊 Loaded {len(jobs)} jobs, {len(catalog)} groups in catalog")

# ============================================================================
# BUILD CATALOG MAPPING
# ============================================================================
VALID_NGANH = set()
NGANH_TO_NHOM = {}

for group in catalog:
    nhom = group.get("nhom", "")
    for nganh in group.get("nganh_hoc", []):
        ten = nganh.get("ten", "")
        ten_upper = ten.upper()
        VALID_NGANH.add(ten_upper)
        NGANH_TO_NHOM[ten_upper] = nhom

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', str(text)).encode('ascii', 'ignore').decode('utf-8')
    return text.lower()

# ============================================================================
# INDUSTRY MAPPING
# ============================================================================
CATEGORY_TO_MAJOR = {
    # =========================
    # CNTT / DIGITAL
    # =========================
    "IT phần mềm": [
        "Công nghệ thông tin",
        "Kỹ thuật phần mềm",
        "Hệ thống thông tin",
        "Trí tuệ nhân tạo và Khoa học dữ liệu"
    ],
    "IT Phần cứng - mạng": [
        "Công nghệ thông tin",
        "Hệ thống thông tin"
    ],
    "Thương mại điện tử": [
        "Thương mại điện tử",
        "Marketing",
        "Hệ thống thông tin"
    ],
    "Truyền thông": [
        "Truyền thông đa phương tiện",
        "Marketing"
    ],
    "Thiết kế - Mỹ thuật": [
        "Thiết kế đồ họa",
        "Mỹ thuật",
        "Truyền thông đa phương tiện"
    ],

    # =========================
    # KỸ THUẬT - CÔNG NGHIỆP
    # =========================
    "Kỹ thuật": [
        "Kỹ thuật điện",
        "Kỹ thuật cơ điện tử",
        "Kỹ thuật điều khiển và tự động hoá",
        "Công nghệ kỹ thuật ô tô",
        "Kỹ thuật xây dựng"
    ],
    "Điện - Điện tử": [
        "Kỹ thuật điện",
        "Kỹ thuật điều khiển và tự động hoá",
        "Kỹ thuật cơ điện tử"
    ],
    "Điện / Điện tử / Điện lạnh / Điện công nghiệp": [
        "Kỹ thuật điện",
        "Kỹ thuật điều khiển và tự động hoá",
        "Kỹ thuật cơ điện tử"
    ],
    "Cơ khí / Ô tô / Tự động hóa , Điện / Điện tử / Điện lạnh / Điện công nghiệp , Xây dựng": [
        "Công nghệ kỹ thuật ô tô",
        "Kỹ thuật cơ điện tử",
        "Kỹ thuật điện",
        "Kỹ thuật điều khiển và tự động hoá",
        "Kỹ thuật xây dựng"
    ],
    "Bảo trì": [
        "Kỹ thuật điện",
        "Kỹ thuật cơ điện tử",
        "Công nghệ kỹ thuật ô tô"
    ],
    "Bảo trì / Sửa chữa": [
        "Kỹ thuật điện",
        "Kỹ thuật cơ điện tử",
        "Công nghệ kỹ thuật ô tô"
    ],
    "Sản xuất - Vận hành sản xuất": [
        "Quản lý công nghiệp",
        "Kỹ thuật cơ điện tử"
    ],
    "Sản xuất / Vận hành sản xuất": [
        "Quản lý công nghiệp",
        "Kỹ thuật cơ điện tử"
    ],
    "Quản lý chất lượng (QA/QC)": [
        "Quản lý công nghiệp",
        "Công nghệ thực phẩm"
    ],
    "Thẩm định - Giám thẩm định - Quản lý chất lượng": [
        "Quản lý công nghiệp",
        "Kế toán",
        "Kiểm toán"
    ],
    "An toàn lao động": [
        "Kỹ thuật môi trường",
        "Khoa học môi trường"
    ],

    # =========================
    # LOGISTICS / KINH TẾ
    # =========================
    "Logistic": [
        "Logistics và quản lý chuỗi cung ứng"
    ],
    "Xuất - nhập khẩu": [
        "Logistics và quản lý chuỗi cung ứng",
        "Quan hệ quốc tế",
        "Ngôn ngữ Trung Quốc"
    ],
    "Vận tải - Lái xe": [
        "Logistics và quản lý chuỗi cung ứng"
    ],
    "Vận chuyển giao nhận": [
        "Logistics và quản lý chuỗi cung ứng"
    ],
    "Quản lý đơn hàng": [
        "Logistics và quản lý chuỗi cung ứng",
        "Thương mại điện tử"
    ],
    "Bán lẻ / Bán sỉ": [
        "Marketing",
        "Quản trị kinh doanh",
        "Thương mại điện tử"
    ],
    "KD bất động sản": [
        "Quản trị kinh doanh",
        "Marketing",
        "Tài chính - Ngân hàng"
    ],
    "Nhân sự": [
        "Quản trị kinh doanh",
        "Tâm lý học"
    ],
    "Tư vấn": [
        "Quản trị kinh doanh",
        "Marketing",
        "Tâm lý học"
    ],
    "Hành chính - Văn phòng": [
        "Quản lý nhà nước",
        "Quản trị kinh doanh"
    ],
    "Hành chính / Thư ký": [
        "Quản lý nhà nước",
        "Quản trị kinh doanh"
    ],
    "Nhập liệu": [
        "Hệ thống thông tin",
        "Quản trị kinh doanh"
    ],
    "Quản lý điều hành": [
        "Quản trị kinh doanh",
        "Quản lý công nghiệp"
    ],

    # =========================
    # GIÁO DỤC / NGÔN NGỮ
    # =========================
    "Giáo dục - Đào tạo": [
        "Giáo dục học",
        "Giáo dục Mầm non",
        "Giáo dục Tiểu học",
        "Sư phạm Lịch sử",
        "Sư phạm Ngữ văn"
    ],
    "Biên - Phiên dịch": [
        "Ngôn ngữ Anh",
        "Ngôn ngữ Trung Quốc",
        "Ngôn ngữ Hàn Quốc"
    ],
    "Biên phiên dịch": [
        "Ngôn ngữ Anh",
        "Ngôn ngữ Trung Quốc",
        "Ngôn ngữ Hàn Quốc"
    ],

    # =========================
    # Y TẾ / HÓA / SINH
    # =========================
    "Y tế - Dược": [
        "Công nghệ sinh học",
        "Hoá học"
    ],
    "Y tế / Chăm sóc sức khỏe / Thẩm mỹ / Làm đẹp": [
        "Công nghệ sinh học",
        "Hoá học"
    ],
    "Dược phẩm/ Hóa Mỹ Phẩm , Y tế / Chăm sóc sức khỏe / Thẩm mỹ / Làm đẹp": [
        "Hoá học",
        "Công nghệ sinh học"
    ],
    "Làm đẹp - Thể lực - Spa": [
        "Công nghệ sinh học",
        "Hoá học"
    ],

    # =========================
    # DU LỊCH - DỊCH VỤ
    # =========================
    "Dịch vụ": [
        "Du lịch",
        "Quản trị kinh doanh"
    ],
    "Chăm sóc khách hàng": [
        "Quản trị kinh doanh",
        "Marketing"
    ],
    "Lễ tân - PG - PB": [
        "Du lịch",
        "Marketing"
    ],
    "Pha chế - Bar": [
        "Du lịch"
    ],
    "Đầu bếp - phụ bếp": [
        "Du lịch"
    ],

    # =========================
    # XÂY DỰNG / KIẾN TRÚC
    # =========================
    "Giao thông vận tải - Thủy lợi - Cầu đường": [
        "Kỹ thuật xây dựng",
        "Quy hoạch vùng và đô thị"
    ],

    # =========================
    # THỜI TRANG / MAY MẶC
    # =========================
    "Dệt may - Da giày": [
        "Công nghệ chế biến lâm sản",
        "Thiết kế đồ họa"
    ],
    "Dệt may / Da giày / Thời trang": [
        "Thiết kế đồ họa",
        "Mỹ thuật"
    ],

    # =========================
    # KHÁC
    # =========================
    "Bảo vệ": [],
    "Việc làm thời vụ": [],
    "Lao động phổ thông": [],
    "Ngành nghề khác": [],
    "Khong_co_thong_tin": []
}

INDUSTRY_MAPPING = {normalize_text(k): [n.upper() for n in v] for k, v in CATEGORY_TO_MAJOR.items()}

# ============================================================================
# RULES V2
# ============================================================================
_W = {
    "phrase_primary_title": 12,
    "phrase_primary_body":   6,
    "single_primary_title":  9,
    "single_primary_body":   3,
    "secondary_title":       4,
    "secondary_body":        1,
}

RULE_CONFIDENCE_THRESHOLD = 6
_CONFLICT_GAP = 3
_MAX_SCORE_ESTIMATE = 60

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
    industry_raw = normalize_text(job.get("industry") or "")
    
    body  = normalize_text(" ".join([
        job.get("industry")    or "",
        job.get("requirement") or "",
        " ".join(job.get("skill_tags") or []),
    ]))
    
    results = []
    
    # Check map industry direct mapping to boost
    mapped_nganh_from_industry = []
    for key, mapped_nganh in INDUSTRY_MAPPING.items():
        if key in industry_raw:
            mapped_nganh_from_industry.extend(mapped_nganh)
            break
            
    for rule in RULES_V2:
        res = _score_rule(rule, title, body)
        if res:
            # Tăng điểm cực mạnh nếu map industry trùng với ngành của rule
            if any(n.upper() in mapped_nganh_from_industry for n in rule["nganh"]):
                res["score"] += 15
                res["matched"].append(f"[industry_map]")
            results.append(res)
            
    if not results: 
        # Fallback: nếu hoàn toàn không có rule nào khớp, thử chỉ dùng industry
        if mapped_nganh_from_industry:
            nganh = [n for n in mapped_nganh_from_industry if n.upper() in VALID_NGANH][:2]
            if nganh:
                nhom = map_nganh_to_nhom(nganh)
                return {
                    "nhom": nhom,
                    "nganh_hoc": nganh,
                    "skills": [],
                    "classification_source": "industry_map",
                    "rule_score": 15,
                    "matched_keywords": ["[industry_map]"],
                    "rule_id": "INDUSTRY_FALLBACK",
                    "confidence": 0.5
                }
        return None
    
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
# MAIN PIPELINE
# ============================================================================
if __name__ == "__main__":
    results = []
    errors = 0
    total_classified = 0

    print(f"🚀 Processing {len(jobs)} jobs with Rule-based engine...")

    for job in tqdm(jobs, desc="Classifying"):
        try:
            rule_res = rule_based_classify(job)
            if rule_res:
                job["nhom"] = rule_res["nhom"]
                job["nganh_hoc"] = rule_res["nganh_hoc"]
                job["rule_skills"] = rule_res["skills"]
                
                existing_skills = set(job.get("skill_tags", []))
                rule_skills = set(rule_res["skills"])
                job["skill_tags_merged"] = sorted(existing_skills | rule_skills)
                total_classified += 1
            else:
                job["nhom"] = []
                job["nganh_hoc"] = []
                job["rule_skills"] = []
                job["skill_tags_merged"] = job.get("skill_tags", [])
                
            results.append(job)
        except Exception as e:
            print(f"Error processing job: {e}")
            job["nhom"] = []
            job["nganh_hoc"] = []
            job["rule_skills"] = []
            job["skill_tags_merged"] = job.get("skill_tags", [])
            results.append(job)
            errors += 1

    print(f"\n✅ Done! {total_classified}/{len(results)} classified ({total_classified/max(len(results),1)*100:.1f}%)")
    if errors:
        print(f"   Errors: {errors} jobs")

    # Stats
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

    unclassified = [j for j in results if not j.get("nhom")]
    print(f"\n⚠️ Chưa classify: {len(unclassified)} jobs")

    # Format for final output
    final_output = []
    for job in results:
        out = dict(job)
        out["nhom"] = job.get("nhom", [])
        out["nganh_hoc"] = job.get("nganh_hoc", [])
        if job.get("skill_tags_merged"):
            out["skill_tags"] = job["skill_tags_merged"]
        out.pop("rule_skills", None)
        out.pop("skill_tags_merged", None)
        out.pop("llm_skills", None)
        final_output.append(out)

    save_json(final_output, OUTPUT_FILE)
    print(f"\n🎯 Xong! Dùng file '{OUTPUT_FILE}' với seed script:")
    print(f"   python seed_pipeline_data.py --file {OUTPUT_FILE}")
