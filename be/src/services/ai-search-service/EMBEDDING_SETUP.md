# 🚀 Cấu Hình Embedding Model Local - Hướng Dẫn Chi Tiết

## 📋 Tóm Tắt

Bạn có **3 lựa chọn** cho embedding:

| Option | Tốc độ | Chi phí | Yêu cầu | Khuyến nghị |
|--------|--------|--------|--------|------------|
| **Local (Model tải về)** | ⚡ 50-100ms | Free | Disk 2GB | ✅ **Được khuyên cho Dev & Prod** |
| **Hugging Face API** | 🔸 500-1000ms | Free (nhưng giới hạn) | API Key | Testing, không dùng nhiều |
| **Mock (Placeholder)** | ⚡ Instant | Free | Không | Dev ban đầu, không chính xác |

---

## ✅ Option 1: LOCAL EMBEDDING (Recommended)

### Bước 1: Cấu hình .env

```env
EMBEDDING_PROVIDER=local
```

**Đó là tất cả!** Không cần API key hay cấu hình phức tạp.

### Bước 2: Cài dependency

```bash
cd be/src/services/ai-search-service
npm install
```

Lần chạy đầu tiên sẽ **tự động tải model từ Hugging Face** (~1.5GB):

```
✓ Initializing embedding provider: local
⚠  First run will download model (~1.5GB). This may take 5-10 minutes.
[Worker] Downloading model files...
[Worker] Loading model artifacts...
✓ Model loaded successfully
```

### Bước 3: Kiểm tra vị trí cache model

Model được lưu tại:
```bash
# Linux/Mac:
~/.cache/huggingface/hub/models--Xenova--multilingual-e5-large/

# Windows:
%USERPROFILE%\.cache\huggingface\hub\models--Xenova--multilingual-e5-large\

# Docker container:
/root/.cache/huggingface/hub/
```

### Bước 4: Tối ưu cho Production

#### A. Pre-cache model vào Docker image

Thêm vào `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Download model during build (not at runtime)
RUN node -e "require('@xenova/transformers').pipeline('feature-extraction', 'Xenova/multilingual-e5-small')"

FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy cached model from builder
COPY --from=builder /root/.cache /root/.cache

COPY --from=builder /app/dist /app/dist

EXPOSE 8005

CMD ["node", "dist/main.js"]
```

**Lợi ích**:
- ✅ Không cần tải model khi container start
- ✅ Startup time: từ 5-10 phút xuống 10 giây
- ✅ Không cần internet sau khi build

#### B. Hoặc mount cache volume (nếu dùng docker-compose)

```yaml
ai-search-service:
  build:
    context: ./be/src/services/ai-search-service
    dockerfile: Dockerfile
  expose: ["8005"]
  volumes:
    - huggingface-cache:/root/.cache/huggingface
  environment:
    EMBEDDING_PROVIDER: local
    
volumes:
  huggingface-cache:
```

### Bước 5: Kiểm tra hoạt động

```bash
# Docker logs
docker logs ai-search-service

# Nếu thấy:
# ✓ Model loaded successfully
# Thì OK!
```

---

## 🔌 Option 2: HUGGING FACE API

Nếu bạn muốn dùng Hugging Face API thay vì local:

### Bước 1: Lấy API Key

1. Đi tới https://huggingface.co/settings/tokens
2. Tạo token mới (chọn "Read" role)
3. Copy token

### Bước 2: Cấu hình .env

```env
EMBEDDING_PROVIDER=huggingface-api
HUGGING_FACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Bước 3: Kiểm tra

```bash
npm start:dev
```

**Lưu ý**:
- ⚠️ Yêu cầu internet lúc chạy
- ⚠️ Chậm hơn local (500-1000ms/request)
- ⚠️ Free tier có limit requests

---

## 🧪 Testing & Validation

### Test local embedding

```bash
# SSH vào container
docker exec -it ai-search-service sh

