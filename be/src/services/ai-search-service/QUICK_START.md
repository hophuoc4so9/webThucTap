# AI Search Service - Quick Start Guide

## 🎯 Nhanh chóng bắt đầu

### Option 1: Local Development (Recommended for Testing)

**Prerequisites:**
- Node.js 18+ ✓
- npm 9+ ✓
- RAM: 4GB+ (khuyến nghị 8GB)

**Steps:**

```bash
cd be/src/services/ai-search-service

# Linux / macOS
chmod +x setup-embedding.sh
./setup-embedding.sh

# Windows
setup-embedding.bat
```

**What this does:**
1. ✅ Installs `@xenova/transformers` package
2. ✅ Downloads `Xenova/multilingual-e5-small` model (~1.5GB)
3. ✅ Caches model at `~/.cache/huggingface/hub/`
4. ✅ Tests model to verify it works

**Output example:**
```
✅ Model downloaded successfully!
✅ Model is working!
   Embedding dimension: 1024
   First 5 values: [ 0.023, -0.015, 0.042, -0.008, 0.031 ]
```

**Run the service:**
```bash
# Development mode
npm run start:dev

# Production
npm start
```

---

### Option 2: Docker (Production Ready)

**Prerequisites:**
- Docker ✓
- Docker Compose ✓
- 2GB+ available disk space

**Setup:**

```bash
# From project root
docker-compose up -d ai-search-service

# Watch logs (model download happens here)
docker-compose logs -f ai-search-service
```

**First startup:**
- Model automatically downloads during container startup
- Takes ~3-5 minutes (one-time)
- Model cached in Docker volume: `huggingface-model-cache`
- Subsequent starts: <2s (uses cached model)

**Check container status:**
```bash
docker-compose ps
docker-compose logs ai-search-service
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` in `be/src/services/ai-search-service/`:

```env
# Embedding Configuration
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL_NAME=Xenova/multilingual-e5-small
EMBEDDING_DIMENSION=1024

# Cache location (optional, defaults to ~/.cache)
HF_HOME=/path/to/cache

# RabbitMQ
RABBITMQ_URL=amqp://rabbitmq:5672
RABBITMQ_QUEUE=ai_search_queue

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nckh_db

# Service Port
PORT=8005
```

### Available Models

| Model | Dims | Size | Speed | Multi-lang | Use Case |
|-------|------|------|-------|-----------|----------|
| `multilingual-e5-large` | 1024 | 1.5GB | 150ms | ✅ Yes | **Recommended** - Best quality |
| `multilingual-e5-base` | 768 | 400MB | 50ms | ✅ Yes | Good balance |
| `multilingual-e5-small` | 384 | 100MB | 30ms | ✅ Yes | Fast, low memory |

---

## 🧪 Testing

### 1. Test Embedding Generation

```bash
# Connect to service
npm run start:dev

# In another terminal, send test request via RabbitMQ or direct:
curl -X POST http://localhost:3000/api/test/embedding \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Tìm việc kỹ sư phần mềm tại HCM"
  }'
```

### 2. Test Search Endpoint

```bash
curl -X POST http://localhost:3000/api/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Java backend developer",
    "location": "Ho Chi Minh City",
    "salary_min": 1000,
    "salary_max": 5000
  }'
```

### 3. Test Recommendations

```bash
curl -X POST http://localhost:3000/api/jobs/1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 5,
    "topK": 5
  }'
```

---

## 📊 Performance Benchmarks

| Operation | First Run | Cached | Notes |
|-----------|-----------|--------|-------|
| Model load | ~2-3s | - | One-time only |
| Generate embedding | 150-200ms | 50-100ms | Per job description |
| Search query | 200-500ms | 100-200ms | Includes DB query |
| Recommend | 300-800ms | 100-300ms | Includes collaborative calc |
| Batch index (100 jobs) | 15-20s | 5-10s | Non-blocking, async |

---

## 🐛 Troubleshooting

### Model won't download

**Problem:** "Cannot find Xenova/multilingual-e5-small"

**Solution:**
```bash
# Check internet connection
ping huggingface.co

# Manually set cache directory
export HF_HOME=/custom/path
npm run start:dev

# Check available space
df -h  # Linux/macOS
wmic logicaldisk get name,freespace  # Windows
```

### Out of memory error

**Problem:** "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed"

**Solution:**
```bash
# Increase Node memory limit
node --max-old-space-size=4096 node_modules/.bin/nest start:dev

# Or use smaller model
EMBEDDING_MODEL_NAME=Xenova/multilingual-e5-small npm start
```

### Docker container won't start

**Problem:** "Failed to download model"

**Solution:**
```bash
# Check volume
docker volume ls | grep huggingface

# Rebuild without cache
docker-compose down -v
docker-compose build --no-cache ai-search-service
docker-compose up ai-search-service

# Check logs
docker-compose logs -f ai-search-service
```

### Slow search results

**Problem:** Search takes >1 second

**Solutions:**
1. Check if model is cached (first embedding is slower)
2. Add database index: `CREATE INDEX idx_job_embedding ON jobs USING ivfflat (embedding)`
3. Use smaller model: `Xenova/multilingual-e5-small`
4. Increase `ONNX_NUM_THREADS` environment variable

---

## 📁 File Structure

```
ai-search-service/
├── setup-embedding.sh          # Linux/macOS setup script
├── setup-embedding.bat         # Windows setup script
├── .env                        # Configuration (create this)
├── Dockerfile                  # Production container
├── main.ts                     # Service entry point
├── package.json               # Dependencies
├── services/
│   ├── embedding.service.ts   # Model loading & inference
│   ├── search.service.ts      # Semantic search
│   └── recommendation.service.ts # Hybrid recommendations
├── controllers/
│   └── ai-search.controller.ts # RabbitMQ message handlers
└── modules/
    └── ai-search.module.ts    # Service configuration
```

---

## 🚀 Deployment Checklist

Before going to production:

- [ ] Database migration: Create pgvector extension
- [ ] Set `NODE_ENV=production`
- [ ] Configure persistent `HF_HOME` directory
- [ ] Set up Docker volume for model caching
- [ ] Configure RabbitMQ with durable queues
- [ ] Enable logging for monitoring
- [ ] Set up health check endpoint
- [ ] Test with production data volume
- [ ] Monitor memory usage under load
- [ ] Configure auto-restart policy

---

## 📚 Resources

- **Xenova/Transformers.js**: https://github.com/xenova/transformers.js
- **ONNX Models**: https://huggingface.co/Xenova
- **pgvector**: https://github.com/pgvector/pgvector
- **NestJS**: https://docs.nestjs.com

---

## 💬 Support

For issues or questions:
1. Check logs: `docker-compose logs -f ai-search-service`
2. Review `.env` configuration
3. Verify model is downloaded: `ls ~/.cache/huggingface/hub/`
4. Check RabbitMQ connection: `docker-compose logs -f rabbitmq`

**Happy searching! 🎉**
