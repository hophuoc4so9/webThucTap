"""
Pipeline configuration: thresholds, keyword lists, skill taxonomy, etc.
"""
from __future__ import annotations

# ─── Experience filtering ────────────────────────────────────────────────────
# Max years of experience acceptable for intern/fresher/junior
MAX_EXPERIENCE_YEARS = 2

# ─── Title / role blacklist ──────────────────────────────────────────────────
# Vietnamese + English keywords that indicate senior / management roles
TITLE_BLACKLIST_EXACT: list[str] = [
    # Vietnamese
    "giám đốc", "phó giám đốc", "tổng giám đốc",
    "trưởng phòng", "phó phòng", "trưởng bộ phận",
    "chỉ huy trưởng", "chủ tịch", "phó chủ tịch",
    "kế toán trưởng", "bếp trưởng",
    # English
    "director", "vice president", "vp ", "c-level", "cto", "cfo", "coo", "ceo",
    "chief", "head of", "principal",
]

TITLE_BLACKLIST_WORD: list[str] = [
    # English seniority
    "senior", "sr.", "sr ", "lead", "leader",
    "manager", "supervisor", "superintendent",
    "architect", "expert",
    # Vietnamese seniority
    "quản lý", "giám sát",
    "trưởng nhóm", "tổ trưởng",
]

# Keywords that strongly indicate intern / fresher / junior
TITLE_WHITELIST: list[str] = [
    "intern", "internship", "thực tập",
    "fresher", "fresh graduate", "mới tốt nghiệp",
    "junior", "jr.", "jr ",
    "entry level", "entry-level",
    "sinh viên", "student",
    "tập sự", "học việc",
    "trợ lý", "assistant",
    "nhân viên",  # "nhân viên" alone is neutral–OK to keep
    "thực tập sinh",
]

# ─── Experience text blacklist ───────────────────────────────────────────────
# Regex-able patterns in the `experience` field that indicate ≥ 3 years
EXPERIENCE_BLACKLIST_PATTERNS: list[str] = [
    r"(?:trên|trên\s+)\s*[3-9]\d*",        # "Trên 3", "Trên 5"
    r"[3-9]\d*\s*[-–]\s*\d+\s*(?:năm|year)", # "3-5 Năm", "5-7 years"
    r"[3-9]\d*\s*\+?\s*(?:năm|year)",         # "3+ năm", "5 years"
    r"(?:min(?:imum)?|at\s+least|tối\s+thiểu)\s*[3-9]\d*\s*(?:năm|year)",
]

# ─── Requirement text indicators of too-senior role ──────────────────────────
REQUIREMENT_SENIOR_KEYWORDS: list[str] = [
    # Vietnamese
    "kinh nghiệm quản lý",
    "kinh nghiệm lãnh đạo",
    "quản lý đội ngũ",
    "quản lý nhóm",
    "kinh nghiệm 3 năm", "kinh nghiệm 4 năm", "kinh nghiệm 5 năm",
    "kinh nghiệm 6 năm", "kinh nghiệm 7 năm", "kinh nghiệm 8 năm",
    "kinh nghiệm 9 năm", "kinh nghiệm 10 năm",
    "tối thiểu 3 năm", "tối thiểu 4 năm", "tối thiểu 5 năm",
    "tối thiểu 6 năm", "tối thiểu 7 năm",
    "ít nhất 3 năm", "ít nhất 4 năm", "ít nhất 5 năm",
    "ít nhất 6 năm", "ít nhất 7 năm",
    # English
    "management experience",
    "leadership experience",
    "managing a team",
    "minimum 3 years", "minimum 4 years", "minimum 5 years",
    "at least 3 years", "at least 4 years", "at least 5 years",
    "3+ years experience", "4+ years experience", "5+ years experience",
    "6+ years experience", "7+ years experience",
    "years of experience in a senior",
    "years of experience in a lead",
]

# ─── Scoring weights ─────────────────────────────────────────────────────────
SCORE_WEIGHTS = {
    "title_whitelist_match": +30,      # title contains intern/fresher/junior
    "experience_empty":      +10,      # no experience required → good
    "experience_low":        +15,      # explicitly ≤ 1 year
    "degree_thpt":           +5,       # only requires high school
    "industry_student":      +10,      # industry = "Mới tốt nghiệp / Thực tập"
    "title_blacklist_exact": -100,     # immediate reject
    "title_blacklist_word":  -50,      # strong negative signal
    "experience_high":       -40,      # ≥ 3 years
    "requirement_senior":    -25,      # senior keywords in requirement
    "salary_too_high":       -15,      # salary > 30M → probably not entry-level
    "age_min_high":          -20,      # age min ≥ 28
}