# Chạy test script
node -e "
const { pipeline } = require('@xenova/transformers');
(async () => {
  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
  const result = await extractor('Kỹ sư phần mềm Java', { pooling: 'mean', normalize: true });
  console.log('✓ Embedding generated:', result.data.slice(0, 5), '...');
})();
"
```

Kết quả mong đợi:
```
✓ Embedding generated: [-0.1234, 0.5678, -0.9012, 0.3456, -0.7890] ...
```

### Test search endpoint

```bash
curl -X POST http://localhost:8082/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Java backend developer",
    "location": "Ho Chi Minh",
    "limit": 10
  }'
```

Nếu thấy results với `similarityScore` → embedding đang hoạt động ✅

### Test recommendations

```bash
curl -X POST http://localhost:8082/jobs/1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "topK": 5
  }'
```

---

## 🛠️ Troubleshooting

### ❌ "Model not loading" / "Cannot find @xenova/transformers"

```bash
# Trong container:
npm install @xenova/transformers

# Hoặc rebuild image:
docker-compose up --build ai-search-service
```

### ❌ "Embedding dimension mismatch"

- Local model: 384 dimensions ✅
- Nếu bạn thay model, update `EMBEDDING_DIMENSION` trong code

### ❌ "Out of memory" khi generate embedding

- Local model dùng ~2-3GB RAM
- Nếu container bị killed, tăng memory limit:

```yaml
# docker-compose.yml
ai-search-service:
  # ...
  mem_limit: 4g
  memswap_limit: 4g
```

### ❌ Model download rất chậm

- Thường là vì bandwidth hạn chế
- Giải pháp: Pre-download trên máy khác, rồi mount volume

```bash
# Trên máy với internet nhanh:
node -e "require('@xenova/transformers').pipeline(...)"

# Sau đó copy folder cache sang server
```

### ✅ "Cannot download model in production"

**Giải pháp**: Dùng pre-cached Docker build (xem phần A ở trên)

---

## 📊 So Sánh Performance

### Local Embedding (Recommended)

```
Startup: 5-10 phút (lần đầu), 10 giây (lần sau)
Per embedding: 50-100ms
Batch (50 jobs): 2-5 giây
Memory: 2-3GB
Cost: Free
```

### Hugging Face API

```
Startup: Instant
Per embedding: 500-1000ms
Batch (50 jobs): 25-50 giây
Memory: <500MB
Cost: Free (có giới hạn)
```

### Fallback Mock

```
Startup: Instant
Per embedding: <1ms
Batch (50 jobs): <50ms
Memory: Negligible
Cost: Free (không chính xác)
```

---

## 🎯 Khuyến Nghị cho Từng Scenario

### 🏠 Development (Máy local)

```env
EMBEDDING_PROVIDER=local
```
- Tải model lần đầu (một lần thôi)
- Sau đó chạy offline
- Tốc độ tốt, không phí tổn

### 🚀 Production (Server)

**Option A**: Pre-cached Docker (Recommended)
```dockerfile
# Build:
RUN node -e "require('@xenova/transformers').pipeline(...)"
```

**Option B**: Mount cache volume
```yaml
volumes:
  - huggingface-cache:/root/.cache/huggingface
```

### 🧪 Testing / Demo

```env
EMBEDDING_PROVIDER=mock
```
hoặc
```env
EMBEDDING_PROVIDER=huggingface-api
HUGGING_FACE_API_KEY=hf_...
```

---

## 📚 Tài liệu Tham Khảo

- **@xenova/transformers**: https://xenova.github.io/transformers.js/
- **Model**: https://huggingface.co/Xenova/multilingual-e5-small
- **Hugging Face Inference API**: https://huggingface.co/docs/hub/models-inference

---

## 🔑 Key Points

✅ **Local model** = Download 1 lần, dùng offline, nhanh, free
✅ **Hỗ trợ Vietnamese** qua multilingual-e5-large
✅ **Dễ deploy** - Pre-cache trong Docker
✅ **Không cần API key** - Không phụ thuộc service bên ngoài
✅ **Production-ready** - Được cộng đồng sử dụng rộng rãi

---

**Khuyến nghị**: Dùng **LOCAL** cho production. Setup lần đầu 5-10 phút một lần, sau đó không lo gì cả! 🎉
