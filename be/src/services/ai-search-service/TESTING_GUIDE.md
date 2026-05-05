# AI Search Service - Testing Guide

## 🧪 Hướng dẫn Test Chi Tiết

Tài liệu này hướng dẫn test thực tế các API endpoints và tính năng embedding.

---

## Part 1: Environment Setup for Testing

### 1.1 Start All Services

```bash
# From project root
docker-compose up -d

# Verify all services are running
docker-compose ps

# Expected output:
# NAME                COMMAND             STATUS
# postgres            postgres            Up (healthy)
# rabbitmq            rabbitmq_app        Up
# ai-search-service   npm start           Up
# job-service         npm start           Up
# api-gateway         npm start           Up
```

### 1.2 Check Service Logs

```bash
# Watch AI Search service logs
docker-compose logs -f ai-search-service

# Expected during startup:
# [16:32:10] LOG [NestFactory] Starting Nest application...
# [16:32:15] LOG [EmbeddingService] Loading Xenova/multilingual-e5-small model...
# [16:32:45] LOG [EmbeddingService] Model loaded successfully in 30s
# [16:32:45] LOG [MicroserviceServer] Listening at amqp://rabbitmq:5672 
```

### 1.3 Wait for Readiness

Model loading takes 30-45 seconds on first run. Watch logs until you see:
```
✅ EmbeddingService initialized
✅ RabbitMQ connected to ai_search_queue
✅ Service ready for indexing
```

---

## Part 2: Testing Embedding Service

### 2.1 Direct Embedding Generation

**Test Case 1: Single Vietnamese Text**

```bash
# Send POST request to API Gateway
curl -X POST http://localhost:3000/api/test/embedding \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Công ty Acme tuyển Kỹ sư phần mềm Python với lương 20-30 triệu"
  }'

# Expected response:
{
  "success": true,
  "embedding": [0.0234, -0.0156, 0.0421, ..., 0.0089], // 1024 values
  "dimension": 1024,
  "processingTimeMs": 145
}
```

**Test Case 2: English Text**

```bash
curl -X POST http://localhost:3000/api/test/embedding \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Senior Backend Engineer Java Spring Boot 8 years experience"
  }'

# Expected: 1024-dimensional embedding array
```

**Test Case 3: Mixed Language**

```bash
curl -X POST http://localhost:3000/api/test/embedding \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Tìm Java Developer với kỹ năng React and Spring Boot tại HCMC"
  }'

# Expected: Successfully generates multilingual embedding
```

**Verify Results:**
```bash
# Check similarity between embeddings
# Embedding 1: "Kỹ sư phần mềm Java" 
# Embedding 2: "Java developer engineer"
# Should have cosine similarity ~0.8+ (similar meaning)

# Formula: similarity = (embedding1 · embedding2) / (|embedding1| * |embedding2|)
```

---

## Part 3: Testing Job Indexing

### 3.1 Create Sample Job with Auto-Indexing

```bash
# Create a job (should trigger embedding generation)
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Java Developer",
    "description": "Looking for an experienced Java developer with 5+ years experience in Spring Boot and microservices architecture. Must have experience with Docker, Kubernetes, and AWS.",
    "location": "Ho Chi Minh City",
    "salary_min": 2000,
    "salary_max": 4000,
    "industry": "Technology",
    "company_id": 1,
    "job_type": "Full-time"
  }'

# Expected response:
{
  "id": 1,
  "title": "Senior Java Developer",
  "description": "...",
  "embedding": null,  // Initially null, will be populated by async service
  "indexed_at": null,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### 3.2 Monitor Embedding Queue

```bash
# Check if job was queued for embedding
curl http://localhost:3000/api/admin/embedding-queue

# Expected response:
{
  "total": 1,
  "pending": 1,
  "processing": 0,
  "completed": 0,
  "failed": 0,
  "items": [
    {
      "id": 1,
      "job_id": 1,
      "status": "PENDING",
      "retry_count": 0,
      "created_at": "2024-01-15T10:30:05Z"
    }
  ]
}

# After 5-10 seconds:
{
  "pending": 0,
  "processing": 0,
  "completed": 1,
  "failed": 0
}
```

### 3.3 Verify Job Now Has Embedding

```bash
# Fetch job details
curl http://localhost:3000/api/jobs/1

# Expected response shows embedding is now populated:
{
  "id": 1,
  "title": "Senior Java Developer",
  "description": "...",
  "embedding": [0.0234, -0.0156, 0.0421, ...], // 1024 values
  "indexed_at": "2024-01-15T10:30:10Z"
}
```

### 3.4 Batch Index Multiple Jobs

```bash
# Seed multiple jobs at once
curl -X POST http://localhost:3000/api/jobs/seed \
  -H "Content-Type: application/json" \
  -d '{
    "jobs": [
      {
        "title": "Frontend React Developer",
        "description": "Expert in React, TypeScript, Tailwind CSS with 5+ years web development",
        "location": "Ha Noi",
        "salary_min": 1500,
        "salary_max": 3000,
        "company_id": 2
      },
      {
        "title": "DevOps Engineer",
        "description": "Kubernetes, Docker, CI/CD pipelines, AWS, Terraform expertise required",
        "location": "Da Nang",
        "salary_min": 2500,
        "salary_max": 4500,
        "company_id": 3
      },
      {
        "title": "Data Scientist Python",
        "description": "Machine learning, data analysis, TensorFlow, PyTorch experience",
        "location": "Ho Chi Minh City",
        "salary_min": 2000,
        "salary_max": 5000,
        "company_id": 1
      }
    ]
  }'

