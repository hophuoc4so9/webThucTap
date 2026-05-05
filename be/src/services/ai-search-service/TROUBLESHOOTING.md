# Embedding Service - Comprehensive Troubleshooting Guide

## 🔧 Hướng dẫn Khắc Phục Sự Cố

Tài liệu này giải quyết các vấn đề thường gặp khi sử dụng Embedding Service.

---

## 1. Model Loading Issues

### Issue 1.1: "Model not found" Error

**Error Message:**
```
Error: Failed to load model Xenova/multilingual-e5-small
Error fetching: 404 Not Found
```

**Causes:**
- Internet connection issue
- Typo in model name
- Hugging Face API down
- HF_HOME directory permission denied

**Solutions:**

```bash
# Solution 1: Verify internet connection
ping huggingface.co
# Expected: PING huggingface.co (xxx.xxx.xxx.xxx) ...

# Solution 2: Check model name in .env
cat .env | grep EMBEDDING_MODEL_NAME
# Expected: EMBEDDING_MODEL_NAME=Xenova/multilingual-e5-small

# Solution 3: Verify HF_HOME permissions
ls -la ~/.cache/huggingface/
# If permission denied:
chmod -R 755 ~/.cache/huggingface/

# Solution 4: Clear cache and retry
rm -rf ~/.cache/huggingface/hub/models--Xenova*
npm run start:dev
# Model will re-download

# Solution 5: Use different model
export EMBEDDING_MODEL_NAME=Xenova/multilingual-e5-small
npm run start:dev
```

### Issue 1.2: Out of Memory During Model Load

**Error Message:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
JavaScript heap out of memory
```

**Causes:**
- Node.js memory limit too low
- Not enough system RAM
- Memory leak in other service
- Using large model on constrained hardware

**Solutions:**

```bash
# Solution 1: Increase Node memory limit
# Option A: Per command
node --max-old-space-size=4096 node_modules/.bin/nest start:dev

# Option B: Environment variable
export NODE_OPTIONS="--max-old-space-size=4096"
npm run start:dev

# Solution 2: Use smaller model
export EMBEDDING_MODEL_NAME=Xenova/multilingual-e5-base
npm run start:dev
# Dimensions: 768 (vs 1024)
# Memory: ~200MB (vs 400MB)

# Solution 3: Check available RAM
free -h                           # Linux/macOS
Get-PhysicalMemory                # Windows PowerShell

# Solution 4: Stop other services to free RAM
docker-compose down
npm run start:dev
```

### Issue 1.3: Model Download Stuck / Takes Too Long

**Symptom:**
```
Downloading model... (waiting 10+ minutes)
```

**Causes:**
- Slow internet connection
- Large model size
- Intermittent network issues
- Proxy/firewall blocking

**Solutions:**

```bash
# Solution 1: Check download progress
ls -lah ~/.cache/huggingface/hub/
# Look for partially downloaded files (*.incomplete)

# Solution 2: Use different download mirror (for China)
export HF_ENDPOINT=https://huggingface.co
npm run start:dev

# Solution 3: Pre-download model manually
npm install @xenova/transformers
node -e "
const { pipeline } = require('@xenova/transformers');
(async () => {
  console.log('Downloading...');
  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
  console.log('Done!');
})();
"

# Solution 4: Use cached model from Docker
docker-compose pull ai-search-service
docker-compose up -d ai-search-service
# Model already embedded in image

# Solution 5: Timeout adjustment
# Increase timeout in embedding.service.ts
// onModuleInit() timeout: 120000ms (2 minutes)
```

---

## 2. Embedding Generation Issues

### Issue 2.1: Embedding Dimension Mismatch

**Error Message:**
```
Expected embedding dimension 1024, got 384
Vector dimension mismatch in database
```

**Causes:**
- Model name changed mid-operation
- Multiple models running simultaneously
- Database schema mismatch
- Migration not applied

**Solutions:**

```bash
# Solution 1: Check current model in .env
grep EMBEDDING_DIMENSION .env

# Solution 2: Verify dimension matches model
# multilingual-e5-large: 1024
# multilingual-e5-base: 768
# multilingual-e5-small: 384

