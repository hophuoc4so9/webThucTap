# WEB THUC TAP 

## 1) Yeu cau cai dat

- Docker Desktop
- Node.js LTS 
- Git

Kiem tra nhanh:

```bash
docker --version
docker compose version
node -v
npm -v
```

## 2) Clone va vao thu muc du an

```bash
git clone <REPO_URL>
cd webThucTap
```

Neu ban da pull code san thi bo qua buoc nay.

## 3) Tao file .env (chi dung script)

Chay 1 lenh de tao tat ca file env cho FE, BE va cac service backend.
Mac dinh script khong ghi de file env da co:

```powershell
./scripts/setup-env.ps1
```

Neu muon ghi de lai toan bo env va set Google Client ID ngay khi tao:

```powershell
./scripts/setup-env.ps1 -Force -GoogleClientId "<YOUR_CLIENT_ID>"
```

## 4) Cau hinh Google OAuth

Tao OAuth app tai console.cloud.google.com:

- Bat Google Identity API
- Tao OAuth 2.0 Client ID (Web application)
- Authorized JavaScript origins: http://localhost:5173
- Authorized redirect URIs: http://localhost:5173

Sau do cap nhat Google Client ID:

- `fe/.env`: `VITE_GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>`
- `be/.env`: `GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>`
- `be/src/services/auth-service/.env`: `GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>`

## 5) Cau hinh mail thong bao

Neu muon he thong gui mail khi co yeu cau nha tuyen dung hoac cap nhat trang thai, cap nhat them cac bien sau trong `be/.env` hoac `be/src/services/auth-service/.env`:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `ADMIN_NOTIFY_EMAIL`

Neu chua co SMTP, he thong van chay binh thuong va se ghi log mail ra console.

## 6) Chay backend + ha tang bang Docker

Tai thu muc goc du an:

```bash
docker compose up -d --build
```

Kiem tra trang thai:

```bash
docker compose ps
```

## 7) Chay frontend local

Mo terminal moi:

```bash
cd fe
npm install
npm run dev
```

Mo trinh duyet: http://localhost:5173

## 8) Lenh debug nhanh

```bash
docker compose logs -f api-gateway
docker compose logs -f auth-service
docker compose logs -f job-service
docker compose logs -f cv-service
```

## 9) Loi thuong gap

### Loi: env file ... not found

Nguyen nhan: chua tao env hoac env bi thieu do chua chay script setup.

Cach xu ly:

```powershell
./scripts/setup-env.ps1
```

Neu can reset env tu dau:

```powershell
./scripts/setup-env.ps1 -Force
```
