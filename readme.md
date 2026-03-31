Chạy Docker Compose để khởi động RabbitMQ, Postgres, Redis, v.v.:
Tại thư mục gốc (Web_ThucTap_TDMU):
docker-compose up -d


docker compose up --build

Cần làm thêm (thiết lập thủ công)
Tạo Google OAuth App tại console.cloud.google.com:

Bật Google Identity API
Tạo OAuth 2.0 Client ID (loại Web application)
Thêm Authorized JavaScript origins: http://localhost:5173
Thêm Authorized redirect URIs: http://localhost:5173
Tạo file .env từ .env.example:

FE: .env → thay VITE_GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>
BE: be/.env → thay GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>