# Solution 3: Update database schema
docker exec -it postgres psql -U postgres -d nckh_db << EOF
ALTER TABLE jobs 
MODIFY COLUMN embedding vector(1024);
EOF

# Solution 4: Clear and re-index all embeddings
curl -X POST http://localhost:3000/api/admin/clear-embeddings
curl -X POST http://localhost:3000/api/admin/reindex-all

# Solution 5: Check database vector extension
docker exec -it postgres psql -U postgres -d nckh_db -c "CREATE EXTENSION IF NOT EXISTS vector"
```

### Issue 2.2: Embedding is NaN or Null

**Symptom:**
```json
{
  "embedding": [NaN, NaN, NaN, ...],
  "error": "Invalid embedding values"
}
```

**Causes:**
- Model output parsing error
- Text is empty or invalid
- ONNX Runtime error
- Memory corruption

**Solutions:**

```bash
# Solution 1: Check input text
# Verify text is not empty
curl -X POST http://localhost:3000/api/test/embedding \
  -H "Content-Type: application/json" \
  -d '{"text": ""}'  # Should fail

# Solution 2: Check ONNX Runtime
docker-compose logs ai-search-service | grep -i "onnx\|runtime\|error"

# Solution 3: Restart service
docker-compose restart ai-search-service

# Solution 4: Verify model output parsing
# In embedding.service.ts, add logging:
console.log('Model output:', result);
console.log('Data length:', result.data.length);
console.log('First values:', Array.from(result.data).slice(0, 5));

# Solution 5: Use fallback embedding for null
// In embedding.service.ts
if (!embedding || embedding.some(v => isNaN(v))) {
  return this.getFallbackEmbedding();
}
```

### Issue 2.3: Embedding Generation Very Slow

**Symptom:**
```
Single embedding takes 5+ seconds
```

**Causes:**
- Model not cached (first run)
- ONNX compilation happening
- System resource constraints
- Batch processing bottleneck

**Solutions:**

```bash
# Solution 1: First embedding is always slower (normal)
# First: ~2-3 seconds (model compile)
# Subsequent: ~50-100ms

# Solution 2: Check if model is already in memory
docker-compose exec ai-search-service ps aux | grep node
# Should show high memory usage if model is loaded

# Solution 3: Pre-warm the service
curl -X POST http://localhost:3000/api/test/embedding \
  -d '{"text": "warm up"}'
# Wait for response, then subsequent calls will be faster

# Solution 4: Monitor system resources
# Linux:
top
# Windows:
tasklist

# Solution 5: Use batch processing instead of individual calls
curl -X POST http://localhost:3000/api/admin/batch-embed \
  -d '{
    "jobIds": [1, 2, 3, 4, 5],
    "concurrency": 2
  }'
```

---

## 3. RabbitMQ / Message Queue Issues

### Issue 3.1: Messages Not Being Processed

**Symptom:**
```
Job created, but embedding queue shows PENDING forever
```

**Causes:**
- RabbitMQ connection failed
- Consumer not listening
- Message format incorrect
- Dead letter queue has errors

**Solutions:**

```bash
# Solution 1: Verify RabbitMQ is running
docker-compose ps rabbitmq

# Solution 2: Check RabbitMQ admin panel
# http://localhost:15672 (guest/guest)
# Check: ai_search_queue has consumers connected

# Solution 3: Verify AI Search service is running
docker-compose ps ai-search-service

# Solution 4: Check service logs for connection errors
docker-compose logs ai-search-service | grep -i "rabbitmq\|queue\|connection"

# Solution 5: Manually trigger queue processing
curl -X POST http://localhost:3000/api/admin/process-queue

# Solution 6: Check dead letter queue
# In RabbitMQ admin:
# Navigate to Queues > ai_search_queue_dlq
# If messages there, see what the error is
```

### Issue 3.2: "Could Not Connect to RabbitMQ"

**Error Message:**
```
Error: connect ECONNREFUSED 127.0.0.1:5672
No reply from RabbitMQ service
```

**Causes:**
- RabbitMQ container not running
- RabbitMQ crashed
- Port 5672 in use
- Network connectivity issue

**Solutions:**

```bash
# Solution 1: Start RabbitMQ
docker-compose up -d rabbitmq

