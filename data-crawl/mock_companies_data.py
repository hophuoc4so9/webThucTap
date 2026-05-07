"""
Script bổ sung/mock dữ liệu nâng cao cho các công ty hiện có trong database.
Nếu công ty nào hiện tại chỉ có mỗi 'name' hoặc bị thiếu các thông tin quan trọng như logo,
mô tả, địa chỉ, website,... script này sẽ tự động sinh ra dữ liệu mẫu cực kỳ đẹp, hiện đại
và cập nhật lại thông tin thông qua API Gateway.

Cách dùng:
    python mock_companies_data.py
    python mock_companies_data.py --url http://localhost:8082 --force
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import unicodedata
import requests

# Cấu hình UTF-8 cho terminal Windows để tránh lỗi UnicodeEncodeError khi in tiếng Việt
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

GATEWAY_URL = "http://localhost:8082"

# Các bảng màu hiện đại (gần giống bảng màu Tailwind) dùng để tạo Logo cực đẹp
LOGO_BACKGROUNDS = [
    "4f46e5",  # Indigo
    "0ea5e9",  # Sky Blue
    "10b981",  # Emerald Green
    "f59e0b",  # Amber Orange
    "ec4899",  # Pink
    "8b5cf6",  # Purple
    "f43f5e",  # Rose
    "14b8a6",  # Teal
    "06b6d4",  # Cyan
    "34d399",  # Mint
    "2563eb",  # Blue
]

# Danh sách banner phong cách văn phòng hiện đại (Unsplash)
BANNER_SAMPLES = [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&h=300&q=80",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&h=300&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&h=300&q=80",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&h=300&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&h=300&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&h=300&q=80",
    "https://images.unsplash.com/photo-1497366412874-341509785df0?auto=format&fit=crop&w=1200&h=300&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&h=300&q=80",
]

# Danh sách ảnh giới thiệu văn phòng/hoạt động (Unsplash)
ABOUT_IMAGES_SAMPLES = [
    [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80"
    ],
    [
        "https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80"
    ],
    [
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
    ],
    [
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80"
    ]
]

# Các quy mô công ty mẫu
SIZES = [
    "10-50 nhân viên",
    "50-100 nhân viên",
    "100-500 nhân viên",
    "500-1000 nhân viên",
    "1000+ nhân viên"
]

# Danh sách tỉnh thành và địa chỉ mẫu cụ thể, sang xịn mịn
LOCATION_POOL = {
    "Bình Dương": [
        "Đại lộ Bình Dương, Phú Hòa, Thủ Dầu Một, Bình Dương",
        "Đường Lê Lợi, Hòa Phú, Thủ Dầu Một, Bình Dương",
        "Khu công nghiệp VSIP I, Thuận An, Bình Dương",
        "Đường ĐT743, Dĩ An, Bình Dương"
    ],
    "TP. HCM": [
        "Đường Nguyễn Huệ, Bến Nghé, Quận 1, TP. HCM",
        "Tòa nhà Landmark 81, Điện Biên Phủ, Bình Thạnh, TP. HCM",
        "Khu Công nghệ cao, Tân Phú, Quận 9, TP. HCM",
        "Đường Nguyễn Lương Bằng, Tân Phú, Quận 7, TP. HCM"
    ],
    "Hà Nội": [
        "Phố Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
        "Đường Nguyễn Trãi, Thanh Xuân, Hà Nội",
        "Phố Tràng Tiền, Hoàn Kiếm, Hà Nội",
        "Tòa nhà Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội"
    ],
    "Đà Nẵng": [
        "Đường Bạch Đằng, Hải Châu, Đà Nẵng",
        "Khu công viên phần mềm Đà Nẵng, Hải Châu, Đà Nẵng",
        "Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng"
    ]
}

def slugify(text: str) -> str:
    """Chuyển đổi tên công ty thành dạng slug không dấu để sinh email/website."""
    if not text:
        return "company"
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[\s_-]+", ".", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text[:40] or "company"

def get_short_name(name: str) -> str:
    """Lấy chữ cái đầu tiên của công ty hoặc từ viết tắt (max 4 kí tự) làm text logo."""
    words = [w for w in re.split(r"[\s._-]+", name) if w]
    # Lọc bỏ các từ thông dụng như "Công", "ty", "TNHH", "Cổ", "phần", "Group", "Corporation", "Co", "Ltd"
    ignored_words = {"cong", "ty", "tnhh", "co", "phan", "group", "corporation", "ltd", "cp", "one", "member", "viet", "nam"}
    filtered_words = [w for w in words if w.lower() not in ignored_words]
    
    if not filtered_words:
        filtered_words = words[:2] if words else ["C"]
        
    if len(filtered_words) >= 2:
        # Lấy chữ cái đầu của mỗi từ
        short = "".join(w[0].upper() for w in filtered_words[:3])
    else:
        # Lấy 3 chữ cái đầu của từ duy nhất đó
        short = filtered_words[0][:3].upper()
    return short

def detect_industry(name: str, jobs: list[dict] = None) -> str:
    """
    Phân tích tên công ty và danh sách các tin tuyển dụng (jobs)
    để gán lĩnh vực phù hợp nhất.
    """
    # 1. Ưu tiên phân tích dựa trên danh sách các công việc hiện tại của công ty
    if jobs:
        # Gom tất cả industry từ danh sách jobs
        job_industries = []
        job_titles = []
        for j in jobs:
            ind = j.get("industry") or j.get("field")
            if ind and ind.strip():
                job_industries.append(ind.strip())
            title = j.get("title")
            if title and title.strip():
                job_titles.append(title.strip().lower())
        
        # Nếu có trường industry trong các jobs, lấy ngành phổ biến nhất
        if job_industries:
            from collections import Counter
            most_common_ind = Counter(job_industries).most_common(1)[0][0]
            # Chuẩn hóa một số ngành thông dụng nếu cần
            mic = most_common_ind.lower()
            if any(k in mic for k in ["it", "phần mềm", "công nghệ thông tin", "tech", "software", "lập trình"]):
                return "Công nghệ thông tin"
            if any(k in mic for k in ["marketing", "kinh doanh", "bán hàng", "sales", "tiếp thị"]):
                return "Kinh doanh / Marketing"
            if any(k in mic for k in ["kế toán", "kiểm toán", "tài chính", "accounting", "finance"]):
                return "Kế toán / Kiểm toán"
            if any(k in mic for k in ["nhân sự", "hr", "hành chính", "human resource"]):
                return "Hành chính / Nhân sự"
            if any(k in mic for k in ["giáo dục", "đào tạo", "education", "giảng dạy"]):
                return "Giáo dục / Đào tạo"
            return most_common_ind

        # Nếu không có industry rõ ràng nhưng có tiêu đề công việc, phân tích qua từ khóa tiêu đề công việc
        if job_titles:
            it_count = sum(1 for t in job_titles if any(k in t for k in ["lập trình", "developer", "tester", "it", "phần mềm", "web", "sư", "engineer", "code", "coder", "ios", "android", "node", "java", "python", "react"]))
            mkt_count = sum(1 for t in job_titles if any(k in t for k in ["sale", "kinh doanh", "marketing", "chăm sóc", "cskh", "tư vấn", "seo", "quảng cáo", "bán hàng", "tele", "account"]))
            acc_count = sum(1 for t in job_titles if any(k in t for k in ["kế toán", "kiểm toán", "thuế", "accounting", "auditor", "quỹ"]))
            hr_count = sum(1 for t in job_titles if any(k in t for k in ["nhân sự", "tuyển dụng", "hr", "recruitment", "hành chính", "admin", "trợ lý"]))
            lang_count = sum(1 for t in job_titles if any(k in t for k in ["tiếng", "phiên dịch", "dịch thuật", "japanese", "english", "korean", "chinese", "ngoại ngữ"]))
            edu_count = sum(1 for t in job_titles if any(k in t for k in ["giáo viên", "giảng viên", "tutor", "dạy", "trợ giảng"]))
            design_count = sum(1 for t in job_titles if any(k in t for k in ["thiết kế", "design", "ui", "ux", "photoshop", "illustrator", "video", "editor"]))
            
            counts = {
                "Công nghệ thông tin": it_count,
                "Kinh doanh / Marketing": mkt_count,
                "Kế toán / Kiểm toán": acc_count,
                "Hành chính / Nhân sự": hr_count,
                "Ngôn ngữ": lang_count,
                "Giáo dục / Đào tạo": edu_count,
                "Thiết kế đồ họa": design_count
            }
            max_industry, max_val = max(counts.items(), key=lambda x: x[1])
            if max_val > 0:
                return max_industry

    # 2. Dự phòng: Phân tích dựa trên tên công ty nếu không có jobs hoặc không phân tích được từ jobs
    name_lower = name.lower()
    
    if any(k in name_lower for k in ["tech", "software", "công nghệ", "solutions", "system", "data", "ai", "digital", "mạng", "phần mềm"]):
        return "Công nghệ thông tin"
    if any(k in name_lower for k in ["bank", "ngân hàng", "finance", "chứng khoán", "đầu tư", "investment", "fintech", "bảo hiểm"]):
        return "Tài chính / Ngân hàng"
    if any(k in name_lower for k in ["media", "truyền thông", "quảng cáo", "marketing", "production", "entertainment", "giải trí"]):
        return "Truyền thông / Quảng cáo"
    if any(k in name_lower for k in ["edu", "giáo dục", "trường", "academy", "school", "đào tạo", "university", "english", "anh ngữ"]):
        return "Giáo dục / Đào tạo"
    if any(k in name_lower for k in ["logistic", "vận tải", "giao hàng", "shipping", "express", "kho bãi"]):
        return "Vận tải / Logistics"
    if any(k in name_lower for k in ["xây dựng", "construction", "bất động sản", "real estate", "land", "house"]):
        return "Xây dựng / Bất động sản"
    if any(k in name_lower for k in ["y tế", "bệnh viện", "hospital", "phòng khám", "clinic", "pharma", "dược", "medical"]):
        return "Y tế / Dược phẩm"
    
    # 3. Cuối cùng, chọn ngẫu nhiên các ngành phổ biến
    return random.choice([
        "Công nghệ thông tin",
        "Kinh doanh / Marketing",
        "Hành chính / Nhân sự",
        "Kế toán / Kiểm toán",
        "Ngôn ngữ",
        "Thiết kế đồ họa"
    ])


def generate_mock_data(name: str, detected_ind: str) -> dict:
    """Tạo bộ dữ liệu mock đầy đủ, chân thực cho một công ty."""
    slug = slugify(name)
    color = random.choice(LOGO_BACKGROUNDS)
    short_name = get_short_name(name)
    
    # Chọn ngẫu nhiên tỉnh thành và địa chỉ cụ thể
    prov = random.choice(list(LOCATION_POOL.keys()))
    addr = random.choice(LOCATION_POOL[prov])
    
    # Định nghĩa mô tả và tagline theo lĩnh vực
    descriptions = {
        "Công nghệ thông tin": (
            f"Thành lập với sứ mệnh tiên phong công nghệ, {name} chuyên nghiên cứu, phát triển "
            "và cung cấp hệ sinh thái giải pháp phần mềm, chuyển đổi số đột phá cho doanh nghiệp. "
            "Chúng tôi tự hào sở hữu đội ngũ kỹ sư IT tài năng, nhiệt huyết, không ngừng đổi mới "
            "để mang lại sản phẩm ưu việt, tối ưu hóa hiệu quả vận hành và kiến tạo giá trị tương lai."
        ),
        "Tài chính / Ngân hàng": (
            f"{name} là định chế tài chính uy tín, cung cấp toàn diện các dịch vụ tài chính cá nhân, "
            "quản lý tài sản, đầu tư và giải pháp tài trợ vốn doanh nghiệp vững chắc. Chúng tôi cam kết "
            "vận hành minh bạch, quản trị rủi ro thông minh và tối đa hóa lợi ích bền vững cho khách hàng và đối tác."
        ),
        "Truyền thông / Quảng cáo": (
            f"Là một trong những Creative Agency hàng đầu, {name} là ngôi nhà của những bộ óc sáng tạo, "
            "chuyên thực hiện các chiến dịch truyền thông tích hợp (IMC), định vị thương hiệu, marketing kỹ thuật số "
            "và tổ chức sự kiện chuyên nghiệp. Chúng tôi kết nối thương hiệu với người tiêu dùng bằng những câu chuyện chạm đến cảm xúc."
        ),
        "Giáo dục / Đào tạo": (
            f"Với tôn chỉ 'Học tập suốt đời', {name} kiến tạo môi trường giáo dục chuẩn quốc tế, "
            "cung cấp các chương trình đào tạo chất lượng cao, phát triển toàn diện kỹ năng mềm và kỹ năng chuyên môn "
            "cho học viên. Đội ngũ giảng viên tâm huyết luôn đồng hành cùng thế hệ trẻ chinh phục tri thức và hội nhập."
        ),
    }
    
    # Mặc định cho các ngành khác
    default_desc = (
        f"{name} tự hào là đơn vị uy tín hàng đầu trong lĩnh vực hoạt động của mình. "
        "Với triết lý kinh doanh đặt chất lượng dịch vụ và sự hài lòng của khách hàng lên hàng đầu, "
        "chúng tôi không ngừng nâng cao năng lực cốt lõi, xây dựng môi trường làm việc chuyên nghiệp, "
        "năng động và mở ra lộ trình phát triển sự nghiệp rộng mở cho người lao động."
    )
    
    desc = descriptions.get(detected_ind, default_desc)
    
    taglines = {
        "Công nghệ thông tin": "Tiên phong công nghệ – Kiến tạo tương lai xanh.",
        "Tài chính / Ngân hàng": "Điểm tựa tài chính, kiến tạo thịnh vượng bền vững.",
        "Truyền thông / Quảng cáo": "Sáng tạo không giới hạn, kết nối triệu niềm tin.",
        "Giáo dục / Đào tạo": "Khai phá tiềm năng – Nâng tầm tri thức Việt.",
    }
    tagline = taglines.get(detected_ind, "Kiến tạo giá trị cốt lõi, đồng hành cùng thành công.")
    
    # 90% Việt Nam, 10% FDI nước ngoài
    nationality = "Việt Nam" if random.random() < 0.9 else random.choice(["Nhật Bản", "Hàn Quốc", "Mỹ", "Singapore"])
    
    # Tạo JSON aboutImages
    about_imgs = json.dumps(random.choice(ABOUT_IMAGES_SAMPLES))
    
    return {
        "logo": f"https://placehold.co/200x200/{color}/ffffff?text={requests.utils.quote(short_name)}",
        "shortDescription": tagline,
        "currentJobOpening": random.randint(1, 10),
        "industry": detected_ind,
        "size": random.choice(SIZES),
        "nationality": nationality,
        "website": f"https://{slug}.com.vn" if nationality == "Việt Nam" else f"https://{slug}.com",
        "socialMedia": json.dumps({
            "facebook": f"https://facebook.com/{slug}",
            "linkedin": f"https://linkedin.com/company/{slug}",
        }),
        "address": addr,
        "shortAddress": prov,
        "description": desc,
        "banner": random.choice(BANNER_SAMPLES),
        "followers": random.randint(100, 4800),
        "aboutImages": about_imgs,
        "status": "approved", # Tự động phê duyệt để hiển thị ngay trên frontend
    }


def main():
    parser = argparse.ArgumentParser(description="Mock và cập nhật dữ liệu nâng cao cho các công ty")
    parser.add_argument("--url", default=GATEWAY_URL, help="Base URL API Gateway")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Cập nhật đè lên tất cả công ty (mặc định chỉ cập nhật những công ty đang thiếu thông tin mô tả/logo)",
    )
    args = parser.parse_args()

    # Thử lấy danh sách công ty qua API Gateway admin (để lấy cả những công ty pending/rejected)
    admin_url = f"{args.url}/companies/admin"
    print(f"[*] Đang tải danh sách công ty từ: {admin_url} ...")
    
    try:
        resp = requests.get(admin_url, params={"page": 1, "limit": 1000}, timeout=15)
        resp.raise_for_status()
        data_body = resp.json()
    except Exception as e:
        print(f"[ERROR] Không thể lấy danh sách công ty từ API. Vui lòng kiểm tra backend và API Gateway có đang chạy không.")
        print(f"Chi tiết lỗi: {e}")
        sys.exit(1)
        
    companies = data_body.get("data", [])
    if not companies:
        print("[!] Không tìm thấy công ty nào trong database.")
        sys.exit(0)
        
    print(f"[+] Tìm thấy tổng cộng {len(companies)} công ty trong database.")
    
    success_count = 0
    skipped_count = 0
    error_count = 0
    
    for c in companies:
        c_id = c.get("id")
        name = c.get("name", "")
        
        if not c_id or not name:
            continue
            
        # Kiểm tra xem công ty có bị coi là thiếu thông tin không
        # Thiếu thông tin khi description hoặc logo trống, hoặc chứa placeholder text của placehold.co cũ
        is_empty = (
            not c.get("description") or 
            not c.get("logo") or 
            "placehold.co" in str(c.get("logo", "")) or
            len(str(c.get("description", ""))) < 30
        )
        
        if not is_empty and not args.force:
            print(f"[-] Bỏ qua '{name}' (ID: {c_id}) - Đã có thông tin đầy đủ. Dùng '--force' để cập nhật lại.")
            skipped_count += 1
            continue
            
        # Lấy thông tin chi tiết (bao gồm cả danh sách công việc - jobs) để hỗ trợ phân tích ngành nghề tốt hơn
        detail_url = f"{args.url}/companies/{c_id}"
        jobs = []
        try:
            detail_resp = requests.get(detail_url, timeout=10)
            if detail_resp.status_code == 200:
                detail_data = detail_resp.json()
                jobs = detail_data.get("jobs", [])
                if jobs:
                    print(f"    -> Tìm thấy {len(jobs)} công việc của công ty để phân tích ngành nghề.")
        except Exception as e:
            print(f"    -> [!] Cảnh báo: Không thể lấy danh sách công việc của công ty: {e}")

        # Tiến hành tạo dữ liệu mock và cập nhật
        print(f"[*] Đang mock dữ liệu cho: '{name}' (ID: {c_id}) ...")
        detected_ind = detect_industry(name, jobs)
        payload = generate_mock_data(name, detected_ind)
        
        # Gọi PUT /companies/:id để lưu lại thông tin mới
        update_url = f"{args.url}/companies/{c_id}"
        try:
            put_resp = requests.put(update_url, json=payload, timeout=10)
            if put_resp.status_code in (200, 201):
                print(f"    -> ✅ Cập nhật thành công! Ngành: {detected_ind}, Thành phố: {payload['shortAddress']}")
                success_count += 1
            else:
                print(f"    -> ❌ Thất bại (HTTP {put_resp.status_code}): {put_resp.text[:100]}")
                error_count += 1
        except Exception as e:
            print(f"    -> ❌ Lỗi kết nối khi cập nhật: {e}")
            error_count += 1

    print("\n" + "="*50)
    print(f"🎉 HOÀN THÀNH MOCK DỮ LIỆU CÔNG TY!")
    print(f"   - Cập nhật thành công: {success_count} công ty")
    print(f"   - Bỏ qua (đã có thông tin): {skipped_count} công ty")
    print(f"   - Thất bại: {error_count} công ty")
    print("="*50)

if __name__ == "__main__":
    main()
