# AI Search Service

Advanced AI-powered search and recommendation engine for the job platform using local embedding models.

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[QUICK_START.md](./QUICK_START.md)** | ⚡ Get up and running in 5 minutes |
| **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** | 🧪 Complete testing procedures with real API calls |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | 🔧 Fix common issues and errors |
| **[EMBEDDING_SETUP.md](../../../EMBEDDING_SETUP.md)** | 🤖 Embedding model configuration options |

## Features

- **Vector Search**: Semantic search using embeddings for job matching
- **Hybrid Recommendations**: Combines content-based and collaborative filtering
- **Advanced Filters**: Traditional filters (location, salary, industry) + semantic search
- **Company Reputation**: Boosts recommendations from trusted companies
- **Popularity Ranking**: Trending jobs get higher visibility
- **Local Embeddings**: Self-hosted Transformers.js models (no API calls needed)

---

## 🚀 Quick Start

### Option 1: Local Development (Recommended for Testing)

```bash
cd be/src/services/ai-search-service

# Linux / macOS
chmod +x setup-embedding.sh
./setup-embedding.sh

# Windows
setup-embedding.bat
```

> 📖 **For detailed setup instructions**, see [QUICK_START.md](./QUICK_START.md)

### Option 2: Docker (Production Ready)

```bash
# From project root
docker-compose up -d ai-search-service
docker-compose logs -f ai-search-service  # Watch model download
```

> First startup takes ~3-5 minutes (one-time model download). Subsequent starts use cached model (~2s).

---

## 🧪 Testing

Test real API calls without mocks:

```bash
# Create and index a job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Java Developer",
    "description": "Senior Java backend engineer with Spring Boot experience",
    "location": "Ho Chi Minh City",
    "salary_min": 2000,
    "salary_max": 4000
  }'

# Advanced semantic search
curl -X POST http://localhost:3000/api/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Java backend developer with Spring Boot"
  }'

# Get recommendations
curl -X POST http://localhost:3000/api/jobs/1/recommend \
  -H "Content-Type: application/json" \
  -d '{"userId": 5, "topK": 5}'
```

> 📖 **For complete testing guide**, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## Architecture

```
┌─ Embedding Service ─────────────────────────┐
│ - Generate embeddings from job text        │
│ - Serialize/deserialize for storage        │
│ - Compute cosine similarity                │
└────────────────────────────────────────────┘

┌─ Search Service ────────────────────────────┐
│ - Build filtered SQL queries               │
│ - Score candidates by similarity           │
│ - Rank by combined metrics                 │
└────────────────────────────────────────────┘

┌─ Recommendation Service ────────────────────┐
│ - Content-based: job embedding similarity │
│ - Collaborative: user interaction patterns│
│ - Popularity: trending / popular jobs    │
│ - Company reputation: trust boost         │
└────────────────────────────────────────────┘
```

## RabbitMQ Message Patterns

### Indexing

- **`ai_search_index_job`**: Generate embedding for a single job
  ```json
  {
    "jobId": 1,
    "title": "Software Engineer",
    "description": "...",
    "industry": "Technology",
    "tags": "Java, Spring Boot"
  }
  ```

- **`ai_search_index_batch`**: Batch index multiple jobs
  ```json
  {
    "jobs": [{ id: 1, title: "...", ... }, ...]
  }
  ```

### Search

- **`ai_search_advanced_search`**: Semantic search with filters
  ```json
  {
    "query": "Java backend developer",
    "location": "Ho Chi Minh",
    "salaryMin": 20000000,
    "industry": "Technology",
    "page": 1,
    "limit": 20
  }
  ```

### Recommendations

- **`ai_search_recommend_for_user`**: Get recommendations for a user
  ```json
  {
    "userId": 1,
    "topK": 5,
    "weights": {
      "contentSim": 0.4,
      "collaborative": 0.3,
      "popularity": 0.2,
      "companyBoost": 0.1
    }
  }
  ```

## Setup

### Quick Setup

See [QUICK_START.md](./QUICK_START.md) for:
- Local development setup with auto model download
- Docker setup with persistent model caching
- Verification steps

### Manual Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (create `.env`):
   ```env
   EMBEDDING_MODEL_NAME=Xenova/multilingual-e5-small
   EMBEDDING_DIMENSION=1024
   HF_HOME=/cache/huggingface
   
   RABBITMQ_URL=amqp://rabbitmq:5672
   DB_HOST=postgres
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_NAME=nckh_db
   
   PORT=8005
   ```

3. **Build**:
   ```bash
   npm run build
   ```

4. **Run**:
   ```bash
   npm start          # Production
   npm run start:dev  # Development with watch
   ```

## Embedding Models

### Recommended: Local Models (Transformers.js)

**Model**: `Xenova/multilingual-e5-small`
- **Dimensions**: 1024
- **Size**: 1.5GB
- **Languages**: 100+ (Vietnamese, English, Chinese, etc.)
- **Speed**: 50-150ms per embedding (cached)
- **Cost**: Free (local inference, no API calls)
- **Deployment**: Docker volume for persistence

> ✅ **This is the recommended approach for production**

**Other available models**:
- `Xenova/multilingual-e5-base` (768 dims, 400MB, faster)
- `Xenova/multilingual-e5-small` (384 dims, 100MB, fastest)

### Alternative Options

See [EMBEDDING_SETUP.md](../../../EMBEDDING_SETUP.md) for:
- OpenAI API embeddings
- Hugging Face Inference API
- Other self-hosted options

## Integration with Job Service

The AI Search service queries the job-service database and works in conjunction with:

- **Job Service**: Stores jobs, embeddings, and interaction metrics
- **Interaction Tracking Service**: Records user clicks, views, applies
- **Company Service**: Provides reputation metrics

## Vector Storage

### Current: pgvector in PostgreSQL

Embeddings stored and indexed using pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX idx_job_embedding ON jobs 
  USING ivfflat (embedding vector_cosine_ops);
```

### Future Scalability

- **Redis Vector**: For caching + fast retrieval
- **Milvus**: Dedicated vector DB for large scale
- **Pinecone**: Managed vector database

## Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Model load | ~2-3s | One-time, then cached |
| Generate embedding | 50-150ms | Uses cached model |
| Semantic search | 200-500ms | Includes DB query |
| Get recommendations | 300-800ms | Includes scoring |
| Batch index 100 jobs | 10-20s | Non-blocking |

## Troubleshooting

Having issues? See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for:
- Model loading errors
- Out of memory issues
- RabbitMQ connection problems
- Database errors
- Performance optimization

## Testing

```bash
# Unit tests
npm test

# See TESTING_GUIDE.md for integration testing with real API calls

# Load testing
npm run test:load
```

## Monitoring

Metrics to track:
- Indexing latency & queue depth
- Search query latency (p50, p95, p99)
- Recommendation accuracy (precision@k, NDCG)
- Cache hit rate
- Error rate by message pattern

## Future Enhancements

- [ ] Implement A/B testing for recommendation weights
- [ ] Add user feedback loop (implicit signals: clicks, dwell time)
- [ ] Implement real-time embedding updates
- [ ] Add cold-start handling for new users/jobs
- [ ] Support fuzzy matching for typos
- [ ] Multi-language support with language detection
- [ ] Personalized ranking based on user career goals