# Solution 2: Check if port is available
# Linux/macOS:
lsof -i :5672

# Windows:
netstat -ano | findstr :5672

# Solution 3: Check RabbitMQ logs
docker-compose logs -f rabbitmq

# Solution 4: Reset RabbitMQ
docker-compose down
docker volume rm webthuctap_rabbitmq_data
docker-compose up -d rabbitmq
# Wait 30 seconds for initialization

# Solution 5: Update connection string in .env
RABBITMQ_URL=amqp://rabbitmq:5672
# Verify hostname 'rabbitmq' is resolvable
ping rabbitmq
```

### Issue 3.3: Message Redelivery Loop

**Symptom:**
```
Same message processed 3 times, then fails
Retry count keeps increasing
```

**Causes:**
- Handler throws error on completion
- Embedding generation fails partially
- Database transaction issue
- Service crash mid-processing

**Solutions:**

```bash
# Solution 1: Check error logs
docker-compose logs ai-search-service | grep -i "error\|failed\|exception"

# Solution 2: Verify database connection
docker-compose logs -f postgres | grep -i "error\|connection"

# Solution 3: Check if transaction is committed
# In embedding.service.ts, ensure:
await queryRunner.commitTransaction();

# Solution 4: Set max retry count
# In RabbitMQ options:
prefetch: 1,
maxRetriesPerSecond: 5,

# Solution 5: Manual requeue cleanup
docker-compose exec rabbitmq rabbitmqadmin purge queue name=ai_search_queue

# Solution 6: Check message format
docker-compose logs ai-search-service | grep "parsing\|format\|json"
```

---

## 4. Database Issues

### Issue 4.1: "pgvector Extension Not Found"

**Error Message:**
```
ERROR: type "vector" does not exist
```

**Causes:**
- pgvector not installed in PostgreSQL
- Wrong PostgreSQL version
- Extension not created

**Solutions:**

```bash
# Solution 1: Create extension
docker exec -it postgres psql -U postgres -d nckh_db -c "CREATE EXTENSION IF NOT EXISTS vector"

# Solution 2: Verify extension is installed
docker exec -it postgres psql -U postgres -d nckh_db -c "SELECT * FROM pg_extension WHERE extname='vector'"

# Solution 3: Check PostgreSQL version
docker exec -it postgres psql -U postgres -c "SELECT version()"
# Must be PostgreSQL 11+

# Solution 4: Rebuild image if missing pgvector
# In Dockerfile:
RUN apt-get install -y postgresql-contrib-15
RUN psql -U postgres -c "CREATE EXTENSION vector"

docker-compose build --no-cache postgres
docker-compose up -d postgres
```

### Issue 4.2: Embedding Search Timeout

**Error Message:**
```
Query execution timed out after 30s
pgvector search took >30 seconds
```

**Causes:**
- Large dataset without index
- Poor query plan
- Disk I/O bottleneck
- Too many concurrent queries

**Solutions:**

```bash
# Solution 1: Add pgvector index
docker exec -it postgres psql -U postgres -d nckh_db << EOF
CREATE INDEX idx_job_embedding ON jobs USING ivfflat (embedding vector_cosine_ops);
VACUUM ANALYZE jobs;
EOF

# Solution 2: Check index exists
docker exec -it postgres psql -U postgres -d nckh_db -c "\\d jobs"

# Solution 3: Analyze query plan
docker exec -it postgres psql -U postgres -d nckh_db << EOF
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM jobs 
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector 
LIMIT 10;
EOF

# Solution 4: Increase work_mem for complex queries
docker exec -it postgres psql -U postgres -d nckh_db -c "ALTER SYSTEM SET work_mem='256MB'"
docker-compose restart postgres

