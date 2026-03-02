"""
Script tạo tài khoản mặc định (admin, company, student) qua API Gateway.

Cách dùng:
    python seed_accounts.py
    python seed_accounts.py --url http://localhost:8080
"""
import argparse
import requests

GATEWAY_URL = "http://localhost:8080"

DEFAULT_ACCOUNTS = [
    {
        "email": "admin@tdmu.edu.vn",
        "password": "Admin@123456",
        "role": "admin",
        "name": "Quản trị viên",
    },
    {
        "email": "company@tdmu.edu.vn",
        "password": "Company@123456",
        "role": "company",
        "name": "Công ty Demo",
    },
    {
        "email": "student@tdmu.edu.vn",
        "password": "Student@123456",
        "role": "student",
        "name": "Sinh viên Demo",
    },
]


def seed_accounts(url: str):
    register_url = f"{url}/auth/register"
    for acc in DEFAULT_ACCOUNTS:
        print(f"[seed] Tạo tài khoản {acc['role']}: {acc['email']} ...", end=" ")
        try:
            resp = requests.post(register_url, json=acc, timeout=10)
            if resp.status_code in (200, 201):
                print("OK")
            elif resp.status_code == 400:
                body = resp.json()
                # Email đã tồn tại – bỏ qua
                print(f"BỎ QUA – {body.get('message', 'Email đã tồn tại')}")
            else:
                print(f"LỖI {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"LỖI: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed tài khoản mặc định vào API Gateway")
    parser.add_argument("--url", default=GATEWAY_URL, help="Base URL của API Gateway")
    args = parser.parse_args()
    seed_accounts(args.url)
    print("\n[seed] Xong! Danh sách tài khoản:")
    for acc in DEFAULT_ACCOUNTS:
        print(f"  - {acc['role']:10s}  {acc['email']}  /  {acc['password']}")