# Expected: All jobs created and queued for embedding
# Monitor queue status as shown in 3.2
```

---

## Part 4: Testing Advanced Search

### 4.1 Simple Semantic Search

```bash
# Search for Java developers
curl -X POST http://localhost:3000/api/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Java backend developer with Spring Boot"
  }'

# Expected response:
{
  "success": true,
  "results": [
    {
      "id": 1,
      "title": "Senior Java Developer",
      "description": "...",
      "similarity_score": 0.92,
      "final_score": 0.85,
      "location": "Ho Chi Minh City",
      "salary_min": 2000,
      "salary_max": 4000
    },
    {
      "id": 5,
      "title": "Junior Java Developer",
      "description": "...",
      "similarity_score": 0.88,
      "final_score": 0.79,
      "location": "Da Nang",
      "salary_min": 1000,
      "salary_max": 2000
    }
  ],
  "processingTimeMs": 245,
  "total": 2
}
```

### 4.2 Search with Filters

```bash
# Search with location and salary filters
curl -X POST http://localhost:3000/api/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "backend developer",
    "filters": {
      "location": "Ho Chi Minh City",
      "salary_min": 2000,
      "salary_max": 5000,
      "industry": "Technology"
    },
    "top_k": 10
  }'

# Expected: Results matching both semantic similarity AND filters
# Results ranked by final_score = 0.6×similarity + 0.4×company_reputation
```

### 4.3 Search with Different Languages

```bash
# Vietnamese query
curl -X POST http://localhost:3000/api/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "tìm lập trình viên Python với kinh nghiệm machine learning"
  }'

# English query
curl -X POST http://localhost:3000/api/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "find python engineer with machine learning skills"
  }'

# Both should return similar results due to multilingual embeddings
```

### 4.4 Verify Ranking with Company Reputation

```bash
# Create companies with different reputation scores
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Tech Corp",
    "rating_avg": 4.8,
    "rating_count": 150,
    "interns_accepted_count": 50,
    "reputation_score": 0.95
  }'

# Create another company with lower reputation
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Startup LLC",
    "rating_avg": 3.5,
    "rating_count": 10,
    "interns_accepted_count": 2,
    "reputation_score": 0.45
  }'

# Create similar jobs at both companies
# Both jobs describe "Java developer" similarly

# Search should rank Premium Tech Corp job higher
curl -X POST http://localhost:3000/api/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Java developer"
  }'

# Expected: Premium Tech Corp job appears first
# final_score = 0.6×0.92 + 0.4×0.95 = 0.932
# vs
# final_score = 0.6×0.92 + 0.4×0.45 = 732
```

---

## Part 5: Testing Recommendations

### 5.1 Get Recommendations for User

```bash
# Get job recommendations for user ID 5
curl -X POST http://localhost:3000/api/jobs/1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 5,
    "topK": 5
  }'

# Expected response:
{
  "success": true,
  "recommendations": [
    {
      "id": 8,
      "title": "Backend Java Developer",
      "description": "...",
      "content_similarity": 0.87,
      "collaborative_score": 0.65,
      "popularity_score": 0.45,
      "company_reputation": 0.80,
      "final_score": 0.72,
      "reason": "Similar to jobs you viewed"
    },
    {
      "id": 12,
      "title": "Senior Java Engineer",
      "description": "...",
      "final_score": 0.68,
      "reason": "Popular with users like you"
    }
  ],
  "processingTimeMs": 350
}
```

### 5.2 Verify Hybrid Algorithm

The recommendation score uses:
- **Content similarity (40%)**: Jobs with similar embeddings to ones user viewed
- **Collaborative (30%)**: Jobs viewed by users with similar interests
- **Popularity (20%)**: Jobs with high views/applies
- **Company reputation (10%)**: Jobs from well-rated companies

```bash
# Create a test sequence:
# 1. User views job 1 (Java developer)
POST /api/jobs/1/interact (type: "view")

# 2. User applies to job 2 (Senior Java)
POST /api/jobs/2/interact (type: "apply")

# 3. Get recommendations
POST /api/jobs/1/recommend?userId=5&topK=5

# Expected: Should recommend similar Java positions, not random jobs
```

---

## Part 6: Load Testing

### 6.1 Generate Many Embeddings

```bash
# Batch create 100 jobs (tests embedding queue)
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/jobs \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Job Position $i\",
      \"description\": \"This is a test job posting number $i with various keywords and requirements\",
      \"location\": \"Ho Chi Minh City\",
      \"salary_min\": $((1000 + RANDOM % 2000)),
      \"salary_max\": $((3000 + RANDOM % 3000)),
      \"company_id\": $((1 + RANDOM % 5))
    }"
