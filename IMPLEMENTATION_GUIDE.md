# Job Recommendation & Advanced AI Search - Implementation Guide

## Overview

This guide describes the implementation of two major features for the job search platform:
1. **Job Recommendation System** - Hybrid filtering combining content-based and collaborative approaches
2. **Advanced AI Search** - Vector semantic search with traditional filters and company reputation ranking

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          API Gateway (Port 8082)                        │
│  New Endpoints:                                                          │
│  POST /jobs/search-advanced              (Advanced AI Search)          │
│  POST /jobs/:id/recommend                (Get Recommendations)          │
└────────────────┬─────────────────────────┬──────────────────────────────┘
                 │                         │
        ┌────────▼──────┐          ┌──────▼────────┐
        │   Job Service │          │ AI Search Svc │  (NEW)
        │   (Port 8003) │          │  (Port 8005)  │
        └────────┬──────┘          └──────┬────────┘
                 │                        │
        ┌────────▼─────────────────────────▼────┐
        │      RabbitMQ (Message Broker)        │
        │  Queues: job_queue, ai_search_queue  │
        └────────┬─────────────────────────────┘
                 │
        ┌────────▼──────────────┐
        │   postgres-job (DB)   │
        │  Tables:              │
        │  - jobs (+ embedding, │
        │    views_count, etc)  │
        │  - companies          │
        │    (+ reputation)     │
        │  - user_job_          │
        │    interactions (NEW) │
        │  - job_embedding_     │
        │    queue (NEW)        │
        └──────────────────────┘
```

## Database Changes

### New Columns on `jobs` table:
```sql
ALTER TABLE jobs ADD COLUMN embedding bytea;  -- Vector embedding storage
ALTER TABLE jobs ADD COLUMN views_count int DEFAULT 0;
ALTER TABLE jobs ADD COLUMN apply_count int DEFAULT 0;
ALTER TABLE jobs ADD COLUMN popularity_score float DEFAULT 0;
ALTER TABLE jobs ADD COLUMN indexed_at timestamp;
```

### New Columns on `companies` table:
```sql
ALTER TABLE companies ADD COLUMN rating_avg float;
ALTER TABLE companies ADD COLUMN rating_count int DEFAULT 0;
ALTER TABLE companies ADD COLUMN interns_accepted_count int DEFAULT 0;
ALTER TABLE companies ADD COLUMN reputation_score float DEFAULT 0;
```

### New Tables:

**user_job_interactions** (tracks user behavior):
```sql
CREATE TABLE user_job_interactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type ENUM('click', 'view', 'apply', 'save') NOT NULL,
  weight float DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);