# Jobs below this threshold are rejected
SCORE_REJECTION_THRESHOLD = -10

# ─── Salary parsing ──────────────────────────────────────────────────────────
# Max salary (VND) that seems reasonable for intern/fresher
SALARY_FRESHER_MAX_VND = 30_000_000

# ─── Duplicate detection ─────────────────────────────────────────────────────
DUPLICATE_TITLE_SIMILARITY = 0.90  # Jaccard similarity threshold

# ─── Skills taxonomy ─────────────────────────────────────────────────────────
# Master list of skills organized by category
# These will be matched against job description + requirements
SKILLS_TAXONOMY: dict[str, list[str]] = {
    # === Programming Languages ===
    # NOTE: "C" and "R" removed — too short, causes massive false positives in Vietnamese text
    "Programming": [
        "Python", "Java", "JavaScript", "TypeScript", "C#", "C++",
        "C Language", "Lập trình C",
        "PHP", "Ruby", "Golang", "Rust", "Kotlin", "Swift",
        "Dart", "Scala", "R Language", "MATLAB", "Perl", "Shell", "Bash",
        "SQL", "PL/SQL", "T-SQL", "VBA", "Assembly",
    ],
    # === Web Frameworks ===
    "Web Framework": [
        "React", "React.js", "ReactJS", "Angular", "Vue", "Vue.js", "VueJS",
        "Next.js", "NextJS", "Nuxt", "Nuxt.js", "Svelte",
        "Node.js", "NodeJS", "Express", "Express.js", "NestJS", "Nest.js",
        "Django", "Flask", "FastAPI", "Spring", "Spring Boot",
        "Laravel", "Symfony", "CodeIgniter",
        "ASP.NET", ".NET", ".NET Core", "Blazor",
        "Ruby on Rails", "Rails",
    ],
    # === Mobile ===
    "Mobile": [
        "React Native", "Flutter", "Ionic", "Xamarin",
        "SwiftUI", "UIKit", "Jetpack Compose",
        "Android", "iOS", "Kotlin Multiplatform",
    ],
    # === Database ===
    "Database": [
        "MySQL", "PostgreSQL", "Postgres", "SQL Server", "MSSQL",
        "Oracle", "SQLite", "MariaDB",
        "MongoDB", "Redis", "Elasticsearch", "Cassandra",
        "DynamoDB", "Firebase", "Firestore", "Supabase",
        "Neo4j", "InfluxDB", "CouchDB",
    ],
    # === Cloud & DevOps ===
    "Cloud/DevOps": [
        "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP",
        "Docker", "Kubernetes", "K8s", "Terraform", "Ansible",
        "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI",
        "Nginx", "Apache", "Linux", "Ubuntu", "CentOS",
        "CI/CD", "DevOps", "Microservices",
    ],
    # === AI / ML / Data ===
    "AI/ML/Data": [
        "Machine Learning", "Deep Learning", "Artificial Intelligence",
        "TensorFlow", "PyTorch", "Keras", "Scikit-learn",
        "NLP", "Computer Vision", "LLM", "GPT", "BERT",
        "Pandas", "NumPy", "Spark", "Hadoop", "Airflow",
        "Power BI", "Tableau", "Looker", "Data Warehouse",
        "ETL", "Data Pipeline", "Big Data",
    ],
    # === Design & UI/UX ===
    "Design": [
        "Figma", "Adobe XD", "Sketch", "InVision",
        "Photoshop", "Illustrator", "After Effects", "Premiere Pro",
        "Canva", "CorelDRAW",
        "UI/UX", "UX Design", "UI Design", "Wireframe", "Prototype",
        "AutoCAD", "Revit", "SketchUp", "3ds Max", "Blender",
        "SolidWorks", "CATIA",
    ],
    # === Testing / QA ===
    "Testing/QA": [
        "Selenium", "Cypress", "Jest", "Mocha", "Playwright",
        "JUnit", "TestNG", "Postman", "Swagger",
        "Manual Testing", "Automation Testing", "QA", "QC",
        "Performance Testing", "Load Testing", "JMeter",
    ],
    # === Marketing / Digital ===
    "Marketing": [
        "SEO", "SEM", "Google Ads", "Facebook Ads", "TikTok Ads",
        "Google Analytics", "GTM", "Tag Manager",
        "Content Marketing", "Email Marketing", "Social Media",
        "Digital Marketing", "Inbound Marketing",
        "HubSpot", "Mailchimp", "Hootsuite",
    ],
    # === Business / Office ===
    "Business/Office": [
        "Excel", "Word", "PowerPoint", "Google Sheets",
        "SAP", "ERP", "CRM", "Salesforce", "Odoo",
        "JIRA", "Trello", "Asana", "Slack", "Confluence",
        "Agile", "Scrum", "Kanban", "PMP",
        "MS Project", "Microsoft Project",
    ],
    # === Accounting / Finance ===
    "Accounting/Finance": [
        "MISA", "FAST Accounting", "Bravo",
        "IFRS", "VAS",
        "Thuế GTGT", "Thuế TNCN", "BHXH",
    ],
    # === Languages (human) ===
    "Languages": [
        "IELTS", "TOEIC", "TOEFL", "HSK",
        "JLPT", "N1", "N2", "N3",
        "Tiếng Anh", "Tiếng Nhật", "Tiếng Trung", "Tiếng Hàn",
        "English", "Japanese", "Chinese", "Korean",
    ],
    # === Soft Skills ===
    "Soft Skills": [
        "Teamwork", "Communication", "Problem Solving",
        "Time Management", "Leadership", "Critical Thinking",
        "Presentation", "Negotiation",
        "Làm việc nhóm", "Giao tiếp", "Thuyết trình",
    ],
}