# Solution 5: Use approximate search
SELECT id FROM jobs 
ORDER BY embedding <-> query_embedding
LIMIT 50  -- Get more candidates for approximate search
USING ivfflat;
```

### Issue 4.3: Embedding Disk Space Full

**Error Message:**
```
ERROR: could not write block ... out of disk space
No space left on device
```

**Causes:**
- Large embeddings table
- Many job records
- Logs filling disk
- Docker volume full

**Solutions:**

```bash
# Solution 1: Check disk usage
docker exec -it postgres df -h

# Solution 2: Clean old records
docker exec -it postgres psql -U postgres -d nckh_db << EOF
DELETE FROM job_embedding_queue WHERE status = 'COMPLETED' AND created_at < NOW() - INTERVAL '7 days';
VACUUM FULL jobs;
EOF

# Solution 3: Enable compression on embeddings
docker exec -it postgres psql -U postgres -d nckh_db << EOF
ALTER TABLE jobs ALTER COLUMN embedding SET STORAGE EXTENDED;
CLUSTER jobs USING idx_job_embedding;
EOF

# Solution 4: Clear Docker volume
docker-compose down -v
# Re-initialize database

# Solution 5: Expand disk (production only)
# Provision new disk, mount at /var/lib/postgresql/data
```

---

## 5. Docker Issues

### Issue 5.1: Container Exits Immediately

**Symptom:**
```
docker-compose up -d ai-search-service
# Container exits after 2 seconds
```

**Causes:**
- Dependency service not running
- PORT already in use
- Invalid .env variables
- Module import error

**Solutions:**

```bash
# Solution 1: Check exit logs
docker-compose logs ai-search-service

# Solution 2: Run with attach to see errors
docker-compose up ai-search-service
# (without -d flag)

# Solution 3: Check if RabbitMQ is running
docker-compose up -d rabbitmq
docker-compose up -d postgres
# Wait 10 seconds
docker-compose up -d ai-search-service

# Solution 4: Check port availability
docker-compose exec ai-search-service netstat -tlnp

# Solution 5: Verify .env file
docker-compose config | grep -A 20 ai-search-service

# Solution 6: Rebuild image
docker-compose build --no-cache ai-search-service
docker-compose up -d ai-search-service
```

### Issue 5.2: Model Cache Not Persisting Between Restarts

**Symptom:**
```
First start: model downloads (3 minutes)
After restart: model re-downloads again (3 minutes)
```

**Causes:**
- Volume not properly mounted
- Wrong volume path
- Volume permission issue
- HF_HOME not set correctly

**Solutions:**

```bash
# Solution 1: Verify volume mount
docker inspect ai-search-service | grep -A 10 "Mounts"
# Should show: /cache/huggingface -> docker volume

# Solution 2: Check volume contents
docker volume inspect huggingface-model-cache
# Should have Mountpoint with model files

# Solution 3: Verify HF_HOME in Dockerfile
docker exec -it ai-search-service sh -c "echo $HF_HOME"
# Should output: /cache/huggingface

# Solution 4: Check volume permissions
docker exec -it ai-search-service ls -la /cache/huggingface/

# Solution 5: Recreate volume
docker-compose down
docker volume rm webthuctap_huggingface-model-cache
docker-compose up -d ai-search-service
# Initial model download, then persists

# Solution 6: Backup model locally
docker run --rm \
  -v webthuctap_huggingface-model-cache:/cache \
  -v $(pwd):/backup \
  alpine tar czf /backup/huggingface-cache.tar.gz -C /cache .
```

---

## 6. Performance Issues

### Issue 6.1: Search Latency > 500ms

**Symptom:**
```
POST /api/jobs/search-advanced takes 800ms
Expected <500ms
```

**Causes:**
- Model inference slow
- Database query slow
- High system load
- Network latency

**Solutions:**

```bash
# Solution 1: Profile the request
# Add timing logs in search.service.ts:
const t1 = Date.now();
const embedding = await this.embeddingService.generateEmbedding(query);
console.log('Embedding time:', Date.now() - t1);

const t2 = Date.now();
const results = await this.queryDatabase();
console.log('Database time:', Date.now() - t2);

# Solution 2: Cache popular queries
@Cacheable('search_cache_60s')
async search(query: string) {
  // Search implementation
}