CREATE INDEX ON user_job_interactions(user_id);
CREATE INDEX ON user_job_interactions(job_id);
CREATE INDEX ON user_job_interactions(created_at DESC);
```

**job_embedding_queue** (async indexing queue):
```sql
CREATE TABLE job_embedding_queue (
  id SERIAL PRIMARY KEY,
  job_id INT UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status ENUM('pending', 'processing', 'success', 'failed') DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON job_embedding_queue(status);
```

## API Endpoints

### 1. Advanced AI Search

**Endpoint**: `POST /jobs/search-advanced`

**Request**:
```json
{
  "query": "Java backend developer",
  "location": "Ho Chi Minh",
  "salaryMin": 20000000,
  "salaryMax": 50000000,
  "industry": "Technology",
  "src": "manual",
  "page": 1,
  "limit": 20,
  "topK": 10,
  "similarityThreshold": 0.5,
  "weights": {
    "contentSim": 0.4,
    "collaborative": 0.2,
    "popularity": 0.2,
    "companyBoost": 0.2
  }
}
```

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Senior Backend Engineer - Java/Spring",
      "company": "TechCorp Vietnam",
      "location": "Ho Chi Minh City",
      "salary": "30-50 triệu/tháng",
      "salaryMin": 30000000,
      "salaryMax": 50000000,
      "description": "...",
      "industry": "Information Technology",
      "similarityScore": 0.87,
      "combinedScore": 0.825,
      "reason": "content_match"
    },
    {
      "id": 2,
      "title": "Backend Developer (Java Spring Boot)",
      "company": "StartupXYZ",
      "location": "Ho Chi Minh City",
      "salary": "25-40 triệu/tháng",
      "salaryMin": 25000000,
      "salaryMax": 40000000,
      "similarityScore": 0.81,
      "combinedScore": 0.78,
      "reason": "content_match"
    }
  ],
  "total": 245,
  "page": 1,
  "limit": 20,
  "executionTimeMs": 342
}
```

### 2. Get Job Recommendations

**Endpoint**: `POST /jobs/:id/recommend`

**Request**:
```json
{
  "userId": 42,
  "topK": 5,
  "weights": {
    "contentSim": 0.4,
    "collaborative": 0.3,
    "popularity": 0.2,
    "companyBoost": 0.1
  }
}
```

**Alternative**: Get recommendations based on CV instead of user ID:
```json
{
  "cvId": 15,
  "topK": 5
}
```

**Response**:
```json
{
  "data": [
    {
      "id": 5,
      "title": "Frontend Developer React",
      "company": "Digital Agency Pro",
      "location": "Da Nang",
      "salary": "18-28 triệu/tháng",
      "salaryMin": 18000000,
      "salaryMax": 28000000,
      "industry": "Technology",
      "companyRating": 4.5,
      "score": 0.89,
      "reason": "similar_role",
      "matchDetails": {
        "contentMatch": 0.85,
        "collaborativeMatch": 0.88,
        "popularityBoost": 0.75,
        "companyReputation": 0.9
      }
    },
    {
      "id": 8,
      "title": "Full-stack Developer",
      "company": "WebDev Studio",
      "location": "Da Nang",
      "score": 0.82,
      "reason": "similar_users_applied"
    }
  ],
  "executionTimeMs": 156,
  "explanation": "Found 5 recommendations. Top pick: Frontend Developer React (similar_role) – matches your experience"
}
```

## RabbitMQ Message Patterns

### Job Service Messages

**Pattern**: `job_create`
- Triggers embedding generation
- Enqueues job to AI Search service

**Pattern**: `job_update`
- Reindexes job with updated content

**Pattern**: `job_seed`
- Batch creates jobs
- Enqueues all for batch embedding (fire-and-forget)

### AI Search Service Messages

**Pattern**: `ai_search_index_job`
```json
{
  "jobId": 1,
  "title": "Senior Engineer",
  "description": "...",
  "requirement": "...",
  "tags": "Java,Spring,Kubernetes",
  "industry": "Technology"
}
```

**Pattern**: `ai_search_index_batch`
```json
{
  "jobs": [
    { "jobId": 1, "title": "...", ... },
    { "jobId": 2, "title": "...", ... }
  ]
}
```

**Pattern**: `ai_search_advanced_search`
- Receives SearchQueryDto
- Returns AdvancedSearchResponseDto

**Pattern**: `ai_search_recommend_for_user`
- Receives RecommendationQueryDto
- Returns RecommendationResponseDto

## Workflow: Interaction Tracking

When user performs action on a job:

```
User clicks job details
    ↓
API Gateway records: POST /api/interactions (user_id, job_id, "view")
    ↓
Job Service InteractionTrackingService:
  1. Insert into user_job_interactions (type="view", weight=1.0)
  2. Increment jobs.views_count
  3. Recalculate jobs.popularity_score
  4. Check if should reindex (enqueue to ai_search if significant change)
    ↓
[Async] AI Search Service processes embedding queue:
  1. Fetch pending jobs from queue
  2. Generate embeddings
  3. Store in jobs.embedding column
  4. Mark as SUCCESS or FAILED
```

## Workflow: Recommendation Generation

When user views job details and requests recommendations:

```
Frontend: GET /jobs/:id/recommend?userId=42
    ↓
API Gateway: POST /jobs/:id/recommend { userId: 42, topK: 5 }
    ↓
AI Search Service RecommendationService.recommendForUser():
  1. Fetch user's interaction history (apply > view > click)
  2. Build user embedding from weighted aggregate of their job history
  3. Content-based: Find similar jobs using cosine similarity to user embedding
  4. Collaborative: Find jobs applied by users with similar patterns
  5. Score each candidate:
     score = w1*content_sim + w2*collaborative + w3*popularity + w4*company_boost
  6. Sort by combined score, return top-K
    ↓
Response: Array of recommended jobs with scoring breakdown
```

## Workflow: Advanced Search

```
Frontend: Advanced search form with query + filters
    ↓
API Gateway: POST /jobs/search-advanced
  {
    "query": "Python backend developer",
    "location": "Ho Chi Minh",
    "industry": "Technology",
    ...
  }
    ↓
AI Search Service SearchService.search():
  1. Generate embedding for user's natural language query
  2. Build SQL query with traditional filters (location, salary, industry)
  3. Fetch all matching candidates from database
  4. For each candidate:
     a. Deserialize their embedding
     b. Compute cosine similarity to query embedding
     c. Normalize popularity score
     d. Get company reputation
     e. Combine: score = w1*sim + w2*popularity + w3*company_rep
  5. Sort by combined score
  6. Apply pagination (skip, limit)
    ↓
Response: Ranked list with semantic matching + traditional filters
```

## Embedding Model Configuration

### Current: Mock Embeddings (Demo)
- Deterministic hash-based generation
- Dimension: 384
- Zero latency (for development)

### Production Options:

**Option 1: OpenAI API (Recommended for reliability)**
```env
EMBEDDING_MODEL=openai
OPENAI_API_KEY=sk-...
# Uses text-embedding-3-small (lightweight, 1536 dim) or -large (3072 dim)
```

**Option 2: Hugging Face (Free, multilingual)**
```env
EMBEDDING_MODEL=hugging-face
HUGGING_FACE_API_KEY=hf_...
# Model: Xenova/multilingual-e5-small-zh (supports Vietnamese)
```

**Option 3: Local Model (Self-hosted)**
```bash
npm install @xenova/transformers onnxruntime-web
# Inference in Node.js using ONNX Runtime
```

## Performance Considerations

### Caching
- Redis caches top-K recommendations per user (TTL: 1 hour)
- Search results cached by query hash (TTL: 30 minutes)
- Invalidate on job update or metrics change

### Indexing
- Batch embeddings in chunks of 50 jobs
- Run background worker to process pending queue (every 5 minutes)
- Max 3 retry attempts per job

### Query Optimization
- Index on `jobs.embedding IS NOT NULL` to filter indexed jobs
- Index on `user_job_interactions(user_id, created_at DESC)` for efficient history fetch
- Pre-filter with traditional filters before similarity search (reduces candidates)

### Pagination
- Default limit=20, max limit=100
- Offset/limit strategy (no cursor needed for small datasets)

## Testing

### Unit Tests (Embedding similarity, scoring logic)
```bash
cd be/src/services/ai-search-service
npm test
```

### Integration Tests (Full workflow with real DB)
```bash
# Start services
docker-compose up -d

# Run tests
npm run test:e2e
```

### Manual Testing

1. **Index a job**:
```bash
curl -X POST http://localhost:8082/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{"query": "Java developer", "location": "HCMC", "limit": 10}'
```

2. **Get recommendations**:
```bash
curl -X POST http://localhost:8082/jobs/1/recommend \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "topK": 5}'
```

## Future Enhancements

- [ ] Real-time embedding updates via WebSocket
- [ ] A/B testing framework for weight tuning
- [ ] User feedback loop (implicit signals: dwell time, bookmark rate)
- [ ] Cold-start solution: recommend trending jobs for new users
- [ ] Multi-language support with language detection
- [ ] Career path recommendations (e.g., suggest jobs for growth trajectory)
- [ ] Company-to-company similarity (find similar companies)
- [ ] Personalized ranking by user role/level
- [ ] Re-ranking using LLM (small proprietary model) for explainability
- [ ] Vector indexing with pgvector for sub-second searches (for scale)

## Troubleshooting

### Jobs not getting embedded
- Check if AI Search service is running: `docker logs ai-search-service`
- Check RabbitMQ queue depth: `http://rabbitmq:15672` (admin:admin)
- Verify job has non-null title/description
- Check job_embedding_queue table for failed jobs

### Recommendation scores too low
- Check if user has interaction history
- Verify job embeddings exist (`jobs.embedding IS NOT NULL`)
- Review weight configuration (should sum to ~1.0)
- Check company reputation calculation

### Search latency high
- Check Redis cache hit rate
- Run database query analysis: `EXPLAIN ANALYZE SELECT ...`
- Consider adding pgvector extension for faster vector search
- Reduce topK or similarity_threshold for faster queries

## Monitoring Metrics

```
metrics:
  - ai_search.embedding_queue_depth (pending jobs)
  - ai_search.search_latency_p50/p95/p99
  - ai_search.recommendation_latency
  - ai_search.cache_hit_rate
  - ai_search.failed_embeddings_count
  - job_service.interaction_tracking_rate
```

---

**Implementation Completed**: May 2026
**Status**: Ready for testing and integration