# ─── Location normalization ──────────────────────────────────────────────────
LOCATION_ALIASES: dict[str, str] = {
    "hcm": "Hồ Chí Minh", "tp.hcm": "Hồ Chí Minh", "tp hcm": "Hồ Chí Minh",
    "tphcm": "Hồ Chí Minh", "sài gòn": "Hồ Chí Minh", "saigon": "Hồ Chí Minh",
    "ho chi minh": "Hồ Chí Minh", "hồ chí minh": "Hồ Chí Minh",
    "hn": "Hà Nội", "ha noi": "Hà Nội", "hà nội": "Hà Nội", "hanoi": "Hà Nội",
    "đn": "Đà Nẵng", "da nang": "Đà Nẵng", "đà nẵng": "Đà Nẵng", "danang": "Đà Nẵng",
    "bình dương": "Bình Dương", "binh duong": "Bình Dương",
    "đồng nai": "Đồng Nai", "dong nai": "Đồng Nai",
    "long an": "Long An",
    "bà rịa - vũng tàu": "Bà Rịa - Vũng Tàu", "vũng tàu": "Bà Rịa - Vũng Tàu",
    "cần thơ": "Cần Thơ", "can tho": "Cần Thơ",
    "hải phòng": "Hải Phòng", "hai phong": "Hải Phòng",
    "bắc ninh": "Bắc Ninh", "bac ninh": "Bắc Ninh",
    "khánh hòa": "Khánh Hòa", "nha trang": "Khánh Hòa",
    "thừa thiên huế": "Thừa Thiên Huế", "huế": "Thừa Thiên Huế",
    "nghệ an": "Nghệ An", "hà tĩnh": "Hà Tĩnh",
    "quảng ninh": "Quảng Ninh", "thái nguyên": "Thái Nguyên",
    "lâm đồng": "Lâm Đồng", "đà lạt": "Lâm Đồng",
    "an giang": "An Giang", "kiên giang": "Kiên Giang",
    "bình định": "Bình Định", "gia lai": "Gia Lai",
    "tây ninh": "Tây Ninh", "tiền giang": "Tiền Giang",
    "bình phước": "Bình Phước", "bình thuận": "Bình Thuận",
}

# ─── Employment type normalization ───────────────────────────────────────────
EMPLOYMENT_TYPE_MAP: dict[str, str] = {
    "full-time": "full-time",
    "fulltime": "full-time",
    "toàn thời gian": "full-time",
    "part-time": "part-time",
    "parttime": "part-time",
    "bán thời gian": "part-time",
    "intern": "internship",
    "internship": "internship",
    "thực tập": "internship",
    "thực tập sinh": "internship",
    "freelance": "freelance",
    "remote": "remote",
    "từ xa": "remote",
    "contract": "contract",
    "hợp đồng": "contract",
}