# Solution 3: Add database index
docker exec -it postgres psql -U postgres -d nckh_db << EOF
CREATE INDEX idx_job_location ON jobs(location);
CREATE INDEX idx_job_industry ON jobs(industry);
ANALYZE jobs;
EOF

# Solution 4: Monitor system load
docker stats

# Solution 5: Use approximate search
// Faster but less accurate:
SELECT id FROM jobs 
ORDER BY embedding <-> query_embedding
LIMIT 100  // Return more candidates
USING ivfflat
```

### Issue 6.2: Memory Leak / Growing Memory Usage

**Symptom:**
```
Memory usage: 500MB -> 700MB -> 900MB -> Crashes
```

**Causes:**
- Unbounded cache
- Event listener not cleaned up
- Embedding array copies
- Database connection pool leak

**Solutions:**

```bash
# Solution 1: Monitor memory
docker stats ai-search-service

# Solution 2: Check for memory leaks in code
// Problem:
const allEmbeddings = await this.getAllEmbeddings();

// Solution - use streaming:
async *getAllEmbeddingsStream() {
  const stream = this.jobRepo.find();
  for await (const job of stream) {
    yield job;
  }
}

# Solution 3: Clear embedding cache periodically
setInterval(() => {
  this.embeddingCache.clear();
}, 3600000);  // 1 hour

# Solution 4: Limit connection pool
typeorm:
  pool:
    max: 10
    min: 2

# Solution 5: Restart service periodically
# In docker-compose.yml:
restart_policy:
  condition: on-failure
  delay: 5s
  max_attempts: 5
```

---

## 7. Testing Issues

### Issue 7.1: curl Command Not Recognized

**Error Message:**
```
curl: command not found
'curl' is not recognized as an internal or external command
```

**Solutions:**

```bash
# Windows: Use PowerShell equivalent
Invoke-WebRequest -Uri "http://localhost:3000/api/jobs" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"title":"Test"}'

# Or install curl for Windows:
# Download: https://curl.se/download.html

# Or use inside Docker:
docker-compose exec api-gateway curl http://localhost:3000/health
```

### Issue 7.2: 403 Forbidden on API Requests

**Error Message:**
```
HTTP 403 Forbidden
Unauthorized
```

**Solutions:**

```bash
# Solution 1: Check authentication header
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Solution 2: Check API Gateway auth middleware
docker-compose logs api-gateway | grep -i "auth\|forbidden"

# Solution 3: Generate auth token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Solution 4: Use admin token for testing
export TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"admin@example.com","password":"admin"}' \
  | jq -r '.access_token')

curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## 8. Quick Diagnostic Commands

```bash
# Check all services
docker-compose ps

# View all logs
docker-compose logs

# Check service connectivity
docker-compose exec ai-search-service ping rabbitmq
docker-compose exec ai-search-service nc -zv postgres 5432

# Check models
ls -lah ~/.cache/huggingface/hub/

# Database status
docker exec -it postgres psql -U postgres -d nckh_db -c "SELECT COUNT(*) FROM jobs; SELECT COUNT(*) FROM jobs WHERE embedding IS NOT NULL;"

# RabbitMQ status
docker exec -it rabbitmq rabbitmqctl status

# Memory usage
docker stats

# Network issues
docker-compose exec ai-search-service curl -v http://rabbitmq:5672
```

---

## 9. Escalation Path

If issues persist:

1. **Collect diagnostics:**
   ```bash
   docker-compose logs > logs.txt
   docker ps -a >> logs.txt
   df -h >> logs.txt
   free -h >> logs.txt
   ```

2. **Reset and retry:**
   ```bash
   docker-compose down -v
   docker system prune -a
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Check documentation:**
   - QUICK_START.md
   - TESTING_GUIDE.md
   - IMPLEMENTATION_GUIDE.md

4. **Enable debug logging:**
   ```env
   LOG_LEVEL=debug
   DEBUG=ai-search:*
   ```

5. **Reach out with context:**
   - logs.txt
   - .env (sanitized)
   - docker-compose.yml version
   - Node/Docker version info

---

**Happy debugging! 🔧**