done

# Monitor embedding queue status
watch -n 5 'curl -s http://localhost:3000/api/admin/embedding-queue | jq ".pending"'

# Expected: Queue drains as embeddings are processed
# Benchmark: 100 embeddings should process in ~30-60 seconds
```

### 6.2 Measure Search Performance

```bash
# Single search
time curl -X POST http://localhost:3000/api/jobs/search-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "backend developer java"
  }'

# Expected: <500ms for single search

# Concurrent searches (10 parallel)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/jobs/search-advanced \
    -H "Content-Type: application/json" \
    -d '{"query": "backend developer"}' &
done
wait

# Expected: All complete within reasonable time
```

### 6.3 Measure Recommendation Performance

```bash
# Single recommendation request
time curl -X POST http://localhost:3000/api/jobs/1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 5,
    "topK": 10
  }'

# Expected: <800ms for first request (model + DB), <300ms for subsequent
```

---

## Part 7: Monitoring & Debugging

### 7.1 Check Service Health

```bash
# API Gateway health
curl http://localhost:3000/health

# Expected:
{
  "status": "ok",
  "services": {
    "ai-search": "connected",
    "job-service": "connected",
    "auth-service": "connected",
    "database": "connected",
    "rabbitmq": "connected"
  }
}
```

### 7.2 View RabbitMQ Queues

```bash
# Open RabbitMQ admin panel
# http://localhost:15672
# Default credentials: guest / guest

# Check ai_search_queue:
# - Messages Ready: Should be 0 (processed immediately)
# - Messages Unacked: Should be 0 (all confirmed)
# - Total: Should increase with each job creation
```

### 7.3 Database Queries

```bash
# Connect to PostgreSQL
docker exec -it postgres psql -U postgres -d nckh_db

# Check indexed jobs
SELECT id, title, indexed_at, embedding IS NOT NULL as has_embedding 
FROM jobs 
ORDER BY indexed_at DESC 
LIMIT 5;

# Check embedding queue
SELECT id, job_id, status, retry_count, error 
FROM job_embedding_queue 
WHERE status != 'COMPLETED' 
ORDER BY created_at DESC;

# Check user interactions
SELECT interaction_type, COUNT(*) as count 
FROM user_job_interactions 
GROUP BY interaction_type;
```

### 7.4 Performance Logs

```bash
# Extract timing metrics
docker-compose logs ai-search-service | grep -E "processingTime|duration"

# Expected output:
# embedding generated in 145ms
# search completed in 245ms
# recommendation calculated in 350ms
```

---

## Part 8: Troubleshooting Test Issues

### Issue 1: Embedding is null after job creation

**Symptom:**
```
Job created but embedding field remains null after 30 seconds
```

**Solution:**
```bash
# Check if RabbitMQ queue is working
docker-compose logs rabbitmq | tail -20

# Check AI Search service logs
docker-compose logs -f ai-search-service

# Manually trigger indexing
curl -X POST http://localhost:3000/api/admin/reindex-job/1

# Check if model loaded
docker-compose exec ai-search-service ps aux | grep node
```

### Issue 2: Search returns empty results

**Symptom:**
```json
{
  "results": [],
  "total": 0
}
```

**Solution:**
```bash
# Verify jobs exist in database
docker exec -it postgres psql -U postgres -d nckh_db -c "SELECT COUNT(*) FROM jobs"

# Verify jobs have embeddings
docker exec -it postgres psql -U postgres -d nckh_db -c "SELECT COUNT(*) FROM jobs WHERE embedding IS NOT NULL"

# Check if pgvector is installed
docker exec -it postgres psql -U postgres -d nckh_db -c "CREATE EXTENSION IF NOT EXISTS vector"
```

### Issue 3: Slow recommendation queries

**Symptom:**
```
Recommendation takes >2 seconds
```

**Solution:**
```bash
# Add database indexes
docker exec -it postgres psql -U postgres -d nckh_db << EOF
CREATE INDEX idx_user_interactions_user_id ON user_job_interactions(user_id);
CREATE INDEX idx_user_interactions_job_id ON user_job_interactions(job_id);
CREATE INDEX idx_job_company_id ON jobs(company_id);
ANALYZE;
EOF

# Analyze query plan
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM user_job_interactions WHERE user_id = 5;
```

---

## Summary Checklist

- [ ] All services running and healthy
- [ ] Model downloads and initializes (watch logs)
- [ ] Single embedding test passes
- [ ] Job indexing works (verify `indexed_at`)
- [ ] Search returns relevant results
- [ ] Recommendations work
- [ ] Batch indexing completes (100 jobs)
- [ ] Performance within benchmarks (<500ms search)
- [ ] Multi-language support works
- [ ] Company reputation affects ranking
- [ ] Database indexes are optimal

**All tests passing = Ready for production! 🚀**
